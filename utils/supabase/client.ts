import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser-side Supabase client using @supabase/ssr.
 * Use this in Client Components ('use client').
 * Automatically manages cookies for session persistence.
 */
export const createClient = () =>
  createBrowserClient(supabaseUrl, supabaseKey);
