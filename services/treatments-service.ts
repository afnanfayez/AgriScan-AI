import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { TreatmentPlan } from '@/types/domain';
import { ServiceError } from './errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export const mapTreatment = (t: any): TreatmentPlan => ({
  id: t.id,
  scanId: t.scan_id,
  plantId: t.plant_id,
  userId: t.user_id,
  type: t.type,
  organicSteps: t.organic_steps,
  chemicalSteps: t.chemical_steps,
  status: t.status,
  createdAt: t.created_at,
  resolvedAt: t.resolved_at,
});

export async function listTreatments(supabase: SupabaseClient, plantId?: string | null): Promise<TreatmentPlan[]> {
  let query = supabase.from('treatments').select('*');

  if (plantId) {
    query = query.eq('plant_id', plantId);
  }

  const { data: treatmentsData, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching treatments:', error);
    throw new ServiceError(error.message, 500);
  }

  return (treatmentsData || []).map(mapTreatment);
}

export async function updateTreatmentStatus(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: { id: string; status: string }
): Promise<TreatmentPlan> {
  const { id, status } = input;

  const updateFields: any = { status };
  if (status === 'Completed') {
    updateFields.resolved_at = new Date().toISOString();
  }

  const { data: treatment, error: updateError } = await supabase
    .from('treatments')
    .update(updateFields)
    .eq('id', id)
    .select()
    .single();

  if (updateError || !treatment) {
    console.error('Error updating treatment plan:', updateError);
    throw new ServiceError(updateError?.message || 'Failed to update treatment', 400);
  }

  if (status === 'Completed') {
    // Automatically log to plant notes
    const { error: noteErr1 } = await supabase
      .from('notes')
      .insert({
        plant_id: treatment.plant_id,
        user_id: user.id,
        content: `Treatment Plan for "${treatment.type}" was marked as COMPLETED. Spore suppression and pest eradication steps verified by user.`,
      });
    if (noteErr1) console.error('Error logging completion note:', noteErr1);

    // Automatically restore plant status to healthy if all current treatments are completed
    const { data: unresolved, error: unresolvedErr } = await supabase
      .from('treatments')
      .select('id')
      .eq('plant_id', treatment.plant_id)
      .neq('id', id)
      .neq('status', 'Completed');

    if (!unresolvedErr && (!unresolved || unresolved.length === 0)) {
      const { error: plantUpdErr } = await supabase
        .from('plants')
        .update({ health_status: 'Healthy' })
        .eq('id', treatment.plant_id);
      if (plantUpdErr) console.error('Error auto-healing plant health status:', plantUpdErr);
    }

    // Add a notification
    const { error: notifErr } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title: 'Treatment Completed',
        message: `Your treatment plan for "${treatment.type}" was successfully closed out. Plant status recovered to Healthy!`,
        category: 'Treatment',
        read: false,
      });
    if (notifErr) console.error('Error creating completion notification:', notifErr);
  } else {
    const { error: noteErr2 } = await supabase
      .from('notes')
      .insert({
        plant_id: treatment.plant_id,
        user_id: user.id,
        content: `Treatment Plan for "${treatment.type}" status updated to: ${status}.`,
      });
    if (noteErr2) console.error('Error logging status update note:', noteErr2);
  }

  return mapTreatment(treatment);
}
