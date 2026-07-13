import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { FieldScan, ScanResultItem } from '@/types/domain';
import { hasCropType, parseCropTypes } from '@/lib/crop-types';
import { ServiceError } from './errors';
import { runGeminiBatchAnalysis } from './gemini-batch-analysis';
import { assertWithinQuota, recordUsage } from './plan-service';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const mapFieldScan = (s: any): FieldScan => ({
  id: s.id,
  userId: s.user_id,
  farmId: s.farm_id,
  totalSamples: s.total_samples,
  healthyCount: s.healthy_count,
  infectionPercentage: s.infection_percentage,
  results: s.results || [],
  createdAt: s.created_at,
});

function scanResultToHealthStatus(result: ScanResultItem): 'Healthy' | 'Warning' | 'Critical' | null {
  if (result.diagnosis === 'Healthy' || result.likelyCause === 'Healthy') return null;
  if (result.diagnosis === 'Unable to assess image') return null;
  if (result.severity === 'High' || result.treatmentPriority === 'Urgent') return 'Critical';
  return 'Warning';
}

async function createFieldHealthAlerts(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  farm: any,
  results: ScanResultItem[],
  cropType?: string
) {
  const alertRows = results
    .map((result, index) => {
      const healthStatus = scanResultToHealthStatus(result);
      if (!healthStatus) return null;

      const alertCropType = cropType || parseCropTypes(farm.crop_type)[0] || result.likelyCause || 'Field crop';
      return {
        name: `Scan Alert ${index + 1} - ${result.diagnosis}`,
        type: alertCropType,
        planting_date: new Date().toISOString().slice(0, 10),
        health_status: healthStatus,
        photo_url: result.imageUrl,
        farm_id: farm.id,
        user_id: user.id,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (alertRows.length === 0) return;

  const { data: insertedPlants, error: plantError } = await supabase
    .from('plants')
    .insert(alertRows)
    .select('id, name, health_status');

  if (plantError) {
    console.error('Error creating field health alerts:', plantError);
    throw new ServiceError(plantError.message || 'Failed to update field health status from scan results.', 400);
  }

  const noteRows = (insertedPlants || []).map((plant: any) => ({
    plant_id: plant.id,
    user_id: user.id,
    content: `Created from field scan. Health status: ${plant.health_status}. Review the scan results for diagnosis and treatment guidance.`,
  }));

  if (noteRows.length > 0) {
    const { error: noteError } = await supabase.from('notes').insert(noteRows);
    if (noteError) console.error('Error creating field scan alert notes:', noteError);
  }
}

export async function listFieldScans(supabase: SupabaseClient, farmId?: string | null): Promise<FieldScan[]> {
  let query = supabase.from('field_scans').select('*');

  if (farmId) {
    query = query.eq('farm_id', farmId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching field scans:', error);
    throw new ServiceError(error.message, 500);
  }

  return (data || []).map(mapFieldScan);
}

export interface CreateFieldScanInput {
  farmId: string;
  cropType?: string;
  images: string[];
}

export interface CreateFieldScanResult {
  fieldScan: FieldScan;
}

export async function createFieldScan(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: CreateFieldScanInput
): Promise<CreateFieldScanResult> {
  const { farmId, cropType, images } = input;

  if (!images || images.length === 0) {
    throw new ServiceError('At least one image is required.', 400);
  }

  // Verify the farm exists and belongs to this user
  const { data: farm, error: farmError } = await supabase
    .from('farms')
    .select('*')
    .eq('id', farmId)
    .eq('user_id', user.id)
    .single();

  if (farmError || !farm) {
    throw new ServiceError('Farm not found or unauthorized', 404);
  }

  const selectedCropType = cropType?.trim();
  const farmCropTypes = parseCropTypes(farm.crop_type);
  if (selectedCropType && farmCropTypes.length > 0 && !hasCropType(farmCropTypes, selectedCropType)) {
    throw new ServiceError('Selected crop type is not registered for this field.', 400);
  }

  await assertWithinQuota(supabase, user, images.length);

  const { totalSamples, healthyCount, infectionPercentage, results } = await runGeminiBatchAnalysis(
    images,
    { plantName: farm.name, plantType: selectedCropType || farm.crop_type },
    `field-scans/${user.id}`,
    user.plan
  );
  const scanResults = results.map((result) => ({
    ...result,
    cropType: selectedCropType || parseCropTypes(farm.crop_type)[0],
  }));

  const { data: newFieldScan, error: insertError } = await supabase
    .from('field_scans')
    .insert({
      user_id: user.id,
      farm_id: farmId,
      total_samples: totalSamples,
      healthy_count: healthyCount,
      infection_percentage: infectionPercentage,
      results: scanResults,
    })
    .select()
    .single();

  if (insertError || !newFieldScan) {
    console.error('Error inserting field scan:', insertError);
    throw new ServiceError(insertError?.message || 'Failed to save field scan', 400);
  }

  await recordUsage(supabase, user, 'field_scan', totalSamples);

  await createFieldHealthAlerts(supabase, user, farm, scanResults, selectedCropType);

  // Raise an alert notification for high-infection field scans
  if (infectionPercentage >= 25) {
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title: `Field Alert: ${farm.name}`,
        message: `Field scan detected ${infectionPercentage}% infection across ${totalSamples} samples in "${farm.name}". Review the results and consider treatment.`,
        category: 'Alert',
        read: false,
      });

    if (notifError) console.error('Error creating field scan notification:', notifError);
  }

  return { fieldScan: mapFieldScan(newFieldScan) };
}
