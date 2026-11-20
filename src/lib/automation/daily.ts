import "server-only";
import { deliver, emailConfigured } from "@/lib/email/send";
import { digestEmail } from "@/lib/email/templates";
import { computeAlerts } from "./alerts";
import type { Db } from "./db";
import { runScheduledDiscovery, type DiscoveryResult } from "./discovery";
import { maybeSendWelcome } from "./hooks";
import { alertEmail, getSettings } from "./settings";

export type DailyResult = {
  ok: boolean;
  status: "ok" | "partial" | "error";
  summary: string;
  discovery: DiscoveryResult[];
  welcomes: number;
  alerts: number;
  digest: "sent" | "skipped" | "failed" | "off";
  errors: string[];
};

/**
 * The once-a-day job (Vercel cron → /api/cron/daily, or "Run now" in the admin):
 *  1. find new businesses (if the lead finder is on)
 *  2. send welcome emails that didn't go out (new customers from the last 14 days)
 *  3. check what needs attention and email you a digest
 * Every run is saved in automation_runs.
 */
export async function runDaily(db: Db, trigger: "cron" | "manual"): Promise<DailyResult> {
  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  const { settings, ready } = await getSettings(db);
  if (!ready) {
    return { ok: false, status: "error", summary: "Run supabase/automations.sql in Supabase first.", discovery: [], welcomes: 0, alerts: 0, digest: "off", errors: ["Automation tables are missing."] };
  }

  // 1. Lead finder
  let discovery: DiscoveryResult[] = [];
  if (settings.discovery_enabled) {
    try {
      const run = await runScheduledDiscovery(db, settings);
      discovery = run.results;
      await db.from("automation_settings").update({ discovery_cursor: run.nextCursor }).eq("id", 1);
      discovery.filter((d) => d.error).forEach((d) => errors.push(`${d.query}: ${d.error}`));
    } catch (e) {
      errors.push(`Lead finder: ${e instanceof Error ? e.message : e}`);
    }
  }
  const added = discovery.reduce((s, d) => s + d.added, 0);

  // 2. Welcome emails that were missed (e.g. email added later, or email was down)
  let welcomes = 0;
  if (settings.welcome_enabled && emailConfigured()) {
    const since = new Date(Date.now() - 14 * 864e5).toISOString();
    const { data: pending, error } = await db.from("customers").select("id").is("welcome_sent_at", null).not("email", "is", null).gte("created_at", since).limit(20);
    if (error) errors.push(`Welcome emails: ${error.message}`);
    for (const c of pending ?? []) {
      const r = await maybeSendWelcome(db, c.id);
      if (r.sent) welcomes++;
    }
  }

  // 3. Alerts + digest
  let alertsCount = 0;
  let digest: DailyResult["digest"] = "off";
  try {
    const alerts = await computeAlerts(db);
    alertsCount = alerts.length;
    const to = alertEmail(settings);
    if (settings.digest_enabled && to) {
      if (alerts.length || added) {
        const r = await deliver(db, "digest", { to, ...digestEmail(alerts, { added, names: discovery.flatMap((d) => d.names) }) });
        digest = r.ok ? "sent" : r.skipped ? "skipped" : "failed";
        if (!r.ok) errors.push(`Digest: ${r.error}`);
      } else digest = "skipped"; // nothing to report → no email
    }
  } catch (e) {
    errors.push(`Alerts: ${e instanceof Error ? e.message : e}`);
  }

  const parts = [
    settings.discovery_enabled ? `${added} new lead${added === 1 ? "" : "s"} found` : null,
    welcomes ? `${welcomes} welcome email${welcomes === 1 ? "" : "s"}` : null,
    `${alertsCount} alert${alertsCount === 1 ? "" : "s"}`,
    digest === "sent" ? "digest sent" : null,
  ].filter(Boolean);
  const status: DailyResult["status"] = errors.length ? (parts.length ? "partial" : "error") : "ok";
  const summary = parts.join(" · ") + (errors.length ? ` · ${errors.length} problem${errors.length === 1 ? "" : "s"}` : "");

  await db.from("automation_runs").insert({
    kind: "daily",
    trigger,
    status,
    summary,
    details: { discovery, welcomes, alerts: alertsCount, digest, errors },
    started_at: startedAt,
    finished_at: new Date().toISOString(),
  });

  return { ok: status !== "error", status, summary, discovery, welcomes, alerts: alertsCount, digest, errors };
}
