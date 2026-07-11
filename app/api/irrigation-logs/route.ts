import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { listIrrigationLogs, createIrrigationLog, updateIrrigationLog, deleteIrrigationLog } from '@/services/irrigation-service';
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
    const logs = await listIrrigationLogs(supabase, { farmId });

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error('Get irrigation logs error:', error);
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

    const { farmId, logType, amount, unit, notes, loggedOn } = await req.json();

    if (!logType || !loggedOn) {
      return NextResponse.json({ error: 'Log type and logged date are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const log = await createIrrigationLog(supabase, user, { farmId, logType, amount, unit, notes, loggedOn });

    return NextResponse.json({ success: true, log });
  } catch (error: any) {
    console.error('Create irrigation log error:', error);
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

    const { id, farmId, logType, amount, unit, notes, loggedOn } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Irrigation log ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const log = await updateIrrigationLog(supabase, user, { id, farmId, logType, amount, unit, notes, loggedOn });

    return NextResponse.json({ success: true, log });
  } catch (error: any) {
    console.error('Update irrigation log error:', error);
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
      return NextResponse.json({ error: 'Irrigation log ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    await deleteIrrigationLog(supabase, id);

    return NextResponse.json({ success: true, message: 'Irrigation log deleted successfully' });
  } catch (error: any) {
    console.error('Delete irrigation log error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
