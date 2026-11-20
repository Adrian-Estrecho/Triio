import type { AutomationSettings } from "@/lib/types";
import { isMissingTable, type Db } from "./db";

export const DEFAULT_SETTINGS: AutomationSettings = {
  id: 1,
  alert_email: null,
  digest_enabled: true,
  welcome_enabled: true,
  order_emails_enabled: true,
  concern_autoreply_enabled: true,
  discovery_enabled: false,
  discovery_areas: ["Marikina", "Antipolo", "Cubao / QC"],
  discovery_categories: ["Cafe", "Restaurant", "Barbershop", "Salon", "Clinic"],
  discovery_searches_per_run: 3,
  discovery_cursor: 0,
  updated_at: new Date(0).toISOString(),
};

/** Settings row, or defaults. `ready` is false until supabase/automations.sql has been run. */
export async function getSettings(db: Db): Promise<{ settings: AutomationSettings; ready: boolean }> {
  const { data, error } = await db.from("automation_settings").select("*").eq("id", 1).maybeSingle<AutomationSettings>();
  if (error) {
    if (!isMissingTable(error)) console.error("automation_settings", error.message);
    return { settings: DEFAULT_SETTINGS, ready: false };
  }
  return { settings: data ?? DEFAULT_SETTINGS, ready: true };
}

/** Where alerts go: the address saved in settings, else ADMIN_ALERT_EMAIL. */
export function alertEmail(settings: AutomationSettings) {
  return settings.alert_email || process.env.ADMIN_ALERT_EMAIL || null;
}
