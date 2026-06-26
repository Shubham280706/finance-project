import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Browser Supabase client using the public anon key. Lazily created on first
 * use (not at import) so prerender/build never evaluates it without env. Used
 * only to upload a file to a signed upload URL — no secrets are exposed.
 */
export function getSupabaseBrowser(): SupabaseClient {
  if (client) return client;
  client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  return client;
}
