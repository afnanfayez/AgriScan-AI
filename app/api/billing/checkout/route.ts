import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createCheckoutSession } from '@/services/billing-service';
import { ServiceError } from '@/services/errors';

const UPGRADABLE_PLANS = ['Pro', 'Enterprise'] as const;

function requestBaseUrl(req: NextRequest): string | undefined {
  const origin = req.headers.get('origin');
  if (origin?.startsWith('http://') || origin?.startsWith('https://')) {
    return origin;
  }

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (!host) return undefined;

  const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '') || 'https';
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan, theme, cancelPath } = await req.json();

    if (!UPGRADABLE_PLANS.includes(plan)) {
      return NextResponse.json({ error: 'Plan must be Pro or Enterprise.' }, { status: 400 });
    }

    const checkoutTheme = theme === 'dark' ? 'dark' : 'light';
    const safeCancelPath =
      typeof cancelPath === 'string' && cancelPath.startsWith('/') && !cancelPath.startsWith('//')
        ? cancelPath
        : undefined;
    const url = await createCheckoutSession(user, plan, checkoutTheme, safeCancelPath, requestBaseUrl(req));

    return NextResponse.json({ success: true, url });
  } catch (error: any) {
    console.error('Create checkout session error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
