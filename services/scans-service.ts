import { createClient } from '@/utils/supabase/server';
import { uploadImageToStorage } from '@/lib/supabase';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { PlantScan, TreatmentPlan } from '@/types/domain';
import { mapTreatment } from './treatments-service';
import { ServiceError } from './errors';
import { runGeminiPlantAnalysis } from './gemini-analysis';
import { assertWithinQuota, recordUsage } from './plan-service';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const mapScan = (s: any): PlantScan => ({
  id: s.id,
  plantId: s.plant_id,
  userId: s.user_id,
  imageUrl: s.image_url,
  diagnosis: s.diagnosis,
  confidence: s.confidence,
  severity: s.severity,
  symptoms: s.symptoms,
  createdAt: s.created_at,
});

export async function listScans(supabase: SupabaseClient, plantId?: string | null): Promise<PlantScan[]> {
  let query = supabase.from('scans').select('*');

  if (plantId) {
    query = query.eq('plant_id', plantId);
  }

  const { data: scansData, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching scans:', error);
    throw new ServiceError(error.message, 500);
  }

  return (scansData || []).map(mapScan);
}

export interface AnalyzeScanResult {
  scan: PlantScan;
  treatment: TreatmentPlan | null;
}

export async function analyzeScan(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: { image: string; plantId: string }
): Promise<AnalyzeScanResult> {
  const { image, plantId } = input;

  // Fetch plant from Supabase
  const { data: plant, error: plantError } = await supabase
    .from('plants')
    .select('*')
    .eq('id', plantId)
    .single();

  if (plantError || !plant) {
    throw new ServiceError('Plant not found or unauthorized', 404);
  }

  await assertWithinQuota(supabase, user);

  const { diagnosis, confidence, severity, symptoms, organicSteps, chemicalSteps } = await runGeminiPlantAnalysis(
    image,
    { plantName: plant.name, plantType: plant.type },
    user.plan
  );

  // Upload plant inspection photo to Supabase Storage
  const mimeType = image.startsWith('data:') ? (image.match(/data:(.*?);/)?.[1] || 'image/jpeg') : 'image/jpeg';
  const storageFileName = `scans/${user.id}/${Date.now()}.jpg`;
  const storageUrl = await uploadImageToStorage(image, storageFileName, 'agriscan');
  const finalImageUrl = storageUrl || (image.startsWith('data:') ? image : `data:${mimeType};base64,${image}`);

  // Save scan to Supabase scans table
  const { data: newScan, error: scanError } = await supabase
    .from('scans')
    .insert({
      plant_id: plantId,
      user_id: user.id,
      image_url: finalImageUrl,
      diagnosis,
      confidence,
      severity,
      symptoms,
    })
    .select()
    .single();

  if (scanError || !newScan) {
    console.error('Error inserting scan:', scanError);
    throw new ServiceError(scanError?.message || 'Failed to save scan record', 400);
  }

  await recordUsage(supabase, user, 'scan');

  // Save treatment plan to Supabase treatments table
  const { data: newTreatment, error: treatmentError } = await supabase
    .from('treatments')
    .insert({
      scan_id: newScan.id,
      plant_id: plantId,
      user_id: user.id,
      type: diagnosis,
      organic_steps: organicSteps,
      chemical_steps: chemicalSteps,
      status: diagnosis === 'Healthy' ? 'Completed' : 'Pending',
    })
    .select()
    .single();

  if (treatmentError || !newTreatment) {
    console.error('Error inserting treatment:', treatmentError);
  }

  // Update plant status based on diagnosis
  let nextStatus: 'Healthy' | 'Warning' | 'Critical' = 'Healthy';
  if (diagnosis !== 'Healthy') {
    nextStatus = severity === 'High' ? 'Critical' : 'Warning';
  }

  const { error: plantUpdateError } = await supabase
    .from('plants')
    .update({ health_status: nextStatus })
    .eq('id', plantId);

  if (plantUpdateError) console.error('Error updating plant status:', plantUpdateError);

  // Add a note in notes table
  const mismatchFlag = /mismatch|wrong plant|different plant|not match|does not match|specimen/i.test(`${diagnosis} ${symptoms}`);
  const organicSummary = organicSteps.length ? organicSteps.map((step, index) => `${index + 1}. ${step}`).join('\n') : 'No organic steps returned.';
  const chemicalSummary = chemicalSteps.length ? chemicalSteps.map((step, index) => `${index + 1}. ${step}`).join('\n') : 'No chemical controls returned.';
  const { error: noteError } = await supabase
    .from('notes')
    .insert({
      plant_id: plantId,
      user_id: user.id,
      photo_url: finalImageUrl,
      content: [
        `AI Scan completed for ${plant.name}.`,
        `Diagnosis: ${diagnosis}`,
        `Confidence: ${confidence}%`,
        `Severity: ${severity}`,
        `Plant status updated to: ${nextStatus}`,
        mismatchFlag ? 'Important: Gemini indicated the image may not match the selected plant record. Review the saved scan image before applying treatment.' : '',
        `Visible evidence: ${symptoms}`,
        `Organic steps:\n${organicSummary}`,
        `Chemical controls:\n${chemicalSummary}`,
      ].filter(Boolean).join('\n\n'),
    });

  if (noteError) console.error('Error creating scan log note:', noteError);

  // Add notification about diagnosis
  let notifTitle = `Scan Clear: ${plant.name}`;
  let notifMessage = `Your "${plant.name}" appears healthy in the submitted plant image.`;

  if (diagnosis !== 'Healthy') {
    notifTitle = `Disease Alert: ${diagnosis}`;
    notifMessage = `AgriScan AI detected ${diagnosis} on your "${plant.name}" with ${confidence}% confidence. Please review the treatment plan immediately.`;
  }

  const { error: notifError } = await supabase
    .from('notifications')
    .insert({
      user_id: user.id,
      title: notifTitle,
      message: notifMessage,
      category: 'Scan',
      read: false,
    });

  if (notifError) console.error('Error creating scan notification:', notifError);

  return {
    scan: mapScan(newScan),
    treatment: newTreatment ? mapTreatment(newTreatment) : null,
  };
}
