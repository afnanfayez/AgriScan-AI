import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { Organization } from '@/types/domain';
import { ServiceError } from './errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const mapOrganization = (o: any): Organization => ({
  id: o.id,
  ownerUserId: o.owner_user_id,
  name: o.name,
  createdAt: o.created_at,
});

export async function getOrCreateOrganization(
  supabase: SupabaseClient,
  user: SupabaseUserProfile
): Promise<Organization> {
  const { data: existingOrg, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching organization:', error);
    throw new ServiceError(error.message, 500);
  }

  if (existingOrg) {
    return mapOrganization(existingOrg);
  }

  const { data: newOrg, error: insertError } = await supabase
    .from('organizations')
    .insert({
      owner_user_id: user.id,
      name: `${user.name}'s Organization`,
    })
    .select()
    .single();

  if (insertError || !newOrg) {
    console.error('Error creating default organization:', insertError);
    throw new ServiceError(insertError?.message || 'Failed to create organization', 400);
  }

  return mapOrganization(newOrg);
}

export async function updateOrganizationName(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  name: string
): Promise<Organization> {
  const { data: updatedOrg, error } = await supabase
    .from('organizations')
    .update({ name })
    .eq('owner_user_id', user.id)
    .select()
    .single();

  if (error || !updatedOrg) {
    console.error('Error updating organization:', error);
    throw new ServiceError(error?.message || 'Failed to update organization', 400);
  }

  return mapOrganization(updatedOrg);
}
