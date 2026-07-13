import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { OrgMember } from '@/types/domain';
import { ServiceError } from './errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const mapOrgMember = (m: any): OrgMember => ({
  id: m.id,
  orgId: m.org_id,
  email: m.email,
  role: m.role,
  createdAt: m.created_at,
});

export async function listOrgMembers(supabase: SupabaseClient, orgId: string): Promise<OrgMember[]> {
  const { data, error } = await supabase
    .from('org_members')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching org members:', error);
    throw new ServiceError(error.message, 500);
  }

  return (data || []).map(mapOrgMember);
}

export interface CreateOrgMemberInput {
  orgId: string;
  email: string;
  role?: OrgMember['role'];
}

export async function createOrgMember(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: CreateOrgMemberInput
): Promise<OrgMember> {
  const { orgId, email, role } = input;

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

  const { data: newMember, error } = await supabase
    .from('org_members')
    .insert({
      org_id: orgId,
      email,
      role: role || 'Viewer',
    })
    .select()
    .single();

  if (error || !newMember) {
    console.error('Error creating org member:', error);
    throw new ServiceError(error?.message || 'Failed to create org member', 400);
  }

  return mapOrgMember(newMember);
}

export async function deleteOrgMember(supabase: SupabaseClient, user: SupabaseUserProfile, id: string): Promise<void> {
  const { error } = await supabase
    .from('org_members')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting org member:', error);
    throw new ServiceError(error.message, 400);
  }
}
