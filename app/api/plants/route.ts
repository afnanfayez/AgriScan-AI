import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { listPlants, createPlant, updatePlant, deletePlant } from '@/services/plants-service';
import { ServiceError } from '@/services/errors';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const farmId = searchParams.get('farmId');
    const healthStatus = searchParams.get('healthStatus');
    const search = searchParams.get('search');

    const supabase = await createClient();
    const plants = await listPlants(supabase, user, { farmId, healthStatus, search });

    return NextResponse.json({ success: true, plants });
  } catch (error: any) {
    console.error('Get plants error:', error);
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

    const { name, type, plantingDate, photoUrl, farmId, healthStatus } = await req.json();

    if (!name || !type || !plantingDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createClient();
    const plant = await createPlant(supabase, user, { name, type, plantingDate, photoUrl, farmId, healthStatus });

    return NextResponse.json({ success: true, plant });
  } catch (error: any) {
    console.error('Create plant error:', error);
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

    const { id, name, type, plantingDate, healthStatus, photoUrl, farmId } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Plant ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const plant = await updatePlant(supabase, user, { id, name, type, plantingDate, healthStatus, photoUrl, farmId });

    return NextResponse.json({ success: true, plant });
  } catch (error: any) {
    console.error('Update plant error:', error);
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
      return NextResponse.json({ error: 'Plant ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    await deletePlant(supabase, id);

    return NextResponse.json({ success: true, message: 'Plant deleted successfully' });
  } catch (error: any) {
    console.error('Delete plant error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
