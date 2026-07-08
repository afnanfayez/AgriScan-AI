import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase';

const mapNotification = (n: any) => ({
  id: n.id,
  userId: n.user_id,
  title: n.title,
  message: n.message,
  category: n.category,
  read: n.read,
  createdAt: n.created_at,
});

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient(user.token);
    const { data: notifs, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, notifications: (notifs || []).map(mapNotification) });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, readAll } = await req.json().catch(() => ({ id: null, readAll: false }));

    const supabase = getSupabaseServerClient(user.token);

    if (readAll) {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id);
      if (updateError) console.error('Error marking all read:', updateError);
    } else if (id) {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
      if (updateError) console.error('Error marking notification read:', updateError);
    } else {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Fetch refreshed list
    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    return NextResponse.json({ success: true, notifications: (notifs || []).map(mapNotification) });
  } catch (error: any) {
    console.error('Update notifications error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
