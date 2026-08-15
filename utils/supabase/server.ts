import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Server-side Supabase client using @supabase/ssr.
 * Reads and writes cookies automatically to keep the session fresh.
 * Use this in Server Components, Route Handlers, and Server Actions.
 */
export const createClient = async () => {
  // Checked here rather than at module scope so `next build` still works in
  // environments that inject env vars only at runtime. Without this the client
  // is constructed against `undefined` and every auth call - login, signup
  // codes, password reset - fails with an opaque fetch error instead of saying
  // what is actually missing.
  if (!supabaseUrl || !supabaseKey) {
    const missing = [
      !supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL',
      !supabaseKey && 'NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)',
    ].filter(Boolean);
    throw new Error(
      `Supabase is not configured: ${missing.join(' and ')} missing. Auth, signup codes, and password reset cannot work without it. Copy .env.example to .env.local and fill in the project values.`
    );
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — safe to ignore.
          // Middleware will handle session refresh.
        }
      },
    },
  });
};
