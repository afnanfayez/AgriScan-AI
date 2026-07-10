import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { listTreatments, updateTreatmentStatus } from '@/services/treatments-service';
import { ServiceError } from '@/services/errors';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const plantId = searchParams.get('plantId');

    const supabase = await createClient();
    const treatments = await listTreatments(supabase, plantId);

    return NextResponse.json({ success: true, treatments });
  } catch (error: any) {
    console.error('Get treatments error:', error);
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

    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'ID and status are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const treatment = await updateTreatmentStatus(supabase, user, { id, status });

    return NextResponse.json({ success: true, treatment });
  } catch (error: any) {
    console.error('Update treatment error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
