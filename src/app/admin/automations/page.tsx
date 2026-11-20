import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { DISCOVERY_AREAS, EMAIL_KINDS, LEAD_CATEGORIES } from "@/lib/constants";
import { computeAlerts } from "@/lib/automation/alerts";
import { discoveryProvider, osmSupports, SEARCHABLE_AREAS } from "@/lib/automation/discovery";
import { alertEmail, getSettings } from "@/lib/automation/settings";
import { emailConfigured, emailFrom } from "@/lib/email/send";
import { hasServiceKey } from "@/lib/supabase/service";
import type { AutomationRun, EmailLog } from "@/lib/types";
import { Badge, Checkbox, Empty, Field, PageHeader, Select } from "@/components/admin/fields";
import { AlertList } from "@/components/admin/alerts";
import { Flash } from "@/components/admin/flash";
import { SubmitButton } from "@/components/admin/ui";
import { runDailyNow, runDiscoveryNow, saveAutomationSettings, sendTestEmail } from "./actions";

export const metadata = { title: "Automations" };
export const maxDuration = 60; // "Run now" can search a few areas

type SP = Promise<{ msg?: string; err?: string }>;

function when(ts: string) {
  return new Date(ts).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" });
}

function Status({ ok, children, hint }: { ok: boolean | "partial"; children: React.ReactNode; hint?: React.ReactNode }) {
  const color = ok === true ? "bg-emerald-500" : ok === "partial" ? "bg-amber-500" : "bg-slate-300";
  return (
    <li className="flex gap-3 py-2.5">
      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${color}`} aria-hidden="true" />
      <div className="min-w-0 text-sm">
        <div className="font-medium text-ink">{children}</div>
        {hint && <div className="mt-0.5 text-xs text-ink-weak">{hint}</div>}
      </div>
    </li>
  );
}

export default async function AutomationsPage({ searchParams }: { searchParams: SP }) {
  const { msg, err } = await searchParams;
  const { supabase: db } = await requireAdmin();
  const { settings: s, ready } = await getSettings(db);

  const [alerts, runsQ, emailsQ] = await Promise.all([
    computeAlerts(db),
    db.from("automation_runs").select("*").order("started_at", { ascending: false }).limit(10),
    db.from("email_log").select("*").order("created_at", { ascending: false }).limit(15),
  ]);
  const runs = (runsQ.data ?? []) as AutomationRun[];
  const emails = (emailsQ.data ?? []) as EmailLog[];

  const provider = discoveryProvider();
  const to = alertEmail(s);
  const scheduled = hasServiceKey() && Boolean(process.env.CRON_SECRET);
  const lastCron = runs.find((r) => r.trigger === "cron");

  return (
    <div className="space-y-6">
      <PageHeader title="Automations" subtitle="Finds new businesses, emails your customers, and tells you what needs attention. Runs every morning at 8:00.">
        <form action={sendTestEmail}>
          <SubmitButton className="btn btn-ghost" pendingText="Sending…">Send test email</SubmitButton>
        </form>
        <form action={runDailyNow}>
          <SubmitButton className="btn btn-primary" pendingText="Running…">Run daily automation now</SubmitButton>
        </form>
      </PageHeader>

      <Flash msg={msg} err={err} />

      {!ready && (
        <div className="card space-y-2 ring-2 ring-amber-300">
          <h2 className="font-semibold">One step left: create the automation tables</h2>
          <p className="text-sm text-ink-weak">
            In Supabase, open <b>SQL Editor → New query</b>, paste everything in <code className="rounded bg-surface-3 px-1.5">supabase/automations.sql</code>, and click <b>Run</b>. Then refresh this page.
          </p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-3">
          {/* Lead finder */}
          <form action={runDiscoveryNow} className="card space-y-4">
            <div>
              <h2 className="font-semibold">Find businesses now</h2>
              <p className="mt-1 text-sm text-ink-weak">
                Searches {provider === "google" ? "Google Maps" : "OpenStreetMap"} and adds the businesses you don&apos;t have yet to{" "}
                <Link href="/admin/leads?status=new" className="font-medium text-sky-700 hover:underline">Leads</Link>.
                {provider === "google" ? " Businesses with few Google reviews are marked Tier A, so start with those." : " Add a Google Places key to get review counts and automatic tiers."}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <Select label="Area" name="area" options={SEARCHABLE_AREAS} />
              <Select label="Category" name="category" options={LEAD_CATEGORIES.filter((c) => provider === "google" || osmSupports(c))} />
              <Field label="Keyword (optional)" name="keyword" placeholder="milk tea, dental…" />
              <Select label="Up to" name="limit" options={["10", "20"]} defaultValue="20" />
            </div>
            <SubmitButton pendingText="Searching…">Search and add leads</SubmitButton>
          </form>

          {/* Settings */}
          <form action={saveAutomationSettings} className="card space-y-5">
            <h2 className="font-semibold">Settings</h2>

            <fieldset className="space-y-2.5">
              <legend className="label">Emails to customers</legend>
              <Checkbox name="welcome_enabled" label="Welcome email when you add a customer with an email" defaultChecked={s.welcome_enabled} />
              <Checkbox name="order_emails_enabled" label="Order updates: received, proof ready, ready, completed" defaultChecked={s.order_emails_enabled} />
              <Checkbox name="concern_autoreply_enabled" label="Auto-reply when someone sends a concern on /support" defaultChecked={s.concern_autoreply_enabled} />
            </fieldset>

            <fieldset className="space-y-2.5 border-t border-line pt-4">
              <legend className="label">Alerts to you</legend>
              <Checkbox name="digest_enabled" label="Daily digest email (only sent when something needs attention)" defaultChecked={s.digest_enabled} />
              <Field label="Alert email" name="alert_email" type="email" defaultValue={s.alert_email} placeholder={process.env.ADMIN_ALERT_EMAIL || "you@example.com"} hint="New concerns and the daily digest go here." />
            </fieldset>

            <fieldset className="space-y-3 border-t border-line pt-4">
              <legend className="label">Daily lead finder</legend>
              <Checkbox name="discovery_enabled" label="Search for new businesses every morning" defaultChecked={s.discovery_enabled} />
              <div>
                <p className="mb-1.5 text-xs font-semibold text-ink-weak">Areas</p>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {SEARCHABLE_AREAS.map((a) => (
                    <label key={a} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                      <input type="checkbox" name="discovery_areas" value={a} defaultChecked={s.discovery_areas.includes(a)} className="h-4 w-4 rounded accent-sky-600" />
                      {a}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-ink-weak">Categories</p>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {LEAD_CATEGORIES.filter((c) => c !== "Other").map((c) => (
                    <label key={c} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                      <input type="checkbox" name="discovery_categories" value={c} defaultChecked={s.discovery_categories.includes(c)} className="h-4 w-4 rounded accent-sky-600" />
                      {c}
                      {provider === "osm" && !osmSupports(c) && <span className="text-xs text-ink-faint">(Google only)</span>}
                    </label>
                  ))}
                </div>
              </div>
              <Select
                label="Searches per morning"
                name="discovery_searches_per_run"
                options={["1", "2", "3", "4", "5", "6", "8", "10"]}
                defaultValue={String(s.discovery_searches_per_run)}
                hint={`Each search is one area + one category, taken in turn so all ${s.discovery_areas.length * s.discovery_categories.length || "the"} combinations get covered.${provider === "google" ? " 3 a day stays well inside Google's free monthly allowance." : ""}`}
                className="max-w-xs"
              />
            </fieldset>

            <SubmitButton>Save settings</SubmitButton>
          </form>
        </div>

        <div className="space-y-6 xl:col-span-2">
          <section className="card">
            <h2 className="mb-2 font-semibold">Connections</h2>
            <ul className="divide-y divide-line">
              <Status ok={emailConfigured()} hint={emailConfigured() ? `Sending as ${emailFrom()}` : "Add RESEND_API_KEY to send emails. See README → Automations."}>
                Email {emailConfigured() ? "is on" : "is off"}
              </Status>
              <Status ok={Boolean(to)} hint={to ?? "Set an alert email in Settings, or ADMIN_ALERT_EMAIL."}>
                Alerts go to {to ? "your inbox" : "nobody yet"}
              </Status>
              <Status ok={provider === "google" ? true : "partial"} hint={provider === "google" ? "Google Places: includes review counts and tiers." : "OpenStreetMap (free). Add GOOGLE_PLACES_API_KEY for review counts and more results."}>
                Lead finder uses {provider === "google" ? "Google Maps" : "OpenStreetMap"}
              </Status>
              <Status
                ok={scheduled ? (lastCron ? true : "partial") : false}
                hint={
                  scheduled
                    ? lastCron
                      ? `Last scheduled run: ${when(lastCron.started_at)}`
                      : "Set up. The first run will happen tomorrow at 8:00 AM."
                    : "Add CRON_SECRET and SUPABASE_SERVICE_ROLE_KEY in Vercel. Until then, use “Run daily automation now”."
                }
              >
                Morning schedule {scheduled ? "is on" : "is off"}
              </Status>
            </ul>
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold">Needs attention</h2>
            <AlertList alerts={alerts} />
          </section>

          <section className="card">
            <h2 className="mb-3 font-semibold">Recent runs</h2>
            {runs.length ? (
              <ul className="divide-y divide-line">
                {runs.map((r) => (
                  <li key={r.id} className="py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge value={r.status === "ok" ? "completed" : r.status === "partial" ? "partial" : "cancelled"} label={r.status === "ok" ? "OK" : r.status === "partial" ? "Partly" : "Failed"} />
                      <span className="font-medium capitalize">{r.kind === "daily" ? "Daily run" : "Lead search"}</span>
                      <span className="ml-auto text-xs text-ink-faint">{r.trigger === "cron" ? "scheduled" : "manual"} · {when(r.started_at)}</span>
                    </div>
                    {r.summary && <p className="mt-1 text-xs text-ink-weak">{r.summary}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No runs yet.</Empty>
            )}
          </section>

          <section className="card">
            <h2 className="mb-3 font-semibold">Recent emails</h2>
            {emails.length ? (
              <ul className="divide-y divide-line">
                {emails.map((e) => (
                  <li key={e.id} className="py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge value={e.status === "sent" ? "paid" : e.status === "failed" ? "unpaid" : "pending"} label={e.status} />
                      <span className="truncate font-medium">{EMAIL_KINDS[e.kind] ?? e.kind}</span>
                      <span className="ml-auto shrink-0 text-xs text-ink-faint">{when(e.created_at)}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-ink-weak">To {e.to_email}: {e.subject}</p>
                    {e.error && <p className="mt-0.5 text-xs text-red-600">{e.error}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No emails sent yet.</Empty>
            )}
          </section>
        </div>
      </div>

      <p className="text-xs text-ink-faint">
        Searchable areas are set in <code>DISCOVERY_AREAS</code> in <code>src/lib/constants.ts</code> ({Object.keys(DISCOVERY_AREAS).join(", ")}).
      </p>
    </div>
  );
}
