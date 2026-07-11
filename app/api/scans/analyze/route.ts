import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { analyzeScan } from '@/services/scans-service';
import { ServiceError } from '@/services/errors';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { image, plantId } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'No plant image provided' }, { status: 400 });
    }

    if (!plantId) {
      return NextResponse.json({ error: 'Plant ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const result = await analyzeScan(supabase, user, { image, plantId });

    return NextResponse.json({
      success: true,
      scan: result.scan,
      treatment: result.treatment,
    });
  } catch (error: any) {
    console.error('Scan analysis error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
export const maxDuration = 60; // Allow enough time for model analysis
