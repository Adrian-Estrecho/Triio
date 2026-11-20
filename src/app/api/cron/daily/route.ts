import { runDaily } from "@/lib/automation/daily";
import { hasServiceKey, serviceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Called once a day by Vercel Cron (see vercel.json). Vercel sends
 * "Authorization: Bearer <CRON_SECRET>" automatically when CRON_SECRET is set,
 * so nobody else can trigger it.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasServiceKey()) {
    return Response.json({ ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not set, so the scheduled run can't read the database." }, { status: 500 });
  }

  const result = await runDaily(serviceClient(), "cron");
  return Response.json(result, { status: result.ok ? 200 : 500 });
}
