import { getPublicProfile } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

/**
 * Free Supabase projects pause after ~7 days without activity — which would
 * break every card. vercel.json calls this once a day to keep the database awake.
 */
export async function GET() {
  const started = Date.now();
  await getPublicProfile("keepalive-ping");
  return Response.json({ ok: true, ms: Date.now() - started });
}
