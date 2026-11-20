import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Full-access Supabase client for the scheduled automation (no one is logged in
 * when Vercel's cron runs). Uses SUPABASE_SERVICE_ROLE_KEY, which must never be
 * exposed to the browser: no NEXT_PUBLIC_ prefix, and only import this file from
 * server-only code (route handlers / server actions).
 */
export function hasServiceKey() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  return createClient(env().url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
