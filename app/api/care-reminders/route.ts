import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { listCareReminders, createCareReminder, updateCareReminder, deleteCareReminder } from '@/services/care-reminders-service';
import { ServiceError } from '@/services/errors';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const plantId = searchParams.get('plantId');
    const upcomingOnly = searchParams.get('upcomingOnly') === 'true';

    const supabase = await createClient();
    const reminders = await listCareReminders(supabase, { plantId, upcomingOnly });

    return NextResponse.json({ success: true, reminders });
  } catch (error: any) {
    console.error('Get care reminders error:', error);
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

    const { plantId, reminderType, dueDate, recurringDays, notes } = await req.json();

    if (!plantId || !reminderType || !dueDate) {
      return NextResponse.json({ error: 'Plant ID, reminder type, and due date are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const reminder = await createCareReminder(supabase, user, { plantId, reminderType, dueDate, recurringDays, notes });

    return NextResponse.json({ success: true, reminder });
  } catch (error: any) {
    console.error('Create care reminder error:', error);
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

    const { id, completed, dueDate, notes } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Reminder ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const reminder = await updateCareReminder(supabase, { id, completed, dueDate, notes });

    return NextResponse.json({ success: true, reminder });
  } catch (error: any) {
    console.error('Update care reminder error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Reminder ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    await deleteCareReminder(supabase, id);

    return NextResponse.json({ success: true, message: 'Reminder deleted successfully' });
  } catch (error: any) {
    console.error('Delete care reminder error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
