import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Middleware Supabase client using @supabase/ssr.
 * Keeps auth session cookies refreshed on every request and returns the
 * current user (if any) so the caller can make routing decisions without
 * a second round-trip to Supabase.
 * Called from the root middleware.ts file.
 */
export const updateSession = async (
  request: NextRequest
): Promise<{ response: NextResponse; user: User | null }> => {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Mirror cookies onto the request for downstream server components
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        // Mirror cookies onto the response so the browser receives them
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Do NOT add logic between createServerClient and getUser().
  // Any mistake here will make the session hard to debug.
  const { data: { user } } = await supabase.auth.getUser();

  return { response: supabaseResponse, user };
};
