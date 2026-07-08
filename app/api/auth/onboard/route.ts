import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountType, location, units, plan, firstFarmName } = await req.json();

    const supabase = getSupabaseServerClient(user.token);

    // Update user properties in public.profiles
    const updateData: any = {};
    if (accountType) updateData.account_type = accountType;
    if (location !== undefined) updateData.location = location;
    if (units) updateData.units = units;
    if (plan) updateData.plan = plan;

    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update profile:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
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
            user_id: user.id
          },
          {
            name: 'Garden Rose (East Block)',
            type: 'Flower',
            planting_date: new Date().toISOString().split('T')[0],
            health_status: 'Healthy',
            farm_id: farm.id,
            user_id: user.id
          }
        ]);
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatar_url || user.avatarUrl,
        accountType: profile.account_type,
        location: profile.location,
        units: profile.units,
        plan: profile.plan,
      }
    });
  } catch (error: any) {
    console.error('Onboard error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
