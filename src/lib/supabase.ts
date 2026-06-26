import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "./env";

export const FILINGS_BUCKET = "filings";

let serviceClient: SupabaseClient | null = null;

/**
 * Server-only client using the service role key. Used for signed upload URLs,
 * downloading filings, and calling the match_chunks RPC. NEVER expose to client.
 */
export function getSupabaseService(): SupabaseClient {
  if (serviceClient) return serviceClient;
  const env = getEnv();
  serviceClient = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return serviceClient;
}
