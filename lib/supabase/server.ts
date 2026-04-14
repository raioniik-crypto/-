import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a stub that always returns null user (allows build without env vars)
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        exchangeCodeForSession: async () => ({ data: { session: null }, error: null }),
      },
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }), insert: async () => ({ error: null }), update: () => ({ eq: async () => ({ error: null }) }) }),
      rpc: async () => ({ data: null, error: null }),
    } as unknown as ReturnType<typeof createServerClient>;
  }

  const cookieStore = cookies();

  return createServerClient(
    url,
    key,
    {
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
            // Ignore in Server Components (read-only)
          }
        },
      },
    }
  );
}

/**
 * Service role client for server-side operations that bypass RLS
 */
export function createServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return createServerSupabase(); // falls back to stub
  }

  return createServerClient(
    url,
    serviceKey,
    {
      cookies: {
        getAll() { return []; },
        setAll() { /* noop for service role */ },
      },
    }
  );
}
