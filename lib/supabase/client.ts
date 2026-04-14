import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a dummy client that always returns null user
    // This allows the app to work without Supabase configured
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signUp: async () => ({ data: { user: null }, error: new Error("Supabase not configured") }),
        signInWithPassword: async () => ({ data: { user: null }, error: new Error("Supabase not configured") }),
        signOut: async () => ({ error: null }),
      },
    } as ReturnType<typeof createBrowserClient>;
  }

  return createBrowserClient(url, key);
}
