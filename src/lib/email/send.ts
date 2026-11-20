import "server-only";
import type { Db } from "@/lib/automation/db";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
};

export type SendResult = { ok: true; id: string | null } | { ok: false; skipped?: boolean; error: string };

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export function emailFrom() {
  return process.env.EMAIL_FROM || "Triio <onboarding@resend.dev>";
}

/** Sends one email through Resend (https://resend.com). Never throws. */
export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true, error: "Email isn't set up (RESEND_API_KEY is missing)." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(msg.to)) return { ok: false, skipped: true, error: `Not a valid email: ${msg.to}` };

  const replyTo = msg.replyTo || process.env.EMAIL_REPLY_TO || undefined;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: emailFrom(),
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      signal: AbortSignal.timeout(15000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok) return { ok: false, error: body.message || body.name || `Resend error ${res.status}` };
    return { ok: true, id: body.id ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't reach the email service." };
  }
}

/**
 * Sends an email and records it in email_log. Never throws — a failed email
 * must not break saving an order or a customer. Pass db = null to skip the log
 * (public pages can't write to it without the service key).
 */
export async function deliver(
  db: Db | null,
  kind: string,
  msg: EmailMessage,
  opts: { relatedId?: string | null; keepBody?: string | null } = {}
): Promise<SendResult> {
  const result = await sendEmail(msg);
  if (db) {
    const { error } = await db.from("email_log").insert({
      kind,
      to_email: msg.to,
      subject: msg.subject,
      status: result.ok ? "sent" : result.skipped ? "skipped" : "failed",
      error: result.ok ? null : result.error,
      provider_id: result.ok ? result.id : null,
      related_id: opts.relatedId ?? null,
      body: opts.keepBody ?? null,
    });
    if (error) console.error("email_log insert failed", error.message);
  }
  if (!result.ok && !result.skipped) console.error(`Email "${kind}" to ${msg.to} failed:`, result.error);
  return result;
}

/** Has an email of this kind already been sent for this record? (Avoids duplicates.) */
export async function alreadySent(db: Db, kind: string, relatedId: string) {
  const { data } = await db.from("email_log").select("id").eq("kind", kind).eq("related_id", relatedId).eq("status", "sent").limit(1);
  return Boolean(data?.length);
}
