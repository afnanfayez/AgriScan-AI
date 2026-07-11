import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { IrrigationLog } from '@/types/domain';
import { ServiceError } from './errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const mapIrrigationLog = (r: any): IrrigationLog => ({
  id: r.id,
  userId: r.user_id,
  farmId: r.farm_id ?? undefined,
  logType: r.log_type,
  amount: r.amount ?? undefined,
  unit: r.unit ?? undefined,
  notes: r.notes ?? undefined,
  loggedOn: r.logged_on,
  createdAt: r.created_at,
});

export interface ListIrrigationLogsFilters {
  farmId?: string | null;
}

export async function listIrrigationLogs(
  supabase: SupabaseClient,
  filters: ListIrrigationLogsFilters
): Promise<IrrigationLog[]> {
  let query = supabase.from('irrigation_logs').select('*');

  if (filters.farmId) {
    query = query.eq('farm_id', filters.farmId);
  }

  const { data, error } = await query.order('logged_on', { ascending: false });

  if (error) {
    console.error('Error fetching irrigation logs:', error);
    throw new ServiceError(error.message, 500);
  }

  return (data || []).map(mapIrrigationLog);
}

export interface CreateIrrigationLogInput {
  farmId?: string;
  logType: string;
  amount?: number;
  unit?: string;
  notes?: string;
  loggedOn: string;
}

export async function createIrrigationLog(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: CreateIrrigationLogInput
): Promise<IrrigationLog> {
  const { farmId, logType, amount, unit, notes, loggedOn } = input;

  if (!logType || !loggedOn) {
    throw new ServiceError('Log type and logged date are required.', 400);
  }

  const { data: newLog, error } = await supabase
    .from('irrigation_logs')
    .insert({
      user_id: user.id,
      farm_id: farmId || null,
      log_type: logType,
      amount,
      unit,
      notes,
      logged_on: loggedOn,
    })
    .select()
    .single();

  if (error || !newLog) {
    console.error('Error creating irrigation log:', error);
    throw new ServiceError(error?.message || 'Failed to create irrigation log', 400);
  }

  return mapIrrigationLog(newLog);
}

export interface UpdateIrrigationLogInput {
  id: string;
  farmId?: string;
  logType?: string;
  amount?: number;
  unit?: string;
  notes?: string;
  loggedOn?: string;
}

export async function updateIrrigationLog(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: UpdateIrrigationLogInput
): Promise<IrrigationLog> {
  const { id, farmId, logType, amount, unit, notes, loggedOn } = input;

  const updateData: any = {};
  if (farmId !== undefined) updateData.farm_id = farmId;
  if (logType !== undefined) updateData.log_type = logType;
  if (amount !== undefined) updateData.amount = amount;
  if (unit !== undefined) updateData.unit = unit;
  if (notes !== undefined) updateData.notes = notes;
  if (loggedOn !== undefined) updateData.logged_on = loggedOn;

  const { data: updatedLog, error } = await supabase
    .from('irrigation_logs')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error || !updatedLog) {
    console.error('Error updating irrigation log:', error);
    throw new ServiceError(error?.message || 'Failed to update irrigation log', 400);
  }

  return mapIrrigationLog(updatedLog);
}

export async function deleteIrrigationLog(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from('irrigation_logs')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting irrigation log:', error);
    throw new ServiceError(error.message, 400);
  }
}
