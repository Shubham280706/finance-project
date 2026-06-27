import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

/**
 * Email-verification landing route. Supabase sends the confirmation link here
 * after sign-up. We exchange the one-time code (PKCE) — or verify the legacy
 * token hash — for a real session, set the auth cookies, then redirect the user
 * into the app. On failure we bounce back to the sign-in screen with a flag.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = await createServerSupabase();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "email" | "signup" | "recovery" | "invite" | "magiclink",
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${origin}/`);
  }

  return NextResponse.redirect(`${origin}/?verified=failed`);
}
