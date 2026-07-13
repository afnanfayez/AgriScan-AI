import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { listApiKeys, createApiKey, revokeApiKey } from '@/services/api-keys-service';
import { ServiceError } from '@/services/errors';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const keys = await listApiKeys(supabase, user);

    return NextResponse.json({ success: true, keys });
  } catch (error: any) {
    console.error('Get API keys error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { label } = await req.json();

    if (!label || !String(label).trim()) {
      return NextResponse.json({ error: 'Label is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { key, secret } = await createApiKey(supabase, user, { label });

    return NextResponse.json({ success: true, key, secret });
  } catch (error: any) {
    console.error('Create API key error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'API key ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    await revokeApiKey(supabase, user, id);

    return NextResponse.json({ success: true, message: 'API key revoked successfully' });
  } catch (error: any) {
    console.error('Revoke API key error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
