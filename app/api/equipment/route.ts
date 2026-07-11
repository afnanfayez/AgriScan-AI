import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { listEquipment, createEquipment, updateEquipment, deleteEquipment } from '@/services/equipment-service';
import { ServiceError } from '@/services/errors';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const farmId = searchParams.get('farmId');

    const supabase = await createClient();
    const equipment = await listEquipment(supabase, { farmId });

    return NextResponse.json({ success: true, equipment });
  } catch (error: any) {
    console.error('Get equipment error:', error);
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

    const { farmId, name, equipmentType, status, purchaseDate, notes } = await req.json();

    if (!name || !equipmentType) {
      return NextResponse.json({ error: 'Name and equipment type are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const item = await createEquipment(supabase, user, { farmId, name, equipmentType, status, purchaseDate, notes });

    return NextResponse.json({ success: true, equipment: item });
  } catch (error: any) {
    console.error('Create equipment error:', error);
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

    const { id, farmId, name, equipmentType, status, purchaseDate, notes } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Equipment ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const item = await updateEquipment(supabase, user, { id, farmId, name, equipmentType, status, purchaseDate, notes });

    return NextResponse.json({ success: true, equipment: item });
  } catch (error: any) {
    console.error('Update equipment error:', error);
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
      return NextResponse.json({ error: 'Equipment ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    await deleteEquipment(supabase, id);

    return NextResponse.json({ success: true, message: 'Equipment deleted successfully' });
  } catch (error: any) {
    console.error('Delete equipment error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
