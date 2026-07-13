import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { BatchScan } from '@/types/domain';
import { ServiceError } from './errors';
import { runGeminiBatchAnalysis } from './gemini-batch-analysis';
import { assertWithinQuota, recordUsage } from './plan-service';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const mapBatchScan = (s: any): BatchScan => ({
  id: s.id,
  userId: s.user_id,
  batchId: s.batch_id,
  totalSamples: s.total_samples,
  healthyCount: s.healthy_count,
  infectionPercentage: s.infection_percentage,
  results: s.results || [],
  createdAt: s.created_at,
});

export async function listBatchScans(supabase: SupabaseClient, batchId?: string | null): Promise<BatchScan[]> {
  let query = supabase.from('batch_scans').select('*');

  if (batchId) {
    query = query.eq('batch_id', batchId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching batch scans:', error);
    throw new ServiceError(error.message, 500);
  }

  return (data || []).map(mapBatchScan);
}

export interface CreateBatchScanInput {
  batchId: string;
  images: string[];
}

export interface CreateBatchScanResult {
  batchScan: BatchScan;
}

export async function createBatchScan(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: CreateBatchScanInput
): Promise<CreateBatchScanResult> {
  const { batchId, images } = input;

  if (!images || images.length === 0) {
    throw new ServiceError('At least one image is required.', 400);
  }

  // Verify the inventory batch exists and belongs to this user
  const { data: batch, error: batchError } = await supabase
    .from('inventory_batches')
    .select('*')
    .eq('id', batchId)
    .eq('user_id', user.id)
    .single();

  if (batchError || !batch) {
    throw new ServiceError('Batch not found or unauthorized', 404);
  }

  await assertWithinQuota(supabase, user, images.length);

  const { totalSamples, healthyCount, infectionPercentage, results } = await runGeminiBatchAnalysis(
    images,
    { plantType: batch.plant_type },
    `batch-scans/${user.id}`,
    user.plan
  );

  const { data: newBatchScan, error: insertError } = await supabase
    .from('batch_scans')
    .insert({
      user_id: user.id,
      batch_id: batchId,
      total_samples: totalSamples,
      healthy_count: healthyCount,
      infection_percentage: infectionPercentage,
      results,
    })
    .select()
    .single();

  if (insertError || !newBatchScan) {
    console.error('Error inserting batch scan:', insertError);
    throw new ServiceError(insertError?.message || 'Failed to save batch scan', 400);
  }

  await recordUsage(supabase, user, 'batch_scan', totalSamples);

  // Apply the screening result to the whole batch's sellability status
  if (infectionPercentage > 25) {
    const { error: updateError } = await supabase
      .from('inventory_batches')
      .update({ status: 'Needs Treatment' })
      .eq('id', batchId);

    if (updateError) console.error('Error updating batch status after scan:', updateError);
  }

  return { batchScan: mapBatchScan(newBatchScan) };
}
