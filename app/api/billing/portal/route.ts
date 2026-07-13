import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createPortalSession } from '@/services/billing-service';
import { ServiceError } from '@/services/errors';

export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = await createPortalSession(user);

    return NextResponse.json({ success: true, url });
  } catch (error: any) {
    console.error('Create billing portal session error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
