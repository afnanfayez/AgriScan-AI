import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createCheckoutSession } from '@/services/billing-service';
import { ServiceError } from '@/services/errors';

const UPGRADABLE_PLANS = ['Pro', 'Enterprise'] as const;

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan } = await req.json();

    if (!UPGRADABLE_PLANS.includes(plan)) {
      return NextResponse.json({ error: 'Plan must be Pro or Enterprise.' }, { status: 400 });
    }

    const url = await createCheckoutSession(user, plan);

    return NextResponse.json({ success: true, url });
  } catch (error: any) {
    console.error('Create checkout session error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
