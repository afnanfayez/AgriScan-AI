import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { FarmTask } from '@/types/domain';
import { ServiceError } from './errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const mapFarmTask = (t: any): FarmTask => ({
  id: t.id,
  userId: t.user_id,
  farmId: t.farm_id ?? undefined,
  assigneeEmail: t.assignee_email ?? undefined,
  title: t.title,
  description: t.description ?? undefined,
  dueDate: t.due_date ?? undefined,
  status: t.status,
  createdAt: t.created_at,
});

export interface ListFarmTasksFilters {
  farmId?: string | null;
  assigneeEmail?: string | null;
}

export async function listFarmTasks(
  supabase: SupabaseClient,
  filters: ListFarmTasksFilters
): Promise<FarmTask[]> {
  let query = supabase.from('farm_tasks').select('*');

  if (filters.farmId) {
    query = query.eq('farm_id', filters.farmId);
  }
  if (filters.assigneeEmail) {
    query = query.eq('assignee_email', filters.assigneeEmail);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching farm tasks:', error);
    throw new ServiceError(error.message, 500);
  }

  return (data || []).map(mapFarmTask);
}

export interface CreateFarmTaskInput {
  farmId?: string;
  assigneeEmail?: string;
  title: string;
  description?: string;
  dueDate?: string;
  status?: FarmTask['status'];
}

export async function createFarmTask(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: CreateFarmTaskInput
): Promise<FarmTask> {
  const { farmId, assigneeEmail, title, description, dueDate, status } = input;

  if (!title) {
    throw new ServiceError('Title is required.', 400);
  }

  const { data: newTask, error } = await supabase
    .from('farm_tasks')
    .insert({
      user_id: user.id,
      farm_id: farmId || null,
      assignee_email: assigneeEmail || null,
      title,
      description,
      due_date: dueDate || null,
      status: status || 'Pending',
    })
    .select()
    .single();

  if (error || !newTask) {
    console.error('Error creating farm task:', error);
    throw new ServiceError(error?.message || 'Failed to create farm task', 400);
  }

  return mapFarmTask(newTask);
}

export interface UpdateFarmTaskInput {
  id: string;
  farmId?: string;
  assigneeEmail?: string;
  title?: string;
  description?: string;
  dueDate?: string;
  status?: FarmTask['status'];
}

export async function updateFarmTask(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: UpdateFarmTaskInput
): Promise<FarmTask> {
  const { id, farmId, assigneeEmail, title, description, dueDate, status } = input;

  // This is the Kanban drag-to-status-column action, so a status-only update
  // must work cleanly without requiring any other field to be present.
  const updateData: any = {};
  if (farmId !== undefined) updateData.farm_id = farmId;
  if (assigneeEmail !== undefined) updateData.assignee_email = assigneeEmail;
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (dueDate !== undefined) updateData.due_date = dueDate;
  if (status !== undefined) updateData.status = status;

  const { data: updatedTask, error } = await supabase
    .from('farm_tasks')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error || !updatedTask) {
    console.error('Error updating farm task:', error);
    throw new ServiceError(error?.message || 'Failed to update farm task', 400);
  }

  return mapFarmTask(updatedTask);
}

export async function deleteFarmTask(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from('farm_tasks')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting farm task:', error);
    throw new ServiceError(error.message, 400);
  }
}
