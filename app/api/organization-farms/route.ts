import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import {
  listOrganizationFarms,
  linkFarmToOrganization,
  unlinkFarmFromOrganization,
} from '@/services/organization-farms-service';
import { ServiceError } from '@/services/errors';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const farms = await listOrganizationFarms(supabase, orgId);

    return NextResponse.json({ success: true, farms });
  } catch (error: any) {
    console.error('Get organization farms error:', error);
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

    const { orgId, farmId } = await req.json();

    if (!orgId || !farmId) {
      return NextResponse.json({ error: 'Organization ID and farm ID are required' }, { status: 400 });
    }

    const supabase = await createClient();
    await linkFarmToOrganization(supabase, user, { orgId, farmId });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Link organization farm error:', error);
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
    const orgId = searchParams.get('orgId');
    const farmId = searchParams.get('farmId');

    if (!orgId || !farmId) {
      return NextResponse.json({ error: 'Organization ID and farm ID are required' }, { status: 400 });
    }

    const supabase = await createClient();
    await unlinkFarmFromOrganization(supabase, user, { orgId, farmId });

    return NextResponse.json({ success: true, message: 'Farm unlinked successfully' });
  } catch (error: any) {
    console.error('Unlink organization farm error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
