"use server";

import { after } from "next/server";
import { alertEmail, getSettings } from "@/lib/automation/settings";
import { deliver } from "@/lib/email/send";
import { orderAlertEmail, orderEmail } from "@/lib/email/templates";
import { CARD_COLORS, HEADLINES, HEADLINE_MAX, STANDARD_HEADLINE, initialsOf, shopProduct } from "@/lib/shop";
import type { PlateDesign } from "@/components/marketing/ReviewPlate";
import { submitOrderRpc } from "@/lib/supabase/public";
import { hasServiceKey, serviceClient } from "@/lib/supabase/service";
import { normalizeUrl, str } from "@/lib/utils";

export type OrderState =
  | {
      ok: true;
      orderNo: number;
      total: number;
      product: string;
      quantity: number;
      email: string;
      payment: string | null;
      /** The custom review-plate design, to show on the confirmation. Null = standard design. */
      design: PlateDesign | null;
    }
  | { ok: false; error: string }
  | null;

/** Reads the "Design your card" choices into a preview + a summary for the order notes. */
function readDesign(f: FormData, product: string, business: string) {
  if (product === "profile_card") return { preview: null, summary: null };
  if (str(f.get("design")) !== "custom") {
    return { preview: null, summary: `Card design: Standard (blue, "${STANDARD_HEADLINE}")` };
  }
  const color = CARD_COLORS.find((c) => c.value === str(f.get("card_color"))) ?? CARD_COLORS[0];
  const choice = str(f.get("headline"));
  const own = (str(f.get("own_headline")) ?? "").replace(/\s+/g, " ").slice(0, HEADLINE_MAX);
  const headline = choice === "own" ? own || STANDARD_HEADLINE : (HEADLINES as readonly string[]).includes(choice ?? "") ? choice! : STANDARD_HEADLINE;
  return {
    preview: { color: color.hex, headline, business, initials: initialsOf(business) },
    summary: [
      "Card design: Custom",
      `Color: ${color.label} (${color.hex})`,
      `Headline: "${headline}"${choice === "own" ? " (their own words)" : ""}`,
      "Logo: ask for it when you confirm the order.",
    ].join("\n"),
  };
}

export async function placeOrder(_prev: OrderState, f: FormData): Promise<OrderState> {
  // Honeypot: real people never see or fill this field.
  if (str(f.get("hp_extra"))) return { ok: false, error: "Something went wrong. Please refresh the page and try again." };

  const product = str(f.get("product"));
  if (!shopProduct(product)) return { ok: false, error: "Choose a card first." };

  const quantity = Math.trunc(Number(f.get("quantity") ?? 1)) || 1;
  const purpose: "business" | "personal" = str(f.get("purpose")) === "personal" ? "personal" : "business";
  const contact = str(f.get("contact_person"));
  // Personal orders don't need a business: the customer is filed under their own name.
  const business = str(f.get("business_name")) ?? (purpose === "personal" ? contact : null);
  const email = str(f.get("email"));
  const phone = str(f.get("phone"));
  if (!business) return { ok: false, error: purpose === "personal" ? "Enter your name." : "Enter your business name." };
  if (!email) return { ok: false, error: "Enter your email. We send your order updates there." };
  if (!phone) return { ok: false, error: "Enter a mobile number so we can arrange delivery." };

  // Card design. Only choices from our lists are accepted; a custom headline is trimmed to HEADLINE_MAX.
  const design = readDesign(f, product!, business);
  const customerNotes = str(f.get("notes"));

  const input = {
    product: product!,
    quantity,
    purpose,
    business,
    contact,
    email,
    phone,
    area: str(f.get("area")),
    address: str(f.get("address")),
    payment: str(f.get("payment")),
    reviewUrl: normalizeUrl(f.get("review_url")),
    notes: [design.summary, customerNotes].filter(Boolean).join("\n\n").slice(0, 2000) || null,
  };

  const r = await submitOrderRpc(input);
  if (!r.ok) return { ok: false, error: r.error };

  // Emails go out after the page has already answered, so ordering feels instant.
  after(async () => {
    const db = hasServiceKey() ? serviceClient() : null; // without the service key, emails still send but aren't logged
    const to = db ? alertEmail((await getSettings(db)).settings) : process.env.ADMIN_ALERT_EMAIL || null;

    if (r.order_emails) {
      const msg = orderEmail(
        "new",
        { order_no: r.order_no, product: r.product, quantity: r.quantity, total: Number(r.total), amount_paid: 0, due_date: null },
        { business_name: input.business, contact_person: input.contact }
      );
      // Logged as order_new, so moving the order in the admin never sends "order received" twice.
      if (msg) await deliver(db, "order_new", { to: input.email, ...msg }, { relatedId: r.id });
    }
    if (to) {
      const alert = orderAlertEmail({
        id: r.id,
        order_no: r.order_no,
        product: r.product,
        quantity: r.quantity,
        total: Number(r.total),
        purpose: input.purpose,
        business: input.business,
        contact: input.contact,
        email: input.email,
        phone: input.phone,
        area: input.area,
        address: input.address,
        payment: input.payment,
        reviewUrl: input.reviewUrl,
        notes: input.notes,
        newCustomer: r.new_customer,
      });
      await deliver(db, "order_alert", { to, replyTo: input.email, ...alert }, { relatedId: r.id });
    }
  });

  return { ok: true, orderNo: r.order_no, total: Number(r.total), product: r.product, quantity: r.quantity, email: input.email, payment: input.payment, design: design.preview };
}
