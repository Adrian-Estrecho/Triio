import { fmtDate, peso, todayISO } from "@/lib/utils";
import type { Db } from "./db";

export type Alert = {
  id: string;
  level: "urgent" | "warning" | "info";
  title: string;
  detail?: string;
  href?: string;
  items?: { label: string; href: string; meta?: string }[];
};

const DAY = 864e5;
const ACTIVE_STAGES = ["new", "awaiting_payment", "designing", "for_approval", "production", "quality_check", "ready"];
const WORK_STAGES = ["designing", "for_approval", "production", "quality_check"];

type OrderRow = {
  id: string;
  order_no: number;
  status: string;
  due_date: string | null;
  total: number;
  amount_paid: number;
  updated_at: string;
  customers: { business_name: string } | null;
};

/**
 * Everything that needs your attention right now, most urgent first.
 * Used by the dashboard and the daily digest email. Missing tables (before
 * automations.sql is run) are simply skipped.
 */
export async function computeAlerts(db: Db): Promise<Alert[]> {
  const today = todayISO();
  const now = Date.now();
  const in2days = new Date(now + 2 * DAY).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  const since30 = new Date(now - 30 * DAY).toISOString();

  const [leadsQ, ordersQ, concernsQ, cardsQ, tapsQ, runsQ] = await Promise.all([
    db.from("leads").select("*"),
    db.from("orders").select("id, order_no, status, due_date, total, amount_paid, updated_at, customers(business_name)").neq("status", "cancelled"),
    db.from("concerns").select("id, ticket_no, name, email, business_name, status, created_at, first_reply_at").neq("status", "resolved"),
    db.from("nfc_cards").select("id, card_code, label, updated_at, customers(business_name)").eq("status", "delivered"),
    db.from("card_taps").select("card_id").gte("created_at", since30),
    db.from("automation_runs").select("id, kind, status, summary, started_at").order("started_at", { ascending: false }).limit(1),
  ]);

  const alerts: Alert[] = [];
  const leads = (leadsQ.data ?? []) as { id: string; business_name: string; status: string; next_follow_up: string | null; area: string | null; source?: string; created_at: string; tier: string | null; review_count?: number | null }[];
  const orders = (ordersQ.data ?? []) as unknown as OrderRow[];
  const orderName = (o: OrderRow) => `#${o.order_no} · ${o.customers?.business_name ?? "No customer"}`;

  /* ---------- Concerns ---------- */
  const concerns = (concernsQ.data ?? []) as { id: string; ticket_no: number; name: string | null; email: string; business_name: string | null; status: string; created_at: string; first_reply_at: string | null }[];
  const unanswered = concerns.filter((c) => c.status === "open" && !c.first_reply_at);
  const late = unanswered.filter((c) => now - new Date(c.created_at).getTime() > DAY);
  const fresh = unanswered.filter((c) => now - new Date(c.created_at).getTime() <= DAY);
  const concernItem = (c: (typeof concerns)[number]) => ({ label: `#${c.ticket_no} · ${c.business_name || c.name || c.email}`, href: `/admin/concerns/${c.id}`, meta: fmtDate(c.created_at) });
  if (late.length) alerts.push({ id: "concerns-late", level: "urgent", title: `${late.length} concern${late.length > 1 ? "s" : ""} waiting over a day for a reply`, href: "/admin/concerns", items: late.map(concernItem) });
  if (fresh.length) alerts.push({ id: "concerns-new", level: "warning", title: `${fresh.length} new concern${fresh.length > 1 ? "s" : ""} to answer`, href: "/admin/concerns", items: fresh.map(concernItem) });

  /* ---------- Orders ---------- */
  // Includes orders placed on the website (/order): message them to confirm, then move them on.
  const toConfirm = orders.filter((o) => o.status === "new");
  if (toConfirm.length)
    alerts.push({ id: "orders-new", level: "warning", title: `${toConfirm.length} new order${toConfirm.length > 1 ? "s" : ""} to confirm`, detail: "Message the customer, send payment details, then move it to Awaiting payment.", href: "/admin/orders?status=new", items: toConfirm.map((o) => ({ label: orderName(o), href: `/admin/orders/${o.id}`, meta: peso(o.total) })) });

  const active = orders.filter((o) => ACTIVE_STAGES.includes(o.status));
  const overdue = active.filter((o) => o.due_date && o.due_date < today);
  if (overdue.length)
    alerts.push({ id: "orders-overdue", level: "urgent", title: `${overdue.length} order${overdue.length > 1 ? "s are" : " is"} past the due date`, href: "/admin/orders", items: overdue.map((o) => ({ label: orderName(o), href: `/admin/orders/${o.id}`, meta: `due ${fmtDate(o.due_date)}` })) });

  const dueSoon = active.filter((o) => o.due_date && o.due_date >= today && o.due_date <= in2days && o.status !== "ready");
  if (dueSoon.length)
    alerts.push({ id: "orders-due-soon", level: "warning", title: `${dueSoon.length} order${dueSoon.length > 1 ? "s" : ""} due in the next 2 days and not ready yet`, href: "/admin/orders", items: dueSoon.map((o) => ({ label: orderName(o), href: `/admin/orders/${o.id}`, meta: `due ${fmtDate(o.due_date)}` })) });

  const stuck = orders.filter((o) => WORK_STAGES.includes(o.status) && now - new Date(o.updated_at).getTime() > 5 * DAY);
  if (stuck.length)
    alerts.push({ id: "orders-stuck", level: "warning", title: `${stuck.length} order${stuck.length > 1 ? "s haven't" : " hasn't"} moved in 5+ days`, href: "/admin/orders", items: stuck.map((o) => ({ label: orderName(o), href: `/admin/orders/${o.id}`, meta: o.status.replace(/_/g, " ") })) });

  const owing = orders.filter((o) => ["ready", "completed"].includes(o.status) && Number(o.total) - Number(o.amount_paid) > 0);
  if (owing.length) {
    const sum = owing.reduce((s, o) => s + Number(o.total) - Number(o.amount_paid), 0);
    alerts.push({ id: "orders-unpaid", level: "warning", title: `${peso(sum)} unpaid on ${owing.length} finished order${owing.length > 1 ? "s" : ""}`, href: "/admin/orders", items: owing.map((o) => ({ label: orderName(o), href: `/admin/orders/${o.id}`, meta: `${peso(Number(o.total) - Number(o.amount_paid))} left` })) });
  }

  /* ---------- Leads ---------- */
  const open = leads.filter((l) => !["won", "lost"].includes(l.status));
  const overdueFu = open.filter((l) => l.next_follow_up && l.next_follow_up < today);
  const todayFu = open.filter((l) => l.next_follow_up === today);
  const leadItem = (l: (typeof leads)[number], meta?: string) => ({ label: l.business_name, href: `/admin/leads/${l.id}`, meta: meta ?? l.area ?? undefined });
  if (overdueFu.length) alerts.push({ id: "followups-overdue", level: "warning", title: `${overdueFu.length} overdue follow-up${overdueFu.length > 1 ? "s" : ""}`, href: "/admin/leads", items: overdueFu.map((l) => leadItem(l, `was due ${fmtDate(l.next_follow_up)}`)) });
  if (todayFu.length) alerts.push({ id: "followups-today", level: "info", title: `${todayFu.length} follow-up${todayFu.length > 1 ? "s" : ""} due today`, href: "/admin/leads", items: todayFu.map((l) => leadItem(l)) });

  const hot = open.filter((l) => ["interested", "demo"].includes(l.status) && !l.next_follow_up);
  if (hot.length) alerts.push({ id: "hot-leads", level: "warning", title: `${hot.length} interested lead${hot.length > 1 ? "s have" : " has"} no next step`, detail: "Set a follow-up date so they don't go cold.", href: "/admin/leads?status=interested", items: hot.map((l) => leadItem(l)) });

  const found = leads.filter((l) => l.source && l.source !== "manual" && now - new Date(l.created_at).getTime() <= DAY);
  if (found.length) {
    const tierA = found.filter((l) => l.tier === "A").length;
    alerts.push({ id: "leads-found", level: "info", title: `${found.length} new lead${found.length > 1 ? "s" : ""} found automatically`, detail: tierA ? `${tierA} are Tier A (few reviews), so start with those.` : undefined, href: "/admin/leads?status=new", items: found.map((l) => leadItem(l, [l.area, l.review_count != null ? `${l.review_count} reviews` : null].filter(Boolean).join(" · "))) });
  }

  /* ---------- Cards ---------- */
  if (!cardsQ.error && !tapsQ.error) {
    const tapped = new Set((tapsQ.data ?? []).map((t) => t.card_id));
    const idle = ((cardsQ.data ?? []) as unknown as { id: string; card_code: string; label: string | null; updated_at: string; customers: { business_name: string } | null }[]).filter(
      (c) => !tapped.has(c.id) && now - new Date(c.updated_at).getTime() > 14 * DAY
    );
    if (idle.length)
      alerts.push({ id: "cards-idle", level: "info", title: `${idle.length} delivered card${idle.length > 1 ? "s have" : " has"} had no taps in 30 days`, detail: "Check in with the customer. The card may be hidden or not working.", href: "/admin/cards", items: idle.map((c) => ({ label: `${c.card_code} · ${c.customers?.business_name ?? "No customer"}`, href: `/admin/cards/${c.id}`, meta: c.label ?? undefined })) });
  }

  /* ---------- Automation health ---------- */
  const lastRun = runsQ.data?.[0] as { status: string; summary: string | null; started_at: string } | undefined;
  if (lastRun?.status === "error") alerts.push({ id: "automation-error", level: "warning", title: "The last automation run failed", detail: lastRun.summary ?? undefined, href: "/admin/automations" });

  const rank = { urgent: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => rank[a.level] - rank[b.level]);
}
