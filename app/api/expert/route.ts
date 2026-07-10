import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { listExpertReviews, requestExpertReview } from '@/services/expert-service';
import { ServiceError } from '@/services/errors';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const reviews = await listExpertReviews(supabase);

    return NextResponse.json({ success: true, reviews });
  } catch (error: any) {
    console.error('Get expert reviews error:', error);
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

    const { scanId, plantId, symptoms } = await req.json();

    if (!scanId || !plantId) {
      return NextResponse.json({ error: 'Scan ID and Plant ID are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { review, alreadyRequested } = await requestExpertReview(supabase, user, { scanId, plantId, symptoms });

    if (alreadyRequested) {
      return NextResponse.json({ success: true, review, message: 'Review already requested' });
    }

    return NextResponse.json({ success: true, review });
  } catch (error: any) {
    console.error('Request expert review error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
