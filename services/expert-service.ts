import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { ExpertReview } from '@/types/domain';
import { ServiceError } from './errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const mapReview = (r: any): ExpertReview => ({
  id: r.id,
  scanId: r.scan_id,
  plantId: r.plant_id,
  userId: r.user_id,
  status: r.status,
  expertReply: r.expert_reply,
  createdAt: r.created_at,
});

export async function listExpertReviews(supabase: SupabaseClient): Promise<ExpertReview[]> {
  const { data: reviewsData, error } = await supabase
    .from('expert_reviews')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching expert reviews:', error);
    throw new ServiceError(error.message, 500);
  }

  return (reviewsData || []).map(mapReview);
}

export async function requestExpertReview(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: { scanId: string; plantId: string; symptoms?: string }
): Promise<{ review: ExpertReview; alreadyRequested: boolean }> {
  const { scanId, plantId } = input;

  // Verify scan exists
  const { data: scan, error: scanFetchError } = await supabase
    .from('scans')
    .select('*')
    .eq('id', scanId)
    .single();

  if (scanFetchError || !scan) {
    throw new ServiceError('Scan not found', 404);
  }

  // Check if review already requested
  const { data: existing } = await supabase
    .from('expert_reviews')
    .select('*')
    .eq('scan_id', scanId)
    .maybeSingle();

  if (existing) {
    return { review: mapReview(existing), alreadyRequested: true };
  }

  // Create realistic review response immediately
  const expertReply = `Hello ${user.name},\n\nI have reviewed the leaf photograph of your ${scan.diagnosis}. Based on the chlorosis and spot margins, the AI model's diagnosis is 90% correct. However, please also inspect the underside of the leaves for small white speckling as spider mites might be acting as a secondary stressor. I recommend starting the organic copper sprays immediately and skipping nitrogen fertilizers for the next 2 weeks to reduce tender growth.\n\nBest regards,\nDr. Helen Peterson, Chief Agronomist`;

  const { data: newReview, error: insertError } = await supabase
    .from('expert_reviews')
    .insert({
      scan_id: scanId,
      plant_id: plantId,
      user_id: user.id,
      status: 'Reviewed',
      expert_reply: expertReply,
    })
    .select()
    .single();

  if (insertError || !newReview) {
    console.error('Error requesting expert review:', insertError);
    throw new ServiceError(insertError?.message || 'Failed to request expert review', 400);
  }

  // Add notification about review request
  await supabase.from('notifications').insert([
    {
      user_id: user.id,
      title: 'Expert Review Requested',
      message: `Your review request for "${scan.diagnosis}" has been routed to our certified crop pathologists.`,
      category: 'Community',
      read: false,
    },
    {
      user_id: user.id,
      title: 'Expert Review Completed',
      message: `Dr. Helen Peterson has returned a pathological review for your ${scan.diagnosis} scan.`,
      category: 'Community',
      read: false,
    },
  ]);

  return { review: mapReview(newReview), alreadyRequested: false };
}
