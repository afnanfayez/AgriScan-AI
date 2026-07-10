import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { onboardUser } from '@/services/auth/onboarding';
import { ServiceError } from '@/services/errors';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountType, location, units, plan, firstFarmName } = await req.json();

    const supabase = await createClient();
    const result = await onboardUser(supabase, user, { accountType, location, units, plan, firstFarmName });

    return NextResponse.json({
      success: true,
      user: result,
    });
  } catch (error: any) {
    console.error('Onboard error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
