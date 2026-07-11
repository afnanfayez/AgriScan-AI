import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { listFieldScans, createFieldScan } from '@/services/field-scans-service';
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
    const fieldScans = await listFieldScans(supabase, farmId);

    return NextResponse.json({ success: true, fieldScans });
  } catch (error: any) {
    console.error('Get field scans error:', error);
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

    const { farmId, images } = await req.json();

    if (!farmId) {
      return NextResponse.json({ error: 'Farm ID is required' }, { status: 400 });
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'At least one image is required.' }, { status: 400 });
    }

    const supabase = await createClient();
    const result = await createFieldScan(supabase, user, { farmId, images });

    return NextResponse.json({ success: true, fieldScan: result.fieldScan });
  } catch (error: any) {
    console.error('Create field scan error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export const maxDuration = 120; // Multiple sequential Gemini calls take longer than a single scan
