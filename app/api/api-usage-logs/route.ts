import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { listApiUsageLogs } from '@/services/api-usage-logs-service';
import { ServiceError } from '@/services/errors';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const apiKeyId = searchParams.get('apiKeyId');

    const supabase = await createClient();
    const logs = await listApiUsageLogs(supabase, apiKeyId);

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error('Get API usage logs error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
