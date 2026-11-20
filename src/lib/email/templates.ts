import { siteUrl } from "@/lib/env";
import { CONCERN_TOPICS, PRODUCTS, labelOf } from "@/lib/constants";
import { fmtDate, peso } from "@/lib/utils";
import type { Alert } from "@/lib/automation/alerts";

/* Plain inline-styled HTML: it renders the same in Gmail, Outlook and phone mail apps. */

export function esc(s: string | number | null | undefined) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const NAVY = "#111827";
const SKY = "#38BDF8";

function layout(opts: { preheader: string; heading: string; body: string; cta?: { label: string; href: string } }) {
  const cta = opts.cta
    ? `<p style="margin:28px 0 8px"><a href="${esc(opts.cta.href)}" style="display:inline-block;background:${SKY};color:${NAVY};font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px">${esc(opts.cta.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f3f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937">
<span style="display:none;max-height:0;overflow:hidden">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f7;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:${NAVY};padding:20px 28px;color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.02em">triio<span style="color:${SKY}">.</span></td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.6">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${NAVY}">${esc(opts.heading)}</h1>
${opts.body}
${cta}
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #e5ebee;font-size:12px;color:#6b7280">
Triio · NFC review &amp; profile cards · Marikina · Antipolo · Cubao<br>
Need help? <a href="${esc(siteUrl())}/support" style="color:#0369a1">${esc(siteUrl().replace(/^https?:\/\//, ""))}/support</a> or just reply to this email.
</td></tr>
</table></td></tr></table></body></html>`;
}

const p = (html: string) => `<p style="margin:0 0 14px">${html}</p>`;
const list = (items: string[]) => `<ol style="margin:0 0 14px;padding-left:20px">${items.map((i) => `<li style="margin-bottom:6px">${i}</li>`).join("")}</ol>`;
const nl2br = (s: string) => esc(s).replace(/\r?\n/g, "<br>");

/* ============================== CUSTOMERS ============================== */

export function welcomeEmail(c: { business_name: string; contact_person: string | null }) {
  const hi = c.contact_person ? `Hi ${esc(c.contact_person)},` : `Hi ${esc(c.business_name)} team,`;
  const subject = `Welcome to Triio, ${c.business_name}!`;
  const html = layout({
    preheader: "Here's what happens next with your NFC cards.",
    heading: `Welcome to Triio! 👋`,
    body:
      p(hi) +
      p(`Thank you for choosing Triio for <b>${esc(c.business_name)}</b>. We're excited to help your customers leave reviews and save your details with a single tap.`) +
      p(`<b>What happens next</b>`) +
      list([
        "We design your card and send you a proof to approve.",
        "We program the NFC chip and test it on both Android and iPhone.",
        "We deliver your cards, ready to use from day one.",
      ]) +
      p(`<b>How your customers use it</b>`) +
      list([
        "They hold their phone near the card (the top back of an iPhone, the middle back of most Androids).",
        "iPhone XS and newer read the card automatically. On Android, NFC needs to be on.",
        "The QR code on the card works for phones without NFC.",
      ]) +
      p(`If anything comes up, just reply to this email. We're happy to help.`) +
      p(`— The Triio team`),
  });
  const text = `${hi.replace(/<[^>]+>/g, "")}

Thank you for choosing Triio for ${c.business_name}.

What happens next:
1. We design your card and send you a proof to approve.
2. We program the NFC chip and test it on Android and iPhone.
3. We deliver your cards, ready to use.

How your customers use it: they hold their phone near the card. iPhone XS and newer read it automatically; on Android, NFC needs to be on. The QR code works for phones without NFC.

Questions? Reply to this email or visit ${siteUrl()}/support

— The Triio team`;
  return { subject, html, text };
}

/* ============================== ORDERS ============================== */

type OrderForEmail = {
  order_no: number;
  product: string;
  quantity: number;
  total: number;
  amount_paid: number;
  due_date: string | null;
};

