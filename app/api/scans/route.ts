import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase';

const mapScan = (s: any) => ({
  id: s.id,
  plantId: s.plant_id,
  userId: s.user_id,
  imageUrl: s.image_url,
  diagnosis: s.diagnosis,
  confidence: s.confidence,
  severity: s.severity,
  symptoms: s.symptoms,
  createdAt: s.created_at,
});

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const plantId = searchParams.get('plantId');

    const supabase = getSupabaseServerClient(user.token);
    let query = supabase.from('scans').select('*');

    if (plantId) {
      query = query.eq('plant_id', plantId);
    }

    const { data: scansData, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching scans:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, scans: (scansData || []).map(mapScan) });
  } catch (error: any) {
    console.error('Get scans error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
