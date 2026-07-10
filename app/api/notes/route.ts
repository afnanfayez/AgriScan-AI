import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { listNotesForPlant, createNote, deleteNote } from '@/services/notes-service';
import { ServiceError } from '@/services/errors';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const plantId = searchParams.get('plantId');

    if (!plantId) {
      return NextResponse.json({ error: 'Plant ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const notes = await listNotesForPlant(supabase, plantId);

    return NextResponse.json({ success: true, notes });
  } catch (error: any) {
    console.error('Get notes error:', error);
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

    const { plantId, content } = await req.json();

    if (!plantId || !content) {
      return NextResponse.json({ error: 'Plant ID and content are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const note = await createNote(supabase, user, { plantId, content });

    return NextResponse.json({ success: true, note });
  } catch (error: any) {
    console.error('Create note error:', error);
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
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    await deleteNote(supabase, id);

    return NextResponse.json({ success: true, message: 'Note deleted successfully' });
  } catch (error: any) {
    console.error('Delete note error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
