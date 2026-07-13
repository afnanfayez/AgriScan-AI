import { createClient } from '@/utils/supabase/server';
import type { ApiUsageLog } from '@/types/domain';
import { ServiceError } from './errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const mapApiUsageLog = (l: any): ApiUsageLog => ({
  id: l.id,
  apiKeyId: l.api_key_id,
  endpoint: l.endpoint,
  statusCode: l.status_code,
  requestedAt: l.requested_at,
});

export async function listApiUsageLogs(
  supabase: SupabaseClient,
  apiKeyId?: string | null
): Promise<ApiUsageLog[]> {
  let apiKeyIds: string[];

  if (apiKeyId) {
    apiKeyIds = [apiKeyId];
  } else {
    // RLS (api_keys: owner can select) already scopes this to the caller's own keys.
    const { data: keysData, error: keysError } = await supabase
      .from('api_keys')
      .select('id');

    if (keysError) {
      console.error('Error fetching API keys for usage logs:', keysError);
      throw new ServiceError(keysError.message, 500);
    }

    apiKeyIds = (keysData || []).map((k: any) => k.id as string);
  }

  if (apiKeyIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('api_usage_logs')
    .select('*')
    .in('api_key_id', apiKeyIds)
    .order('requested_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching API usage logs:', error);
    throw new ServiceError(error.message, 500);
  }

  return (data || []).map(mapApiUsageLog);
}
