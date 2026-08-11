import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

/**
 * Supabase client for Server Components and Server Actions.
 * Create a new one per request — never hoist it into a module-level variable.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, which cannot set cookies. Safe to
            // ignore: the proxy refreshes the session on every request anyway.
          }
        },
      },
    },
  );
}

/**
 * A client that reads and writes no cookies, for signing somebody *else* up.
 *
 * `auth.signUp` returns a session, and the ordinary client would write that
 * session straight into the response cookies — an admin adding a member would
 * be logged out and logged back in as the new member. Dropping the cookies on
 * the floor is the whole point. It carries no extra privilege: this is the
 * same publishable key and the same signUp the public /signup page uses.
 */
export function createSignupClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}
