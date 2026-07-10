import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Creates an administrative client using the Service Role Key.
 * This client bypasses RLS and can perform administrative tasks on auth and database tables.
 */
export function getSupabaseAdminClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase URL and Service Role Key must be configured in environment variables.');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}

/**
 * Decodes base64 images and uploads them to a public Supabase Storage bucket.
 * Falls back gracefully if bucket creation or upload fails.
 */
export async function uploadImageToStorage(
  base64Image: string,
  fileName: string,
  bucketName: string = 'agriscan'
): Promise<string | null> {
  try {
    const adminClient = getSupabaseAdminClient();
    
    // Ensure the bucket exists AND is set to public.
    // createBucket only has effect on first creation; updateBucket ensures an
    // existing bucket that was created as private is made public too.
    try {
      await adminClient.storage.createBucket(bucketName, { public: true });
    } catch {
      // Bucket already exists — update it to public to be safe
      await adminClient.storage.updateBucket(bucketName, { public: true });
    }

    // Extract base64 clean content
    let cleanBase64 = base64Image;
    let contentType = 'image/jpeg';

    if (base64Image.startsWith('data:')) {
      const parts = base64Image.split(',');
      cleanBase64 = parts[1];
      const mimeMatch = parts[0].match(/data:(.*?);/);
      if (mimeMatch) contentType = mimeMatch[1];
    }

    const buffer = Buffer.from(cleanBase64, 'base64');

    // Upload to Supabase Storage
    const { data, error } = await adminClient.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.warn('Supabase Storage upload error:', error);
      return null;
    }

    // Get Public URL
    const { data: publicUrlData } = adminClient.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.warn('Failed to upload image to Supabase Storage, using fallback:', error);
    return null;
  }
}
