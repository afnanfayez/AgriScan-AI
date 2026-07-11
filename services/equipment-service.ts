import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { Equipment } from '@/types/domain';
import { ServiceError } from './errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const mapEquipment = (e: any): Equipment => ({
  id: e.id,
  userId: e.user_id,
  farmId: e.farm_id ?? undefined,
  name: e.name,
  equipmentType: e.equipment_type,
  status: e.status,
  purchaseDate: e.purchase_date ?? undefined,
  notes: e.notes ?? undefined,
  createdAt: e.created_at,
});

export interface ListEquipmentFilters {
  farmId?: string | null;
}

export async function listEquipment(
  supabase: SupabaseClient,
  filters: ListEquipmentFilters
): Promise<Equipment[]> {
  let query = supabase.from('equipment').select('*');

  if (filters.farmId) {
    query = query.eq('farm_id', filters.farmId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching equipment:', error);
    throw new ServiceError(error.message, 500);
  }

  return (data || []).map(mapEquipment);
}

export interface CreateEquipmentInput {
  farmId?: string;
  name: string;
  equipmentType: string;
  status?: Equipment['status'];
  purchaseDate?: string;
  notes?: string;
}

export async function createEquipment(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: CreateEquipmentInput
): Promise<Equipment> {
  const { farmId, name, equipmentType, status, purchaseDate, notes } = input;

  if (!name || !equipmentType) {
    throw new ServiceError('Name and equipment type are required.', 400);
  }

  const { data: newEquipment, error } = await supabase
    .from('equipment')
    .insert({
      user_id: user.id,
      farm_id: farmId || null,
      name,
      equipment_type: equipmentType,
      status: status || 'Operational',
      purchase_date: purchaseDate || null,
      notes,
    })
    .select()
    .single();

  if (error || !newEquipment) {
    console.error('Error creating equipment:', error);
    throw new ServiceError(error?.message || 'Failed to create equipment', 400);
  }

  return mapEquipment(newEquipment);
}

export interface UpdateEquipmentInput {
  id: string;
  farmId?: string;
  name?: string;
  equipmentType?: string;
  status?: Equipment['status'];
  purchaseDate?: string;
  notes?: string;
}

export async function updateEquipment(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: UpdateEquipmentInput
): Promise<Equipment> {
  const { id, farmId, name, equipmentType, status, purchaseDate, notes } = input;

  const updateData: any = {};
  if (farmId !== undefined) updateData.farm_id = farmId;
  if (name !== undefined) updateData.name = name;
  if (equipmentType !== undefined) updateData.equipment_type = equipmentType;
  if (status !== undefined) updateData.status = status;
  if (purchaseDate !== undefined) updateData.purchase_date = purchaseDate;
  if (notes !== undefined) updateData.notes = notes;

  const { data: updatedEquipment, error } = await supabase
    .from('equipment')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error || !updatedEquipment) {
    console.error('Error updating equipment:', error);
    throw new ServiceError(error?.message || 'Failed to update equipment', 400);
  }

  return mapEquipment(updatedEquipment);
}

export async function deleteEquipment(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from('equipment')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting equipment:', error);
    throw new ServiceError(error.message, 400);
  }
}
