"use server";

import { after } from "next/server";
import { CONCERN_TOPICS } from "@/lib/constants";
import { alertEmail, getSettings } from "@/lib/automation/settings";
import { deliver } from "@/lib/email/send";
import { concernAlertEmail, concernAutoReply } from "@/lib/email/templates";
import { submitConcernRpc } from "@/lib/supabase/public";
import { hasServiceKey, serviceClient } from "@/lib/supabase/service";
import { str } from "@/lib/utils";

export type ConcernState = { ok: boolean; ticket?: number; error?: string } | null;

export async function submitConcern(_prev: ConcernState, f: FormData): Promise<ConcernState> {
  // Honeypot: real people never see or fill this field.
  if (str(f.get("hp_extra"))) return { ok: true, ticket: 0 };

  const email = str(f.get("email"));
  const message = str(f.get("message"));
  if (!email) return { ok: false, error: "Please enter your email so we can reply." };
  if (!message) return { ok: false, error: "Please tell us what's going on." };

  const topic = str(f.get("topic")) ?? "general";
  const input = {
    name: str(f.get("name")),
    email,
    phone: str(f.get("phone")),
    business: str(f.get("business_name")),
    topic: CONCERN_TOPICS.some((t) => t.value === topic) ? topic : "general",
    cardCode: str(f.get("card_code")),
    message,
  };

  const r = await submitConcernRpc(input);
  if (!r.ok) return { ok: false, error: r.error };

  // Emails go out after the page has already answered, so the form feels instant.
  after(async () => {
    const db = hasServiceKey() ? serviceClient() : null; // without the service key, emails still send but aren't logged
    const to = db ? alertEmail((await getSettings(db)).settings) : process.env.ADMIN_ALERT_EMAIL || null;

    if (r.autoreply) {
      await deliver(db, "concern_autoreply", { to: input.email, ...concernAutoReply(r.ticket_no) }, { relatedId: r.id });
    }
    if (to) {
      const alert = concernAlertEmail({
        id: r.id,
        ticket_no: r.ticket_no,
        name: input.name,
        email: input.email,
        phone: input.phone,
        business_name: input.business,
        topic: input.topic,
        card_code: input.cardCode,
        message: input.message,
      });
      await deliver(db, "concern_alert", { to, replyTo: input.email, ...alert }, { relatedId: r.id });
    }
  });

  return { ok: true, ticket: r.ticket_no };
}
