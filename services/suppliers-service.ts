import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { Supplier } from '@/types/domain';
import { ServiceError } from './errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const mapSupplier = (s: any): Supplier => ({
  id: s.id,
  userId: s.user_id,
  name: s.name,
  contactInfo: s.contact_info ?? undefined,
  notes: s.notes ?? undefined,
  createdAt: s.created_at,
});

export async function listSuppliers(supabase: SupabaseClient): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching suppliers:', error);
    throw new ServiceError(error.message, 500);
  }

  return (data || []).map(mapSupplier);
}

export interface CreateSupplierInput {
  name: string;
  contactInfo?: string;
  notes?: string;
}

export async function createSupplier(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: CreateSupplierInput
): Promise<Supplier> {
  const { name, contactInfo, notes } = input;

  if (!name) {
    throw new ServiceError('Supplier name is required.', 400);
  }

  const { data: newSupplier, error } = await supabase
    .from('suppliers')
    .insert({
      user_id: user.id,
      name,
      contact_info: contactInfo,
      notes,
    })
    .select()
    .single();

  if (error || !newSupplier) {
    console.error('Error creating supplier:', error);
    throw new ServiceError(error?.message || 'Failed to create supplier', 400);
  }

  return mapSupplier(newSupplier);
}

export interface UpdateSupplierInput {
  id: string;
  name?: string;
  contactInfo?: string;
  notes?: string;
}

export async function updateSupplier(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: UpdateSupplierInput
): Promise<Supplier> {
  const { id, name, contactInfo, notes } = input;

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (contactInfo !== undefined) updateData.contact_info = contactInfo;
  if (notes !== undefined) updateData.notes = notes;

  const { data: updatedSupplier, error } = await supabase
    .from('suppliers')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error || !updatedSupplier) {
    console.error('Error updating supplier:', error);
    throw new ServiceError(error?.message || 'Failed to update supplier', 400);
  }

  return mapSupplier(updatedSupplier);
}

export async function deleteSupplier(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting supplier:', error);
    throw new ServiceError(error.message, 400);
  }
}
