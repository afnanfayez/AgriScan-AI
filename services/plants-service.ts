import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { PlantCrop } from '@/types/domain';
import { ServiceError } from './errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const mapPlant = (p: any): PlantCrop => ({
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

export interface ListPlantsFilters {
  farmId?: string | null;
  healthStatus?: string | null;
  search?: string | null;
}

export async function listPlants(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  filters: ListPlantsFilters
): Promise<PlantCrop[]> {
  const { farmId, healthStatus, search } = filters;

  let query = supabase.from('plants').select('*');

  if (farmId && farmId !== 'all') {
    query = query.eq('farm_id', farmId);
  }
  if (healthStatus && healthStatus !== 'all') {
    query = query.eq('health_status', healthStatus);
  }

  const { data: plantsData, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching plants:', error);
    throw new ServiceError(error.message, 500);
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
      },
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

  return userPlants;
}

export interface CreatePlantInput {
  name: string;
  type: string;
  plantingDate: string;
  photoUrl?: string;
  farmId?: string;
}

export async function createPlant(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: CreatePlantInput
): Promise<PlantCrop> {
  const { name, type, plantingDate, photoUrl, farmId } = input;

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
    throw new ServiceError(plantError?.message || 'Failed to create plant', 400);
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

  return mapPlant(newPlant);
}

export interface UpdatePlantInput {
  id: string;
  name?: string;
  type?: string;
  plantingDate?: string;
  healthStatus?: string;
  photoUrl?: string;
  farmId?: string;
}

export async function updatePlant(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: UpdatePlantInput
): Promise<PlantCrop> {
  const { id, name, type, plantingDate, healthStatus, photoUrl, farmId } = input;

  // Retrieve existing plant to check if health status is changing
  const { data: existingPlant, error: fetchError } = await supabase
    .from('plants')
    .select('health_status')
    .eq('id', id)
    .single();

  if (fetchError || !existingPlant) {
    throw new ServiceError('Plant not found or unauthorized', 404);
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
    throw new ServiceError(updateError?.message || 'Failed to update plant', 400);
  }

  return mapPlant(updatedPlant);
}

export async function deletePlant(supabase: SupabaseClient, id: string): Promise<void> {
  // Delete plant - cascade delete in db automatically clears notes, scans, treatments, expert_reviews
  const { error: deleteError } = await supabase
    .from('plants')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('Error deleting plant:', deleteError);
    throw new ServiceError(deleteError.message, 400);
  }
}
