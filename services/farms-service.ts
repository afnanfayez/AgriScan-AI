import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { FarmField } from '@/types/domain';
import { ServiceError } from './errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const mapFarm = (f: any): FarmField => ({
  id: f.id,
  name: f.name,
  userId: f.user_id,
  zoneCount: f.zone_count,
  location: f.location ?? undefined,
  acreage: f.acreage ?? undefined,
  cropType: f.crop_type ?? undefined,
  latitude: f.latitude ?? undefined,
  longitude: f.longitude ?? undefined,
  createdAt: f.created_at,
});

export async function listFarms(supabase: SupabaseClient, user: SupabaseUserProfile): Promise<FarmField[]> {
  const { data: farmsData, error } = await supabase
    .from('farms')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching farms from Supabase:', error);
    throw new ServiceError(error.message, 500);
  }

  let userFarms = (farmsData || []).map(mapFarm);

  // Fallback: If no farms exist, create a default one to make sure user experience is rich out of the box!
  if (userFarms.length === 0) {
    const { data: defaultFarm, error: insertError } = await supabase
      .from('farms')
      .insert({
        name: `${user.name}'s Farm/Garden`,
        user_id: user.id,
        zone_count: 3,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating default farm:', insertError);
    } else if (defaultFarm) {
      userFarms.push(mapFarm(defaultFarm));
    }
  }

  return userFarms;
}

export async function createFarm(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: { name: string; zoneCount?: number; location?: string; acreage?: number; cropType?: string }
): Promise<FarmField> {
  const { data: newFarm, error: farmError } = await supabase
    .from('farms')
    .insert({
      name: input.name,
      user_id: user.id,
      zone_count: input.zoneCount || 1,
      location: input.location,
      acreage: input.acreage,
      crop_type: input.cropType,
    })
    .select()
    .single();

  if (farmError || !newFarm) {
    console.error('Error inserting farm:', farmError);
    throw new ServiceError(farmError?.message || 'Failed to create farm', 400);
  }

  // Log system notification
  const { error: notifError } = await supabase
    .from('notifications')
    .insert({
      user_id: user.id,
      title: 'New Zone Created',
      message: `You successfully added the zone "${input.name}" to your management dashboard.`,
      category: 'System',
      read: false,
    });

  if (notifError) console.error('Error creating farm notification:', notifError);

  return mapFarm(newFarm);
}
