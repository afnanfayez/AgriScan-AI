import { createClient } from '@/utils/supabase/server';
import { uploadImageToStorage } from '@/lib/supabase';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { AccountType } from '@/types/domain';
import { ServiceError } from '../errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface OnboardInput {
  name?: string;
  accountType?: AccountType;
  location?: string;
  units?: string;
  plan?: string;
  firstFarmName?: string;
  avatarUrl?: string;
}

export interface OnboardResult {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  accountType: AccountType;
  location: string;
  units: string;
  plan: string;
}

export async function onboardUser(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: OnboardInput
): Promise<OnboardResult> {
  const { name, accountType, location, units, plan, firstFarmName, avatarUrl } = input;
  const nextName = typeof name === 'string' ? name.trim() : undefined;
  const nextAvatarUrl = typeof avatarUrl === 'string' ? avatarUrl.trim() : undefined;

  // Update user properties in public.profiles
  const updateData: any = {};
  if (nextName) updateData.name = nextName;
  if (accountType) updateData.account_type = accountType;
  if (location !== undefined) updateData.location = location;
  if (units) updateData.units = units;
  if (plan) updateData.plan = plan;
  if (nextAvatarUrl) {
    if (nextAvatarUrl.startsWith('data:image/')) {
      const uploadedAvatarUrl = await uploadImageToStorage(
        nextAvatarUrl,
        `avatars/${user.id}/${Date.now()}.jpg`,
        'agriscan'
      );

      if (!uploadedAvatarUrl) {
        throw new ServiceError('Profile image could not be uploaded. Please try another image.', 400);
      }

      updateData.avatar_url = uploadedAvatarUrl;
    } else if (/^https?:\/\//i.test(nextAvatarUrl)) {
      updateData.avatar_url = nextAvatarUrl;
    } else {
      throw new ServiceError('Profile image format is not supported.', 400);
    }
  }

  const { data: profile, error: updateError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email,
        ...updateData,
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (updateError) {
    console.error('Failed to update profile:', updateError);
    throw new ServiceError(updateError.message, 400);
  }

  const authMetadata: Record<string, string> = {};
  if (nextName) authMetadata.name = nextName;
  if (accountType) authMetadata.account_type = accountType;
  if (profile.avatar_url) authMetadata.avatar_url = profile.avatar_url;

  if (Object.keys(authMetadata).length > 0) {
    const { error: authUpdateError } = await supabase.auth.updateUser({
      data: authMetadata,
    });
    if (authUpdateError) {
      console.error('Failed to update auth metadata:', authUpdateError);
    }
  }

  // Create a real farm/field record linked to the user
  if (firstFarmName) {
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .insert({
        name: firstFarmName,
        user_id: user.id,
        zone_count: 4,
      })
      .select()
      .single();

    if (farmError) {
      console.error('Error creating onboarding farm:', farmError);
    } else if (farm) {
      // Automatically insert a couple of starter plants for the user
      await supabase.from('plants').insert([
        {
          name: 'Tomato (Main Greenhouse)',
          type: 'Vegetable',
          planting_date: new Date().toISOString().split('T')[0],
          health_status: 'Healthy',
          farm_id: farm.id,
          user_id: user.id,
        },
        {
          name: 'Garden Rose (East Block)',
          type: 'Flower',
          planting_date: new Date().toISOString().split('T')[0],
          health_status: 'Healthy',
          farm_id: farm.id,
          user_id: user.id,
        },
      ]);
    }
  }

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.avatar_url || user.avatarUrl,
    accountType: profile.account_type,
    location: profile.location,
    units: profile.units,
    plan: profile.plan,
  };
}
