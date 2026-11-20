"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, check } from "@/lib/admin";
import { LEAD_CATEGORIES } from "@/lib/constants";
import { runDaily } from "@/lib/automation/daily";
import { discoverLeads, SEARCHABLE_AREAS } from "@/lib/automation/discovery";
import { maybeSendWelcome } from "@/lib/automation/hooks";
import { alertEmail, getSettings } from "@/lib/automation/settings";
import { deliver } from "@/lib/email/send";
import { concernReplyEmail, testEmail } from "@/lib/email/templates";
import { num, str } from "@/lib/utils";

async function admin() {
  const ctx = await requireAdmin();
  if (!ctx.isAdmin) throw new Error("Only admins can do this.");
  return ctx.supabase;
}

function back(path: string, kind: "msg" | "err", text: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(text.slice(0, 300))}`);
}

/* ============================== SETTINGS ============================== */

export async function saveAutomationSettings(f: FormData) {
  const db = await admin();
  const alert = str(f.get("alert_email"));
  if (alert && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(alert)) back("/admin/automations", "err", "That alert email doesn't look right.");

  const areas = f.getAll("discovery_areas").map(String).filter((a) => SEARCHABLE_AREAS.includes(a));
  const categories = f.getAll("discovery_categories").map(String).filter((c) => (LEAD_CATEGORIES as readonly string[]).includes(c));
  const perRun = Math.min(Math.max(Math.round(num(f.get("discovery_searches_per_run"), 3) ?? 3), 1), 10);

  check(
    await db
      .from("automation_settings")
      .upsert({
        id: 1,
        alert_email: alert,
        digest_enabled: f.get("digest_enabled") === "on",
        welcome_enabled: f.get("welcome_enabled") === "on",
        order_emails_enabled: f.get("order_emails_enabled") === "on",
        concern_autoreply_enabled: f.get("concern_autoreply_enabled") === "on",
        discovery_enabled: f.get("discovery_enabled") === "on",
        discovery_areas: areas,
        discovery_categories: categories,
        discovery_searches_per_run: perRun,
        updated_at: new Date().toISOString(),
      }),
    "Save settings"
  );
  revalidatePath("/admin/automations");
  back("/admin/automations", "msg", "Settings saved.");
}

/* ============================== RUN NOW ============================== */

export async function runDiscoveryNow(f: FormData) {
  const db = await admin();
  const area = str(f.get("area")) ?? SEARCHABLE_AREAS[0];
  const category = str(f.get("category")) ?? "Cafe";
  const keyword = str(f.get("keyword"));
  const startedAt = new Date().toISOString();

  const r = await discoverLeads(db, { area, category, keyword, limit: num(f.get("limit"), 20) ?? 20 });
  const summary = r.error ? r.error : `${r.query}: found ${r.found}, added ${r.added} new, skipped ${r.skipped} you already have`;
  await db.from("automation_runs").insert({
    kind: "discovery",
    trigger: "manual",
    status: r.error ? (r.added ? "partial" : "error") : "ok",
    summary,
    details: r,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
  });

  revalidatePath("/admin/leads");
  revalidatePath("/admin/automations");
  if (r.error && !r.added) back("/admin/automations", "err", r.error);
  back("/admin/automations", "msg", r.added ? `Added ${r.added} new lead${r.added === 1 ? "" : "s"}: ${r.names.slice(0, 6).join(", ")}${r.names.length > 6 ? "…" : ""}` : `No new businesses: found ${r.found}, and you already have them all.`);
}

export async function runDailyNow() {
  const db = await admin();
  const r = await runDaily(db, "manual");
  revalidatePath("/admin/automations");
  revalidatePath("/admin");
  back("/admin/automations", r.ok ? "msg" : "err", r.errors.length ? `${r.summary}. ${r.errors[0]}` : `Done: ${r.summary}.`);
}

export async function sendTestEmail() {
  const db = await admin();
  const { settings } = await getSettings(db);
  const to = alertEmail(settings);
  if (!to) back("/admin/automations", "err", "Add an alert email first (in settings below), then send the test.");
  const r = await deliver(db, "test", { to, ...testEmail() });
  revalidatePath("/admin/automations");
  back("/admin/automations", r.ok ? "msg" : "err", r.ok ? `Test email sent to ${to}. Check your inbox (and spam folder).` : r.error);
}

/* ============================== CUSTOMERS ============================== */

export async function sendWelcomeNow(f: FormData) {
  const db = await admin();
  const customerId = str(f.get("id"));
  if (!customerId) throw new Error("Missing id");
  const r = await maybeSendWelcome(db, customerId, { force: true });
  revalidatePath(`/admin/customers/${customerId}`);
  back(`/admin/customers/${customerId}`, r.sent ? "msg" : "err", r.sent ? "Welcome email sent." : r.reason ?? "Couldn't send.");
}

/* ============================== CONCERNS ============================== */

export async function replyToConcern(f: FormData) {
  const db = await admin();
  const id = str(f.get("id"));
  const message = str(f.get("message"));
  if (!id) throw new Error("Missing id");
  const path = `/admin/concerns/${id}`;
  if (!message) back(path, "err", "Write a reply first.");

  const { data: c } = await db.from("concerns").select("id, ticket_no, email, first_reply_at").eq("id", id).maybeSingle();
  if (!c) back("/admin/concerns", "err", "Concern not found.");

  const resolve = f.get("resolve") === "on";
  const r = await deliver(db, "concern_reply", { to: c.email, ...concernReplyEmail(c.ticket_no, message, resolve) }, { relatedId: c.id, keepBody: message });
  if (!r.ok) back(path, "err", `Reply not sent: ${r.error}`);

  const now = new Date().toISOString();
  await db
    .from("concerns")
    .update({ status: resolve ? "resolved" : "in_progress", first_reply_at: c.first_reply_at ?? now, ...(resolve ? { resolved_at: now } : {}) })
    .eq("id", id);
  revalidatePath(path);
  revalidatePath("/admin/concerns");
  back(path, "msg", resolve ? "Reply sent and concern resolved." : "Reply sent.");
}

export async function setConcernStatus(f: FormData) {
  const db = await admin();
  const id = str(f.get("id"));
  const status = str(f.get("status"));
  if (!id || !status || !["open", "in_progress", "resolved"].includes(status)) throw new Error("Bad request");
  check(await db.from("concerns").update({ status, resolved_at: status === "resolved" ? new Date().toISOString() : null }).eq("id", id), "Update concern");
  revalidatePath(`/admin/concerns/${id}`);
  revalidatePath("/admin/concerns");
}

export async function saveConcernNotes(f: FormData) {
  const db = await admin();
  const id = str(f.get("id"));
  if (!id) throw new Error("Missing id");
  check(await db.from("concerns").update({ admin_notes: str(f.get("admin_notes")), customer_id: str(f.get("customer_id")) }).eq("id", id), "Save notes");
  revalidatePath(`/admin/concerns/${id}`);
}

export async function deleteConcern(f: FormData) {
  const db = await admin();
  const id = str(f.get("id"));
  if (!id) throw new Error("Missing id");
  check(await db.from("concerns").delete().eq("id", id), "Delete concern");
  revalidatePath("/admin/concerns");
  redirect("/admin/concerns");
}