export function orderEmail(status: string, o: OrderForEmail, customer: { business_name: string; contact_person: string | null }) {
  const hi = `Hi ${esc(customer.contact_person || customer.business_name)},`;
  const balance = Math.max(Number(o.total) - Number(o.amount_paid), 0);
  const item = `${esc(labelOf(PRODUCTS, o.product))} × ${o.quantity}`;
  const summary =
    `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;background:#f6f8f9;border-radius:12px"><tr><td style="padding:14px 16px;font-size:14px">` +
    `<b>Order #${o.order_no}</b><br>${item}<br>Total: <b>${peso(o.total)}</b>` +
    (Number(o.amount_paid) > 0 ? `<br>Paid: ${peso(o.amount_paid)}` : "") +
    (balance > 0 ? `<br>Balance: <b>${peso(balance)}</b>` : "") +
    (o.due_date ? `<br>Target date: ${fmtDate(o.due_date)}` : "") +
    `</td></tr></table>`;
  const payLine = balance > 0 ? p(`You can pay the balance of <b>${peso(balance)}</b> by GCash, Maya, bank transfer or cash on delivery. Just reply to this email if you need our payment details.`) : "";

  const variants: Record<string, { subject: string; heading: string; lines: string }> = {
    new: {
      subject: `We got your order #${o.order_no}`,
      heading: "Your order is in! 🎉",
      lines: p(hi) + p("Thanks for ordering with Triio. Here's your order:") + summary + payLine + p("Next, we'll design your card and send you a proof to approve."),
    },
    for_approval: {
      subject: `Your card design is ready for approval (order #${o.order_no})`,
      heading: "Your design is ready to check",
      lines:
        p(hi) +
        p("We've finished the design for your card and sent the proof to you. Please check the business name spelling, logo and colors.") +
        summary +
        p("Reply <b>\"Approved\"</b> to start production, or tell us what to change."),
    },
    ready: {
      subject: `Your Triio cards are ready! (order #${o.order_no})`,
      heading: "Your cards are ready 🙌",
      lines:
        p(hi) +
        p("Good news: your cards are made, programmed and tested on Android and iPhone. We'll message you to arrange pickup or delivery.") +
        summary +
        payLine,
    },
    completed: {
      subject: `Thank you! Tips to get more reviews with your Triio card`,
      heading: "Thank you for choosing Triio!",
      lines:
        p(hi) +
        p("Your order is complete. A few tips to get the most out of your card:") +
        list([
          "Put the card where customers pay or wait, like the counter, the table or the mirror station.",
          "Ask right after a good experience: <i>\"Could you tap here and leave us a quick review?\"</i>",
          "Show them how: phone near the card, then tap the notification.",
          "Want more cards for other tables or staff? Just reply to this email.",
        ]) +
        p("If a card ever stops working, tell us and we'll fix it. Your card's link can be changed anytime without replacing the card."),
    },
  };

  const v = variants[status];
  if (!v) return null;
  const html = layout({ preheader: v.subject, heading: v.heading, body: v.lines + p("— The Triio team") });
  const text = `${v.heading}

${htmlToText(v.lines)}

— The Triio team
Questions? Reply to this email or visit ${siteUrl()}/support`;
  return { subject: v.subject, html, text };
}

