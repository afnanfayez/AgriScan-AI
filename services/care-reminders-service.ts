import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { CareReminder } from '@/types/domain';
import { ServiceError } from './errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const mapReminder = (r: any): CareReminder => ({
  id: r.id,
  plantId: r.plant_id,
  userId: r.user_id,
  reminderType: r.reminder_type,
  dueDate: r.due_date,
  recurringDays: r.recurring_days ?? undefined,
  notes: r.notes ?? undefined,
  completed: r.completed,
  completedAt: r.completed_at ?? undefined,
  createdAt: r.created_at,
});

export async function listCareReminders(
  supabase: SupabaseClient,
  filters: { plantId?: string | null; upcomingOnly?: boolean }
): Promise<CareReminder[]> {
  let query = supabase.from('care_reminders').select('*');

  if (filters.plantId) {
    query = query.eq('plant_id', filters.plantId);
  }
  if (filters.upcomingOnly) {
    query = query.eq('completed', false);
  }

  const { data, error } = await query.order('due_date', { ascending: true });

  if (error) {
    console.error('Error fetching care reminders:', error);
    throw new ServiceError(error.message, 500);
  }

  return (data || []).map(mapReminder);
}

export interface CreateCareReminderInput {
  plantId: string;
  reminderType: CareReminder['reminderType'];
  dueDate: string;
  recurringDays?: number;
  notes?: string;
}

export async function createCareReminder(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: CreateCareReminderInput
): Promise<CareReminder> {
  const { data: newReminder, error } = await supabase
    .from('care_reminders')
    .insert({
      plant_id: input.plantId,
      user_id: user.id,
      reminder_type: input.reminderType,
      due_date: input.dueDate,
      recurring_days: input.recurringDays,
      notes: input.notes,
    })
    .select()
    .single();

  if (error || !newReminder) {
    console.error('Error creating care reminder:', error);
    throw new ServiceError(error?.message || 'Failed to create care reminder', 400);
  }

  return mapReminder(newReminder);
}

export interface UpdateCareReminderInput {
  id: string;
  completed?: boolean;
  dueDate?: string;
  notes?: string;
}

export async function updateCareReminder(
  supabase: SupabaseClient,
  input: UpdateCareReminderInput
): Promise<CareReminder> {
  const { id, completed, dueDate, notes } = input;

  const updateData: any = {};
  if (completed !== undefined) {
    updateData.completed = completed;
    updateData.completed_at = completed ? new Date().toISOString() : null;
  }
  if (dueDate) updateData.due_date = dueDate;
  if (notes !== undefined) updateData.notes = notes;

  const { data: updated, error } = await supabase
    .from('care_reminders')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error || !updated) {
    console.error('Error updating care reminder:', error);
    throw new ServiceError(error?.message || 'Failed to update care reminder', 400);
  }

  let result = mapReminder(updated);

  // If a recurring reminder was just completed, schedule the next occurrence.
  if (completed && result.completed && result.recurringDays) {
    const nextDue = new Date(result.dueDate);
    nextDue.setDate(nextDue.getDate() + result.recurringDays);
    const { data: nextReminder, error: nextError } = await supabase
      .from('care_reminders')
      .insert({
        plant_id: result.plantId,
        user_id: result.userId,
        reminder_type: result.reminderType,
        due_date: nextDue.toISOString().split('T')[0],
        recurring_days: result.recurringDays,
        notes: result.notes,
      })
      .select()
      .single();
    if (nextError) console.error('Error scheduling next recurring reminder:', nextError);
    else if (nextReminder) result = mapReminder(updated);
  }

  return result;
}

export async function deleteCareReminder(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from('care_reminders')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting care reminder:', error);
    throw new ServiceError(error.message, 400);
  }
}
