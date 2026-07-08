import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase';

const mapPlant = (p: any) => ({
  id: p.id,
  name: p.name,
  type: p.type,
  plantingDate: p.planting_date,
  healthStatus: p.health_status,
  photoUrl: p.photo_url,
  farmId: p.farm_id,
  userId: p.user_id,
  createdAt: p.created_at,
});

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const farmId = searchParams.get('farmId');
    const healthStatus = searchParams.get('healthStatus');
    const search = searchParams.get('search');

    const supabase = getSupabaseServerClient(user.token);
    
    let query = supabase.from('plants').select('*');

    // Filter by farm
    if (farmId && farmId !== 'all') {
      query = query.eq('farm_id', farmId);
    }

    // Filter by status
    if (healthStatus && healthStatus !== 'all') {
      query = query.eq('health_status', healthStatus);
    }

    // Fetch plant records
    const { data: plantsData, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching plants:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let userPlants = (plantsData || []).map(mapPlant);

    // Filter by search query on the client-side for ease
    if (search) {
      const q = search.toLowerCase();
      userPlants = userPlants.filter((p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q));
    }

    // If no plants exist, let's seed 3 realistic plants for the user
    if (userPlants.length === 0 && (!farmId || farmId === 'all') && (!healthStatus || healthStatus === 'all') && !search) {
      const { data: farmsData } = await supabase.from('farms').select('id');
      const targetFarmId = farmsData?.[0]?.id || null;

      const seedPlants = [
        {
          name: 'Golden Jubilee Tomato',
          type: 'Tomato',
          planting_date: '2026-04-15',
          health_status: 'Healthy',
          photo_url: 'https://picsum.photos/seed/tomato-plant/400/300',
          farm_id: targetFarmId,
          user_id: user.id,
        },
        {
          name: 'Red Rover Rose Bush',
          type: 'Rose',
          planting_date: '2026-05-10',
          health_status: 'Warning',
          photo_url: 'https://picsum.photos/seed/rose-plant/400/300',
          farm_id: targetFarmId,
          user_id: user.id,
        },
        {
          name: 'Dwarf Cavendish Banana',
          type: 'Banana',
          planting_date: '2026-03-01',
          health_status: 'Critical',
          photo_url: 'https://picsum.photos/seed/banana-plant/400/300',
          farm_id: targetFarmId,
          user_id: user.id,
        }
      ];

      const { data: insertedSeeds, error: seedError } = await supabase
        .from('plants')
        .insert(seedPlants)
        .select();

      if (seedError) {
        console.error('Error seeding default plants:', seedError);
      } else if (insertedSeeds) {
        userPlants = insertedSeeds.map(mapPlant);
      }
    }

    return NextResponse.json({ success: true, plants: userPlants });
  } catch (error: any) {
    console.error('Get plants error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, type, plantingDate, photoUrl, farmId } = await req.json();

    if (!name || !type || !plantingDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient(user.token);
    
    // Validate or assign farm
    let targetFarmId = farmId;
    if (!targetFarmId) {
      const { data: farmsData } = await supabase.from('farms').select('id').limit(1);
      targetFarmId = farmsData?.[0]?.id || null;
    }

    const { data: newPlant, error: plantError } = await supabase
      .from('plants')
      .insert({
        name,
        type,
        planting_date: plantingDate,
        health_status: 'Healthy',
        photo_url: photoUrl || `https://picsum.photos/seed/${name}/400/300`,
        farm_id: targetFarmId,
        user_id: user.id,
      })
      .select()
      .single();

    if (plantError || !newPlant) {
      console.error('Error creating plant:', plantError);
      return NextResponse.json({ error: plantError?.message || 'Failed to create plant' }, { status: 400 });
    }
    
    // Add welcome log note for the plant
    const { error: noteError } = await supabase
      .from('notes')
      .insert({
        plant_id: newPlant.id,
        user_id: user.id,
        content: `Plant registered. Cultivar: ${type}. Planting Date: ${plantingDate}. Initial health assessment is Healthy.`,
      });

    if (noteError) console.error('Error creating initial note:', noteError);

    return NextResponse.json({ success: true, plant: mapPlant(newPlant) });
  } catch (error: any) {
    console.error('Create plant error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, type, plantingDate, healthStatus, photoUrl, farmId } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Plant ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient(user.token);

    // Retrieve existing plant to check if health status is changing
    const { data: existingPlant, error: fetchError } = await supabase
      .from('plants')
      .select('health_status')
      .eq('id', id)
      .single();

    if (fetchError || !existingPlant) {
      return NextResponse.json({ error: 'Plant not found or unauthorized' }, { status: 404 });
    }

    // Check if status changes, log in notes
    if (healthStatus && healthStatus !== existingPlant.health_status) {
      const { error: noteError } = await supabase
        .from('notes')
        .insert({
          plant_id: id,
          user_id: user.id,
          content: `Health status changed from ${existingPlant.health_status} to ${healthStatus}.`,
        });
      if (noteError) console.error('Error creating health change note:', noteError);
    }

    // Update fields
    const updateData: any = {};
    if (name) updateData.name = name;
    if (type) updateData.type = type;
    if (plantingDate) updateData.planting_date = plantingDate;
    if (healthStatus) updateData.health_status = healthStatus;
    if (photoUrl) updateData.photo_url = photoUrl;
    if (farmId) updateData.farm_id = farmId;

    const { data: updatedPlant, error: updateError } = await supabase
      .from('plants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedPlant) {
      console.error('Error updating plant:', updateError);
      return NextResponse.json({ error: updateError?.message || 'Failed to update plant' }, { status: 400 });
    }

    return NextResponse.json({ success: true, plant: mapPlant(updatedPlant) });
  } catch (error: any) {
    console.error('Update plant error:', error);
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
      return NextResponse.json({ error: 'Plant ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient(user.token);

    // Delete plant - cascade delete in db automatically clears notes, scans, treatments, expert_reviews
    const { error: deleteError } = await supabase
      .from('plants')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting plant:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Plant deleted successfully' });
  } catch (error: any) {
    console.error('Delete plant error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
