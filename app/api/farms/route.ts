import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase';

const mapFarm = (f: any) => ({
  id: f.id,
  name: f.name,
  userId: f.user_id,
  zoneCount: f.zone_count,
  createdAt: f.created_at,
});

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient(user.token);
    
    // Find farms owned by user OR where user is a team member
    const { data: farmsData, error } = await supabase
      .from('farms')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching farms from Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    let userFarms = (farmsData || []).map(mapFarm);
    
    // Fallback: If no farms exist, create a default one to make sure user experience is rich out of the box!
    if (userFarms.length === 0) {
      const { data: defaultFarm, error: insertError } = await supabase
        .from('farms')
        .insert({
          name: `${user.name}'s Farm/Garden`,
          user_id: user.id,
          zone_count: 3,
        })
        .select()
        .single();
        
      if (insertError) {
        console.error('Error creating default farm:', insertError);
      } else if (defaultFarm) {
        userFarms.push(mapFarm(defaultFarm));
      }
    }

    return NextResponse.json({ success: true, farms: userFarms });
  } catch (error: any) {
    console.error('Get farms error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, zoneCount } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'Farm name is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient(user.token);
    
    const { data: newFarm, error: farmError } = await supabase
      .from('farms')
      .insert({
        name,
        user_id: user.id,
        zone_count: zoneCount || 1,
      })
      .select()
      .single();

    if (farmError || !newFarm) {
      console.error('Error inserting farm:', farmError);
      return NextResponse.json({ error: farmError?.message || 'Failed to create farm' }, { status: 400 });
    }
    
    // Log system notification
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title: 'New Zone Created',
        message: `You successfully added the zone "${name}" to your management dashboard.`,
        category: 'System',
        read: false,
      });

    if (notifError) console.error('Error creating farm notification:', notifError);

    return NextResponse.json({ success: true, farm: mapFarm(newFarm) });
  } catch (error: any) {
    console.error('Create farm error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
