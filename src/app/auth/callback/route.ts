import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase sends people here from the "confirm your email" link.
 * We swap the one-time code for a login session, then send them back to their card.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/me";
  const next = /^\/(me|c\/[A-Za-z0-9]{4,16})(\/|\?|$)/.test(nextRaw) ? nextRaw : "/me";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/me/login?error=${encodeURIComponent("That link has expired. Log in to continue.")}`);
}
