import crypto from 'crypto';
import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { ApiKey } from '@/types/domain';
import { ServiceError } from './errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const mapApiKey = (k: any): ApiKey => ({
  id: k.id,
  userId: k.user_id,
  label: k.label,
  keyPrefix: k.key_prefix,
  status: k.status,
  createdAt: k.created_at,
  revokedAt: k.revoked_at ?? undefined,
});

export async function listApiKeys(supabase: SupabaseClient, user: SupabaseUserProfile): Promise<ApiKey[]> {
  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching API keys:', error);
    throw new ServiceError(error.message, 500);
  }

  return (data || []).map(mapApiKey);
}

export interface CreateApiKeyInput {
  label: string;
}

export async function createApiKey(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: CreateApiKeyInput
): Promise<{ key: ApiKey; secret: string }> {
  const { label } = input;

  if (!label) {
    throw new ServiceError('Label is required.', 400);
  }

  const secret = `agai_${crypto.randomBytes(24).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(secret).digest('hex');
  const keyPrefix = secret.slice(0, 12);

  const { data: newKey, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: user.id,
      label,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      status: 'Active',
    })
    .select()
    .single();

  if (error || !newKey) {
    console.error('Error creating API key:', error);
    throw new ServiceError(error?.message || 'Failed to create API key', 400);
  }

  return { key: mapApiKey(newKey), secret };
}

export async function revokeApiKey(supabase: SupabaseClient, user: SupabaseUserProfile, id: string): Promise<void> {
  const { error } = await supabase
    .from('api_keys')
    .update({ status: 'Revoked', revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error revoking API key:', error);
    throw new ServiceError(error.message, 400);
  }
}
