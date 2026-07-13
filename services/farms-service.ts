import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { FarmField } from '@/types/domain';
import { formatCropTypes, parseCropTypes } from '@/lib/crop-types';
import { ServiceError } from './errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const mapFarm = (f: any): FarmField => ({
  id: f.id,
  name: f.name,
  userId: f.user_id,
  zoneCount: f.zone_count,
  location: f.location ?? undefined,
  acreage: optionalNumber(f.acreage),
  cropType: formatCropTypes(f.crop_type),
  cropTypes: parseCropTypes(f.crop_type),
  latitude: optionalNumber(f.latitude),
  longitude: optionalNumber(f.longitude),
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
  input: { name: string; zoneCount?: number; location?: string; acreage?: number; cropType?: string; cropTypes?: string[]; latitude?: number; longitude?: number }
): Promise<FarmField> {
  const cropType = formatCropTypes(input.cropTypes && input.cropTypes.length > 0 ? input.cropTypes : input.cropType);

  const { data: newFarm, error: farmError } = await supabase
    .from('farms')
    .insert({
      name: input.name,
      user_id: user.id,
      zone_count: input.zoneCount || 1,
      location: input.location,
      acreage: input.acreage,
      crop_type: cropType,
      latitude: input.latitude,
      longitude: input.longitude,
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

export async function updateFarm(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  farmId: string,
  input: {
    name?: string;
    zoneCount?: number;
    location?: string;
    acreage?: number | null;
    cropType?: string;
    cropTypes?: string[];
    latitude?: number | null;
    longitude?: number | null;
  }
): Promise<FarmField> {
  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.zoneCount !== undefined) updateData.zone_count = input.zoneCount;
  if (input.location !== undefined) updateData.location = input.location || null;
  if (input.acreage !== undefined) updateData.acreage = input.acreage;
  if (input.latitude !== undefined) updateData.latitude = input.latitude;
  if (input.longitude !== undefined) updateData.longitude = input.longitude;
  if (input.cropType !== undefined || input.cropTypes !== undefined) {
    updateData.crop_type = formatCropTypes(input.cropTypes && input.cropTypes.length > 0 ? input.cropTypes : input.cropType) || null;
  }

  const { data: updatedFarm, error } = await supabase
    .from('farms')
    .update(updateData)
    .eq('id', farmId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !updatedFarm) {
    console.error('Error updating farm:', error);
    throw new ServiceError(error?.message || 'Failed to update farm', 400);
  }

  return mapFarm(updatedFarm);
}
