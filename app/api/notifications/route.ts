import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { listNotifications, markNotificationsRead } from '@/services/notifications-service';
import { ServiceError } from '@/services/errors';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const notifications = await listNotifications(supabase);

    return NextResponse.json({ success: true, notifications });
  } catch (error: any) {
    console.error('Get notifications error:', error);
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

    const { id, readAll } = await req.json().catch(() => ({ id: null, readAll: false }));

    const supabase = await createClient();
    const notifications = await markNotificationsRead(supabase, user, { id, readAll });

    return NextResponse.json({ success: true, notifications });
  } catch (error: any) {
    console.error('Update notifications error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
