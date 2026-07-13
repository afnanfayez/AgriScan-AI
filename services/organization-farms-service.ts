import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { FarmField } from '@/types/domain';
import { formatCropTypes, parseCropTypes } from '@/lib/crop-types';
import { ServiceError } from './errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const mapFarm = (f: any): FarmField => ({
  id: f.id,
  name: f.name,
  userId: f.user_id,
  zoneCount: f.zone_count,
  location: f.location ?? undefined,
  acreage: f.acreage ?? undefined,
  cropType: formatCropTypes(f.crop_type),
  cropTypes: parseCropTypes(f.crop_type),
  latitude: f.latitude ?? undefined,
  longitude: f.longitude ?? undefined,
  createdAt: f.created_at,
});

export async function listOrganizationFarms(supabase: SupabaseClient, orgId: string): Promise<FarmField[]> {
  const { data: links, error: linksError } = await supabase
    .from('organization_farms')
    .select('farm_id')
    .eq('org_id', orgId);

  if (linksError) {
    console.error('Error fetching organization farm links:', linksError);
    throw new ServiceError(linksError.message, 500);
  }

  const farmIds = (links || []).map((l: any) => l.farm_id as string);

  if (farmIds.length === 0) {
    return [];
  }

  const { data: farmsData, error: farmsError } = await supabase
    .from('farms')
    .select('*')
    .in('id', farmIds);

  if (farmsError) {
    console.error('Error fetching farms for organization:', farmsError);
    throw new ServiceError(farmsError.message, 500);
  }

  return (farmsData || []).map(mapFarm);
}

export interface LinkFarmInput {
  orgId: string;
  farmId: string;
}

export async function linkFarmToOrganization(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: LinkFarmInput
): Promise<void> {
  const { orgId, farmId } = input;

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', orgId)
    .eq('owner_user_id', user.id)
    .maybeSingle();

  if (orgError) {
    console.error('Error validating organization:', orgError);
    throw new ServiceError(orgError.message, 500);
  }

  if (!org) {
    throw new ServiceError('Organization not found', 404);
  }

  const { data: farm, error: farmError } = await supabase
    .from('farms')
    .select('id')
    .eq('id', farmId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (farmError) {
    console.error('Error validating farm ownership:', farmError);
    throw new ServiceError(farmError.message, 500);
  }

  if (!farm) {
    throw new ServiceError('You can only link farms you own', 403);
  }

  const { error } = await supabase
    .from('organization_farms')
    .upsert({ org_id: orgId, farm_id: farmId }, { onConflict: 'org_id,farm_id' });

  if (error) {
    console.error('Error linking farm to organization:', error);
    throw new ServiceError(error.message, 400);
  }
}

export interface UnlinkFarmInput {
  orgId: string;
  farmId: string;
}

export async function unlinkFarmFromOrganization(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: UnlinkFarmInput
): Promise<void> {
  const { orgId, farmId } = input;

  const { error } = await supabase
    .from('organization_farms')
    .delete()
    .eq('org_id', orgId)
    .eq('farm_id', farmId);

  if (error) {
    console.error('Error unlinking farm from organization:', error);
    throw new ServiceError(error.message, 400);
  }
}
