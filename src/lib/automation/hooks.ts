import "server-only";
import { ORDER_EMAIL_STATUSES } from "@/lib/constants";
import { alreadySent, deliver, emailConfigured } from "@/lib/email/send";
import { orderEmail, welcomeEmail } from "@/lib/email/templates";
import type { Db } from "./db";
import { getSettings } from "./settings";

/**
 * Emails triggered by something you do in the admin (adding a customer, moving
 * an order). They never throw, so a failed email never blocks a save.
 */

/** Sends the welcome email once per customer, if they have an email and welcome emails are on. */
export async function maybeSendWelcome(db: Db, customerId: string, opts: { force?: boolean } = {}) {
  try {
    if (!emailConfigured()) return { sent: false, reason: "Email isn't set up yet." };
    const { settings, ready } = await getSettings(db);
    if (!ready) return { sent: false, reason: "Run supabase/automations.sql first." };
    if (!settings.welcome_enabled && !opts.force) return { sent: false, reason: "Welcome emails are off." };

    const { data: c } = await db.from("customers").select("id, business_name, contact_person, email, welcome_sent_at, created_at").eq("id", customerId).maybeSingle();
    if (!c?.email) return { sent: false, reason: "This customer has no email address." };
    if (!opts.force) {
      if (c.welcome_sent_at) return { sent: false, reason: "Already welcomed." };
      // Only new customers get it automatically, so turning this on doesn't email everyone you've ever sold to.
      if (Date.now() - new Date(c.created_at).getTime() > 14 * 864e5) return { sent: false, reason: "Customer is older than 14 days. Use the button to send it." };
    }

    const r = await deliver(db, "welcome", { to: c.email, ...welcomeEmail(c) }, { relatedId: c.id });
    if (r.ok) await db.from("customers").update({ welcome_sent_at: new Date().toISOString() }).eq("id", c.id);
    return { sent: r.ok, reason: r.ok ? null : r.error };
  } catch (e) {
    console.error("welcome email", e);
    return { sent: false, reason: "Something went wrong sending the email." };
  }
}

/** Tells the customer about their order at key stages (received, proof ready, ready, completed). Each stage is sent once. */
export async function maybeSendOrderUpdate(db: Db, orderId: string, status: string) {
  try {
    if (!(ORDER_EMAIL_STATUSES as readonly string[]).includes(status) || !emailConfigured()) return;
    const { settings, ready } = await getSettings(db);
    if (!ready || !settings.order_emails_enabled) return;

    const kind = `order_${status}`;
    if (await alreadySent(db, kind, orderId)) return;

    const { data: o } = await db
      .from("orders")
      .select("id, order_no, product, quantity, total, amount_paid, due_date, customers(business_name, contact_person, email)")
      .eq("id", orderId)
      .maybeSingle();
    const customer = o?.customers as unknown as { business_name: string; contact_person: string | null; email: string | null } | null;
    if (!o || !customer?.email) return;

    const msg = orderEmail(status, o, customer);
    if (msg) await deliver(db, kind, { to: customer.email, ...msg }, { relatedId: o.id });
  } catch (e) {
    console.error("order email", e);
  }
}
