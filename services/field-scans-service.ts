import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { FieldScan } from '@/types/domain';
import { ServiceError } from './errors';
import { runGeminiBatchAnalysis } from './gemini-batch-analysis';

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
  const { farmId, images } = input;

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

  const { totalSamples, healthyCount, infectionPercentage, results } = await runGeminiBatchAnalysis(
    images,
    { plantType: farm.crop_type },
    `field-scans/${user.id}`
  );

  const { data: newFieldScan, error: insertError } = await supabase
    .from('field_scans')
    .insert({
      user_id: user.id,
      farm_id: farmId,
      total_samples: totalSamples,
      healthy_count: healthyCount,
      infection_percentage: infectionPercentage,
      results,
    })
    .select()
    .single();

  if (insertError || !newFieldScan) {
    console.error('Error inserting field scan:', insertError);
    throw new ServiceError(insertError?.message || 'Failed to save field scan', 400);
  }

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
