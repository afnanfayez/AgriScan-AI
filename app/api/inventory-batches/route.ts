import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { listInventoryBatches, createInventoryBatch, updateInventoryBatch, deleteInventoryBatch } from '@/services/inventory-service';
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
    const batches = await listInventoryBatches(supabase, { farmId });

    return NextResponse.json({ success: true, batches });
  } catch (error: any) {
    console.error('Get inventory batches error:', error);
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

    const { farmId, plantType, batchName, quantity, unitPrice, propagationDate, readyDate, status, lowStockThreshold, grade } = await req.json();

    if (!plantType) {
      return NextResponse.json({ error: 'Plant type is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const batch = await createInventoryBatch(supabase, user, {
      farmId,
      plantType,
      batchName,
      quantity,
      unitPrice,
      propagationDate,
      readyDate,
      status,
      lowStockThreshold,
      grade,
    });

    return NextResponse.json({ success: true, batch });
  } catch (error: any) {
    console.error('Create inventory batch error:', error);
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

    const { id, farmId, plantType, batchName, quantity, unitPrice, propagationDate, readyDate, status, lowStockThreshold, grade, certificateUrl } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const batch = await updateInventoryBatch(supabase, user, {
      id,
      farmId,
      plantType,
      batchName,
      quantity,
      unitPrice,
      propagationDate,
      readyDate,
      status,
      lowStockThreshold,
      grade,
      certificateUrl,
    });

    return NextResponse.json({ success: true, batch });
  } catch (error: any) {
    console.error('Update inventory batch error:', error);
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
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    await deleteInventoryBatch(supabase, id);

    return NextResponse.json({ success: true, message: 'Inventory batch deleted successfully' });
  } catch (error: any) {
    console.error('Delete inventory batch error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
