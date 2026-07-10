import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { PlantNote } from '@/types/domain';
import { ServiceError } from './errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const mapNote = (n: any): PlantNote => ({
  id: n.id,
  plantId: n.plant_id,
  userId: n.user_id,
  content: n.content,
  createdAt: n.created_at,
});

export async function listNotesForPlant(supabase: SupabaseClient, plantId: string): Promise<PlantNote[]> {
  const { data: notesData, error } = await supabase
    .from('notes')
    .select('*')
    .eq('plant_id', plantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notes:', error);
    throw new ServiceError(error.message, 500);
  }

  return (notesData || []).map(mapNote);
}

export async function createNote(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: { plantId: string; content: string }
): Promise<PlantNote> {
  const { data: newNote, error: insertError } = await supabase
    .from('notes')
    .insert({
      plant_id: input.plantId,
      user_id: user.id,
      content: input.content,
    })
    .select()
    .single();

  if (insertError || !newNote) {
    console.error('Error inserting note:', insertError);
    throw new ServiceError(insertError?.message || 'Failed to insert note', 400);
  }

  return mapNote(newNote);
}

export async function deleteNote(supabase: SupabaseClient, id: string): Promise<void> {
  const { error: deleteError } = await supabase
    .from('notes')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('Error deleting note:', deleteError);
    throw new ServiceError(deleteError.message, 400);
  }
}
