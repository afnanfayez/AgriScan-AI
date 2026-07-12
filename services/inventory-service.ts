import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { InventoryBatch } from '@/types/domain';
import { ServiceError } from './errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const mapInventoryBatch = (b: any): InventoryBatch => ({
  id: b.id,
  userId: b.user_id,
  farmId: b.farm_id ?? undefined,
  plantType: b.plant_type,
  batchName: b.batch_name ?? undefined,
  quantity: b.quantity,
  unitPrice: b.unit_price ?? undefined,
  propagationDate: b.propagation_date ?? undefined,
  readyDate: b.ready_date ?? undefined,
  status: b.status,
  lowStockThreshold: b.low_stock_threshold,
  grade: b.grade ?? undefined,
  certificateUrl: b.certificate_url ?? undefined,
  createdAt: b.created_at,
});

export interface ListInventoryBatchesFilters {
  farmId?: string | null;
}

export async function listInventoryBatches(
  supabase: SupabaseClient,
  filters: ListInventoryBatchesFilters
): Promise<InventoryBatch[]> {
  let query = supabase.from('inventory_batches').select('*');

  if (filters.farmId) {
    query = query.eq('farm_id', filters.farmId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching inventory batches:', error);
    throw new ServiceError(error.message, 500);
  }

  return (data || []).map(mapInventoryBatch);
}

export interface CreateInventoryBatchInput {
  farmId?: string;
  plantType: string;
  batchName?: string;
  quantity?: number;
  unitPrice?: number;
  propagationDate?: string;
  readyDate?: string;
  status?: InventoryBatch['status'];
  lowStockThreshold?: number;
  grade?: InventoryBatch['grade'];
}

export async function createInventoryBatch(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: CreateInventoryBatchInput
): Promise<InventoryBatch> {
  const { farmId, plantType, batchName, quantity, unitPrice, propagationDate, readyDate, status, lowStockThreshold, grade } = input;

  if (!plantType) {
    throw new ServiceError('Plant type is required.', 400);
  }

  const { data: newBatch, error } = await supabase
    .from('inventory_batches')
    .insert({
      user_id: user.id,
      farm_id: farmId || null,
      plant_type: plantType,
      batch_name: batchName,
      quantity: quantity ?? 0,
      unit_price: unitPrice,
      propagation_date: propagationDate || null,
      ready_date: readyDate || null,
      status: status || 'Propagating',
      low_stock_threshold: lowStockThreshold ?? 5,
      grade: grade || null,
    })
    .select()
    .single();

  if (error || !newBatch) {
    console.error('Error creating inventory batch:', error);
    throw new ServiceError(error?.message || 'Failed to create inventory batch', 400);
  }

  return mapInventoryBatch(newBatch);
}

export interface UpdateInventoryBatchInput {
  id: string;
  farmId?: string;
  plantType?: string;
  batchName?: string;
  quantity?: number;
  unitPrice?: number;
  propagationDate?: string;
  readyDate?: string;
  status?: InventoryBatch['status'];
  lowStockThreshold?: number;
  grade?: InventoryBatch['grade'];
  certificateUrl?: string;
}

export async function updateInventoryBatch(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: UpdateInventoryBatchInput
): Promise<InventoryBatch> {
  const { id, farmId, plantType, batchName, quantity, unitPrice, propagationDate, readyDate, status, lowStockThreshold, grade, certificateUrl } = input;

  const updateData: any = {};
  if (farmId !== undefined) updateData.farm_id = farmId;
  if (plantType !== undefined) updateData.plant_type = plantType;
  if (batchName !== undefined) updateData.batch_name = batchName;
  if (quantity !== undefined) updateData.quantity = quantity;
  if (unitPrice !== undefined) updateData.unit_price = unitPrice;
  if (propagationDate !== undefined) updateData.propagation_date = propagationDate;
  if (readyDate !== undefined) updateData.ready_date = readyDate;
  if (status !== undefined) updateData.status = status;
  if (lowStockThreshold !== undefined) updateData.low_stock_threshold = lowStockThreshold;
  if (grade !== undefined) updateData.grade = grade;
  if (certificateUrl !== undefined) updateData.certificate_url = certificateUrl;

  const { data: updatedBatch, error } = await supabase
    .from('inventory_batches')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error || !updatedBatch) {
    console.error('Error updating inventory batch:', error);
    throw new ServiceError(error?.message || 'Failed to update inventory batch', 400);
  }

  return mapInventoryBatch(updatedBatch);
}

export async function deleteInventoryBatch(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from('inventory_batches')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting inventory batch:', error);
    throw new ServiceError(error.message, 400);
  }
}
