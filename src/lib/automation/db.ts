import type { SupabaseClient } from "@supabase/supabase-js";

/** Either the logged-in admin's client or the service client used by the cron job. */
export type Db = SupabaseClient;

/** True when a query failed because supabase/automations.sql hasn't been run yet. */
export function isMissingTable(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || error.code === "42703" || /does not exist|schema cache/i.test(error.message ?? "");
}