/** Tells you a new order came in from the website. */
export function orderAlertEmail(o: {
  id: string;
  order_no: number;
  product: string;
  quantity: number;
  total: number;
  purpose: "business" | "personal";
  business: string;
  contact: string | null;
  email: string;
  phone: string;
  area: string | null;
  address: string | null;
  payment: string | null;
  reviewUrl: string | null;
  notes: string | null;
  newCustomer: boolean;
}) {
  const item = `${labelOf(PRODUCTS, o.product)} × ${o.quantity}`;
  const subject = `New website order #${o.order_no}: ${o.business} (${peso(o.total)})`;
  const rows = [
    ["Order", `${item} · ${peso(o.total)}`],
    ["For", o.purpose === "personal" ? "Personal use" : "Business"],
    [o.purpose === "personal" ? "Name on order" : "Business", `${o.business}${o.newCustomer ? " (new customer)" : ""}`],
    ["Contact", o.contact || "—"],
    ["Email", o.email],
    ["Mobile", o.phone],
    ["Area", o.area || "—"],
    ["Deliver to", o.address || "—"],
    ["Payment", o.payment || "—"],
    ["Review link", o.reviewUrl || "—"],
  ]
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:4px 0">${esc(v)}</td></tr>`)
    .join("");
  const body =
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;font-size:14px">${rows}</table>` +
    (o.notes ? `<div style="background:#f6f8f9;border-radius:12px;padding:14px 16px;font-size:14px">${nl2br(o.notes)}</div>` : "") +
    p(`<span style="font-size:13px;color:#6b7280">Message them to confirm the details and send payment instructions, then move the order to <b>Awaiting payment</b>.</span>`);
  return {
    subject,
    html: layout({ preheader: `${item} for ${o.business}`, heading: `New order #${o.order_no}`, body, cta: { label: "Open in admin", href: `${siteUrl()}/admin/orders/${o.id}` } }),
    text: `${subject}\n\n${item}\nFor: ${o.purpose === "personal" ? "Personal use" : "Business"}\nBusiness: ${o.business}\nContact: ${o.contact || "—"}\nEmail: ${o.email}\nMobile: ${o.phone}\nArea: ${o.area || "—"}\nDeliver to: ${o.address || "—"}\nPayment: ${o.payment || "—"}\nReview link: ${o.reviewUrl || "—"}\n\n${o.notes ?? ""}\n\n${siteUrl()}/admin/orders/${o.id}`,
  };
}

/* ============================== CONCERNS ============================== */

export function concernAutoReply(ticketNo: number) {
  const subject = `We got your message (ticket #${ticketNo})`;
  const body =
    p("Hi,") +
    p(`Thanks for reaching out to Triio. We've received your message and logged it as <b>ticket #${ticketNo}</b>.`) +
    p("We usually reply within one business day. If your card isn't working, you can keep using the QR code on the card in the meantime.") +
    p("— The Triio team");
  // Deliberately doesn't repeat anything the sender typed, so the form can't be used to send spam to other people.
  return {
    subject,
    html: layout({ preheader: `Ticket #${ticketNo}: we'll reply within one business day.`, heading: "We got your message", body }),
    text: `Thanks for reaching out to Triio. We've received your message and logged it as ticket #${ticketNo}.\n\nWe usually reply within one business day.\n\n— The Triio team`,
  };
}

export function concernAlertEmail(c: {
  id: string;
  ticket_no: number;
  name: string | null;
  email: string;
  phone: string | null;
  business_name: string | null;
  topic: string;
  card_code: string | null;
  message: string;
}) {
  const who = c.business_name || c.name || c.email;
  const subject = `New concern #${c.ticket_no} from ${who}: ${labelOf(CONCERN_TOPICS, c.topic)}`;
  const rows = [
    ["From", [c.name, c.business_name].filter(Boolean).join(" · ") || "—"],
    ["Email", c.email],
    ["Phone", c.phone || "—"],
    ["Topic", labelOf(CONCERN_TOPICS, c.topic)],
    ["Card code", c.card_code || "—"],
  ]
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;white-space:nowrap">${esc(k)}</td><td style="padding:4px 0">${esc(v)}</td></tr>`)
    .join("");
  const body =
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;font-size:14px">${rows}</table>` +
    `<div style="background:#f6f8f9;border-radius:12px;padding:14px 16px;font-size:14px">${nl2br(c.message)}</div>`;
  return {
    subject,
    html: layout({ preheader: c.message.slice(0, 120), heading: `Concern #${c.ticket_no}`, body, cta: { label: "Open in admin", href: `${siteUrl()}/admin/concerns/${c.id}` } }),
    text: `${subject}\n\nFrom: ${who}\nEmail: ${c.email}\nPhone: ${c.phone || "—"}\nCard: ${c.card_code || "—"}\n\n${c.message}\n\n${siteUrl()}/admin/concerns/${c.id}`,
  };
}

