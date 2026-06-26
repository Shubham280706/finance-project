import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Browser Supabase client (anon key). Created lazily so prerender/build never
 * evaluates it without env. Cookie-aware via @supabase/ssr, so the server side
 * sees the same session. Used for auth and signed-URL uploads — no secrets.
 */
export function getSupabaseBrowser(): SupabaseClient {
  if (client) return client;
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return client;
}
