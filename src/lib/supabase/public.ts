import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { PublicProfile } from "@/lib/types";

/** Cookie-less client for public pages. It can only call the public functions. */
function publicClient() {
  const { url, anonKey } = env();
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type ResolvedCard =
  | { type: "profile"; profile: PublicProfile }
  | { type: "review" | "link"; url: string }
  | { type: "setup"; name?: string | null }
  | null;

export async function resolveCard(code: string): Promise<ResolvedCard> {
  const { data, error } = await publicClient().rpc("resolve_card", { p_code: code });
  if (error) {
    console.error("resolve_card failed", error.message);
    return null;
  }
  return (data as ResolvedCard) ?? null;
}

export async function getPublicProfile(slug: string): Promise<PublicProfile | null> {
  const { data, error } = await publicClient().rpc("get_public_profile", { p_slug: slug });
  if (error) {
    console.error("get_public_profile failed", error.message);
    return null;
  }
  return (data as PublicProfile) ?? null;
}

export type ConcernInput = {
  name: string | null;
  email: string;
  phone: string | null;
  business: string | null;
  topic: string;
  cardCode: string | null;
  message: string;
};

/** Public concern form → submit_concern() in the database (validates + rate-limits). */
export async function submitConcernRpc(c: ConcernInput) {
  const { data, error } = await publicClient().rpc("submit_concern", {
    p_name: c.name,
    p_email: c.email,
    p_phone: c.phone,
    p_business: c.business,
    p_topic: c.topic,
    p_card_code: c.cardCode,
    p_message: c.message,
  });
  if (error) {
    console.error("submit_concern failed", error.message);
    return { ok: false as const, error: "Sorry, we couldn't send your message. Please try again, or message us on Facebook." };
  }
  return data as { ok: true; id: string; ticket_no: number; autoreply: boolean } | { ok: false; error: string };
}

export type OrderInput = {
  product: string;
  quantity: number;
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
};

export type PlacedOrder = {
  ok: true;
  id: string;
  order_no: number;
  product: string;
  quantity: number;
  unit_price: number;
  total: number;
  customer_id: string;
  new_customer: boolean;
  order_emails: boolean;
};

/** Public order form → submit_order() in the database (sets the price, validates, rate-limits). */
export async function submitOrderRpc(o: OrderInput) {
  const { data, error } = await publicClient().rpc("submit_order", {
    p_product: o.product,
    p_quantity: o.quantity,
    p_business: o.business,
    p_contact: o.contact,
    p_email: o.email,
    p_phone: o.phone,
    p_area: o.area,
    p_address: o.address,
    p_payment: o.payment,
    p_review_url: o.reviewUrl,
    p_notes: o.notes,
    p_purpose: o.purpose,
  });
  if (error) {
    console.error("submit_order failed", error.message);
    return { ok: false as const, error: "We couldn't place your order. Try again, or send us a message on the support page." };
  }
  return data as PlacedOrder | { ok: false; error: string };
}
