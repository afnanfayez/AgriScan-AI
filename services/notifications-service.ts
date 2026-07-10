import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { NotificationItem } from '@/types/domain';
import { ServiceError } from './errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const mapNotification = (n: any): NotificationItem => ({
  id: n.id,
  userId: n.user_id,
  title: n.title,
  message: n.message,
  category: n.category,
  read: n.read,
  createdAt: n.created_at,
});

export async function listNotifications(supabase: SupabaseClient): Promise<NotificationItem[]> {
  const { data: notifs, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notifications:', error);
    throw new ServiceError(error.message, 500);
  }

  return (notifs || []).map(mapNotification);
}

export async function markNotificationsRead(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: { id?: string | null; readAll?: boolean }
): Promise<NotificationItem[]> {
  const { id, readAll } = input;

  if (readAll) {
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id);
    if (updateError) console.error('Error marking all read:', updateError);
  } else if (id) {
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (updateError) console.error('Error marking notification read:', updateError);
  } else {
    throw new ServiceError('Missing parameters', 400);
  }

  // Fetch refreshed list
  const { data: notifs } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  return (notifs || []).map(mapNotification);
}
