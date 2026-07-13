import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { listFarms, createFarm, updateFarm } from '@/services/farms-service';
import { ServiceError } from '@/services/errors';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const farms = await listFarms(supabase, user);

    return NextResponse.json({ success: true, farms });
  } catch (error: any) {
    console.error('Get farms error:', error);
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

    const { name, zoneCount, location, acreage, cropType, cropTypes, latitude, longitude } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'Farm name is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const farm = await createFarm(supabase, user, { name, zoneCount, location, acreage, cropType, cropTypes, latitude, longitude });

    return NextResponse.json({ success: true, farm });
  } catch (error: any) {
    console.error('Create farm error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, zoneCount, location, acreage, cropType, cropTypes, latitude, longitude } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Farm ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const farm = await updateFarm(supabase, user, id, { name, zoneCount, location, acreage, cropType, cropTypes, latitude, longitude });

    return NextResponse.json({ success: true, farm });
  } catch (error: any) {
    console.error('Update farm error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
