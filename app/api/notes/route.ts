import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase';

const mapNote = (n: any) => ({
  id: n.id,
  plantId: n.plant_id,
  userId: n.user_id,
  content: n.content,
  createdAt: n.created_at,
});

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const plantId = searchParams.get('plantId');

    if (!plantId) {
      return NextResponse.json({ error: 'Plant ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient(user.token);
    const { data: notesData, error } = await supabase
      .from('notes')
      .select('*')
      .eq('plant_id', plantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, notes: (notesData || []).map(mapNote) });
  } catch (error: any) {
    console.error('Get notes error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plantId, content } = await req.json();

    if (!plantId || !content) {
      return NextResponse.json({ error: 'Plant ID and content are required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient(user.token);
    const { data: newNote, error: insertError } = await supabase
      .from('notes')
      .insert({
        plant_id: plantId,
        user_id: user.id,
        content,
      })
      .select()
      .single();

    if (insertError || !newNote) {
      console.error('Error inserting note:', insertError);
      return NextResponse.json({ error: insertError?.message || 'Failed to insert note' }, { status: 400 });
    }

    return NextResponse.json({ success: true, note: mapNote(newNote) });
  } catch (error: any) {
    console.error('Create note error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient(user.token);
    const { error: deleteError } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting note:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Note deleted successfully' });
  } catch (error: any) {
    console.error('Delete note error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