export function concernReplyEmail(ticketNo: number, message: string, resolved: boolean) {
  const subject = `Re: your Triio concern (ticket #${ticketNo})`;
  const body =
    `<div style="margin:0 0 16px">${nl2br(message)}</div>` +
    (resolved ? p(`<span style="color:#6b7280;font-size:13px">We've marked ticket #${ticketNo} as resolved. Just reply if you need anything else.</span>`) : "") +
    p("— The Triio team");
  return {
    subject,
    html: layout({ preheader: message.slice(0, 120), heading: `About your ticket #${ticketNo}`, body }),
    text: `${message}\n\n${resolved ? `We've marked ticket #${ticketNo} as resolved. Reply if you need anything else.\n\n` : ""}— The Triio team`,
  };
}

/* ============================== ADMIN ============================== */

const levelColor: Record<Alert["level"], string> = { urgent: "#dc2626", warning: "#d97706", info: "#0369a1" };

export function digestEmail(alerts: Alert[], found: { added: number; names: string[] } | null) {
  const n = alerts.length;
  const subject = n ? `Triio daily: ${n} thing${n === 1 ? "" : "s"} need${n === 1 ? "s" : ""} attention` : `Triio daily: ${found?.added ?? 0} new leads found`;
  const alertHtml = alerts
    .map((a) => {
      const items = a.items?.length
        ? `<ul style="margin:6px 0 0;padding-left:18px;font-size:13px;color:#374151">${a.items
            .slice(0, 6)
            .map((i) => `<li><a href="${esc(siteUrl() + i.href)}" style="color:#111827">${esc(i.label)}</a>${i.meta ? ` <span style="color:#6b7280">· ${esc(i.meta)}</span>` : ""}</li>`)
            .join("")}${a.items.length > 6 ? `<li style="color:#6b7280">…and ${a.items.length - 6} more</li>` : ""}</ul>`
        : "";
      return `<div style="border-left:3px solid ${levelColor[a.level]};padding:4px 0 4px 12px;margin:0 0 14px"><b>${esc(a.title)}</b>${a.detail ? `<br><span style="font-size:13px;color:#4b5563">${esc(a.detail)}</span>` : ""}${items}</div>`;
    })
    .join("");
  const foundHtml = found?.added
    ? p(`<b>🔎 ${found.added} new lead${found.added === 1 ? "" : "s"} found</b><br><span style="font-size:13px;color:#4b5563">${esc(found.names.slice(0, 8).join(", "))}${found.names.length > 8 ? "…" : ""}</span>`)
    : "";
  const body = (alertHtml || p("Nothing urgent today. 🎉")) + foundHtml;
  const text =
    alerts.map((a) => `• ${a.title}${a.detail ? ` (${a.detail})` : ""}${a.items?.length ? "\n" + a.items.slice(0, 6).map((i) => `   - ${i.label}${i.meta ? ` · ${i.meta}` : ""}`).join("\n") : ""}`).join("\n") +
    (found?.added ? `\n\nNew leads found: ${found.added} (${found.names.slice(0, 8).join(", ")})` : "") +
    `\n\n${siteUrl()}/admin`;
  return { subject, html: layout({ preheader: subject, heading: "Your daily Triio rundown", body, cta: { label: "Open dashboard", href: `${siteUrl()}/admin` } }), text };
}

export function testEmail() {
  return {
    subject: "Triio test email ✅",
    html: layout({ preheader: "Email is working.", heading: "Email is working ✅", body: p("This is a test from your Triio automations page. Welcome emails, order updates, concern replies and alerts will be sent the same way.") }),
    text: "Email is working. This is a test from your Triio automations page.",
  };
}

function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/(p|li|tr|table|ol|ul)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
