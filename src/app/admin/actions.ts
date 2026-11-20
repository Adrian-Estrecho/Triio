"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, check } from "@/lib/admin";
import { PRODUCTS } from "@/lib/constants";
import type { CardType } from "@/lib/types";
import { maybeSendOrderUpdate, maybeSendWelcome } from "@/lib/automation/hooks";
import { generateCardCode, isSafeHttpUrl, normalizeUrl, num, parseLinks, slugify, str, todayISO } from "@/lib/utils";

async function admin() {
  const ctx = await requireAdmin();
  if (!ctx.isAdmin) throw new Error("Only admins can do this.");
  return ctx.supabase;
}

function id(formData: FormData, key = "id") {
  const v = str(formData.get(key));
  if (!v) throw new Error(`Missing ${key}`);
  return v;
}

/* ============================== CUSTOMERS ============================== */

function customerFields(f: FormData) {
  const business_name = str(f.get("business_name"));
  if (!business_name) throw new Error("Business name is required.");
  return {
    business_name,
    contact_person: str(f.get("contact_person")),
    email: str(f.get("email")),
    phone: str(f.get("phone")),
    area: str(f.get("area")),
    address: str(f.get("address")),
    notes: str(f.get("notes")),
  };
}

export async function createCustomer(f: FormData) {
  const db = await admin();
  const row = check(await db.from("customers").insert(customerFields(f)).select("id").single(), "Create customer");
  await maybeSendWelcome(db, row.id);
  revalidatePath("/admin/customers");
  redirect(`/admin/customers/${row.id}`);
}

export async function updateCustomer(f: FormData) {
  const db = await admin();
  const customerId = id(f);
  check(await db.from("customers").update(customerFields(f)).eq("id", customerId), "Update customer");
  await maybeSendWelcome(db, customerId); // only if they just got an email address and haven't been welcomed
  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath("/admin/customers");
}

export async function deleteCustomer(f: FormData) {
  const db = await admin();
  check(await db.from("customers").delete().eq("id", id(f)), "Delete customer");
  revalidatePath("/admin/customers");
  redirect("/admin/customers");
}

/* ============================== PROFILES ============================== */

async function uniqueSlug(db: Awaited<ReturnType<typeof admin>>, base: string, exceptId?: string) {
  const root = slugify(base) || "profile";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    let q = db.from("profiles").select("id").eq("slug", candidate);
    if (exceptId) q = q.neq("id", exceptId);
    const { data } = await q.maybeSingle();
    if (!data) return candidate;
  }
  return `${root}-${generateCardCode(4).toLowerCase()}`;
}

async function uploadAsset(db: Awaited<ReturnType<typeof admin>>, file: FormDataEntryValue | null, folder: string) {
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (!file.type.startsWith("image/")) throw new Error("Please upload an image file (PNG, JPG, WEBP or SVG).");
  if (file.size > 4 * 1024 * 1024) throw new Error("Image is too big — keep it under 4 MB.");
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${folder}/${Date.now()}.${ext}`;
  check(
    await db.storage.from("brand-assets").upload(path, file, { contentType: file.type, upsert: true }),
    "Upload image"
  );
  return db.storage.from("brand-assets").getPublicUrl(path).data.publicUrl;
}

export async function createProfile(f: FormData) {
  const db = await admin();
  const display_name = str(f.get("display_name"));
  if (!display_name) throw new Error("Display name is required.");
  const slug = await uniqueSlug(db, str(f.get("slug")) ?? display_name);
  const row = check(
    await db
      .from("profiles")
      .insert({ display_name, slug, customer_id: str(f.get("customer_id")) })
      .select("id")
      .single(),
    "Create profile"
  );
  revalidatePath("/admin/profiles");
  redirect(`/admin/profiles/${row.id}`);
}

export async function updateProfile(f: FormData) {
  const db = await admin();
  const profileId = id(f);
  const display_name = str(f.get("display_name"));
  if (!display_name) throw new Error("Display name is required.");

  const accent = str(f.get("accent_color")) ?? "#38BDF8";
  const update: Record<string, unknown> = {
    display_name,
    slug: await uniqueSlug(db, str(f.get("slug")) ?? display_name, profileId),
    customer_id: str(f.get("customer_id")),
    tagline: str(f.get("tagline")),
    description: str(f.get("description")),
    phone: str(f.get("phone")),
    email: str(f.get("email")),
    website: normalizeUrl(f.get("website")),
    address: str(f.get("address")),
    maps_url: normalizeUrl(f.get("maps_url")),
    review_url: normalizeUrl(f.get("review_url")),
    facebook: normalizeUrl(f.get("facebook")),
    instagram: normalizeUrl(f.get("instagram")),
    tiktok: normalizeUrl(f.get("tiktok")),
    messenger: normalizeUrl(f.get("messenger")),
    whatsapp: normalizeUrl(f.get("whatsapp")),
    viber: normalizeUrl(f.get("viber")),
    links: parseLinks(str(f.get("links"))),
    accent_color: /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : "#38BDF8",
    theme: f.get("theme") === "light" ? "light" : "dark",
    is_active: f.get("is_active") === "on",
  };

  for (const key of ["website", "maps_url", "review_url", "facebook", "instagram", "tiktok", "messenger", "whatsapp", "viber"]) {
    const v = update[key] as string | null;
    if (v && !isSafeHttpUrl(v)) throw new Error(`"${key}" must be a web link starting with https://`);
  }

  const logo = await uploadAsset(db, f.get("logo"), `logos/${profileId}`);
  if (logo) update.logo_url = logo;
  else if (f.get("remove_logo") === "on") update.logo_url = null;

  const cover = await uploadAsset(db, f.get("cover"), `covers/${profileId}`);
  if (cover) update.cover_url = cover;
  else if (f.get("remove_cover") === "on") update.cover_url = null;

  check(await db.from("profiles").update(update).eq("id", profileId), "Save profile");
  revalidatePath(`/admin/profiles/${profileId}`);
  revalidatePath("/admin/profiles");
}

export async function deleteProfile(f: FormData) {
  const db = await admin();
  check(await db.from("profiles").delete().eq("id", id(f)), "Delete profile");
  revalidatePath("/admin/profiles");
  redirect("/admin/profiles");
}

/* ============================== NFC CARDS ============================== */

const CARD_TYPE_VALUES: CardType[] = ["review", "profile", "link", "personal"];

function cardType(f: FormData): CardType {
  const v = str(f.get("card_type")) as CardType | null;
  return v && CARD_TYPE_VALUES.includes(v) ? v : "review";
}

/** Review and link cards redirect to a URL; profile and personal cards open a profile. */
function usesUrl(t: CardType) {
  return t === "review" || t === "link";
}

export async function createCards(f: FormData) {
  const db = await admin();
  const card_type = cardType(f);
  const count = Math.min(Math.max(Math.round(num(f.get("count"), 1) ?? 1), 1), 50);
  const personal = card_type === "personal";
  // Personal cards start with no profile: the owner creates it when they set the card up.
  const profile_id = card_type === "profile" ? str(f.get("profile_id")) : null;
  const destination_url = normalizeUrl(f.get("destination_url"));

  if (card_type === "profile" && !profile_id) throw new Error("Choose which profile this card opens.");
  if (usesUrl(card_type) && !isSafeHttpUrl(destination_url)) throw new Error("Paste the Google review link (or the link this card should open).");

  let customer_id = str(f.get("customer_id"));
  if (!customer_id && profile_id) {
    const { data } = await db.from("profiles").select("customer_id").eq("id", profile_id).single();
    customer_id = data?.customer_id ?? null;
  }

  const labelBase = str(f.get("label"));
  const rows = Array.from({ length: count }, (_, i) => ({
    card_code: generateCardCode(),
    card_type,
    customer_id,
    profile_id,
    order_id: str(f.get("order_id")),
    destination_url: usesUrl(card_type) ? destination_url : null,
    label: labelBase ? (count > 1 ? `${labelBase} ${i + 1}` : labelBase) : null,
    chip_type: str(f.get("chip_type")) ?? "NTAG213",
    ...(personal ? { claim_code: generateCardCode(), owner_name: str(f.get("owner_name")) } : {}),
  }));

  // Retry once on the (very unlikely) code collision.
  let result = await db.from("nfc_cards").insert(rows).select("id");
  if (result.error?.code === "23505") {
    rows.forEach((r) => (r.card_code = generateCardCode()));
    result = await db.from("nfc_cards").insert(rows).select("id");
  }
  const created = check(result, "Create cards");

  revalidatePath("/admin/cards");
  const back = str(f.get("return_to"));
  if (back?.startsWith("/admin")) redirect(back);
  redirect(created.length === 1 ? `/admin/cards/${created[0].id}` : "/admin/cards");
}

export async function updateCard(f: FormData) {
  const db = await admin();
  const cardId = id(f);
  const card_type = cardType(f);
  const destination_url = normalizeUrl(f.get("destination_url"));
  let profile_id = card_type === "profile" ? str(f.get("profile_id")) : null;
  if (card_type === "profile" && !profile_id) throw new Error("Choose which profile this card opens.");
  if (usesUrl(card_type) && !isSafeHttpUrl(destination_url)) throw new Error("A review/link card needs a valid https:// link.");

  // Personal cards: the owner's profile is linked by the setup screen (and unlinked by "Reset setup"),
  // never by this form. Keep it as it is; a card with no owner yet needs a setup code.
  let claim: { claim_code: string | null } = { claim_code: null };
  if (card_type === "personal") {
    const { data: current } = await db.from("nfc_cards").select("card_type, profile_id, claim_code").eq("id", cardId).single();
    const wasPersonal = current?.card_type === "personal";
    profile_id = wasPersonal ? (current?.profile_id ?? null) : null;
    claim = { claim_code: profile_id ? null : ((wasPersonal ? current?.claim_code : null) ?? generateCardCode()) };
  }

  check(
    await db
      .from("nfc_cards")
      .update({
        card_type,
        profile_id,
        destination_url: usesUrl(card_type) ? destination_url : null,
        ...claim,
        owner_name: card_type === "personal" ? str(f.get("owner_name")) : null,
        customer_id: str(f.get("customer_id")),
        order_id: str(f.get("order_id")),
        label: str(f.get("label")),
        chip_type: str(f.get("chip_type")) ?? "NTAG213",
        status: str(f.get("status")) ?? "pending",
        is_locked: f.get("is_locked") === "on",
      })
      .eq("id", cardId),
    "Save card"
  );
  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath("/admin/cards");
}

export async function setCardStatus(f: FormData) {
  const db = await admin();
  const cardId = id(f);
  check(await db.from("nfc_cards").update({ status: str(f.get("status")) }).eq("id", cardId), "Update card status");
  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath("/admin/cards");
}

/** Personal cards: unlink the owner's profile (it is kept) and issue a fresh setup code. */
export async function resetCardSetup(f: FormData) {
  const db = await admin();
  const cardId = id(f);
  check(
    await db
      .from("nfc_cards")
      .update({ profile_id: null, claim_code: generateCardCode(), claim_attempts: 0 })
      .eq("id", cardId)
      .eq("card_type", "personal"),
    "Reset card setup"
  );
  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath("/admin/cards");
}

export async function deleteCard(f: FormData) {
  const db = await admin();
  check(await db.from("nfc_cards").delete().eq("id", id(f)), "Delete card");
  revalidatePath("/admin/cards");
  redirect("/admin/cards");
}

/* ============================== ORDERS ============================== */

function orderFields(f: FormData) {
  const product = str(f.get("product")) ?? "review_card";
  const defaultPrice = PRODUCTS.find((p) => p.value === product)?.price ?? 0;
  return {
    customer_id: str(f.get("customer_id")),
    product,
    quantity: Math.max(1, Math.round(num(f.get("quantity"), 1) ?? 1)),
    unit_price: num(f.get("unit_price"), defaultPrice) ?? defaultPrice,
    discount: num(f.get("discount"), 0) ?? 0,
    status: str(f.get("status")) ?? "new",
    payment_status: str(f.get("payment_status")) ?? "unpaid",
    amount_paid: num(f.get("amount_paid"), 0) ?? 0,
    payment_method: str(f.get("payment_method")),
    direct_cost: num(f.get("direct_cost")),
    due_date: str(f.get("due_date")),
    notes: str(f.get("notes")),
  };
}

export async function createOrder(f: FormData) {
  const db = await admin();
  const fields = orderFields(f);
  const row = check(await db.from("orders").insert(fields).select("id").single(), "Create order");
  await maybeSendOrderUpdate(db, row.id, fields.status);
  revalidatePath("/admin/orders");
  redirect(`/admin/orders/${row.id}`);
}

export async function updateOrder(f: FormData) {
  const db = await admin();
  const orderId = id(f);
  const fields = orderFields(f);
  const before = await db.from("orders").select("status").eq("id", orderId).maybeSingle();
  check(await db.from("orders").update(fields).eq("id", orderId), "Save order");
  if (before.data?.status !== fields.status) await maybeSendOrderUpdate(db, orderId, fields.status);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

export async function setOrderStatus(f: FormData) {
  const db = await admin();
  const orderId = id(f);
  const status = str(f.get("status"));
  check(await db.from("orders").update({ status }).eq("id", orderId), "Update order status");
  if (status) await maybeSendOrderUpdate(db, orderId, status);
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function deleteOrder(f: FormData) {
  const db = await admin();
  check(await db.from("orders").delete().eq("id", id(f)), "Delete order");
  revalidatePath("/admin/orders");
  redirect("/admin/orders");
}

/* ============================== COSTS ============================== */

export async function createExpense(f: FormData) {
  const db = await admin();
  const description = str(f.get("description"));
  const amount = num(f.get("amount"));
  if (!description || amount === null) throw new Error("Description and amount are required.");
  check(
    await db.from("expenses").insert({
      spent_on: str(f.get("spent_on")) ?? todayISO(),
      category: str(f.get("category")) ?? "material",
      description,
      quantity: num(f.get("quantity")),
      amount,
      yield_cards: num(f.get("yield_cards")),
      order_id: str(f.get("order_id")),
    }),
    "Add expense"
  );
  revalidatePath("/admin/costs");
  revalidatePath("/admin");
}

export async function deleteExpense(f: FormData) {
  const db = await admin();
  check(await db.from("expenses").delete().eq("id", id(f)), "Delete expense");
  revalidatePath("/admin/costs");
}

export async function createBatch(f: FormData) {
  const db = await admin();
  const attempted = num(f.get("attempted"));
  const sellable = num(f.get("sellable"));
  if (attempted === null || sellable === null) throw new Error("Enter cards attempted and sellable.");
  if (sellable > attempted) throw new Error("Sellable cards can't be more than cards attempted.");
  check(
    await db.from("production_batches").insert({
      made_on: str(f.get("made_on")) ?? todayISO(),
      attempted,
      sellable,
      minutes_spent: num(f.get("minutes_spent")),
      notes: str(f.get("notes")),
    }),
    "Add batch"
  );
  revalidatePath("/admin/costs");
  revalidatePath("/admin");
}

export async function deleteBatch(f: FormData) {
  const db = await admin();
  check(await db.from("production_batches").delete().eq("id", id(f)), "Delete batch");
  revalidatePath("/admin/costs");
}

/* ============================== LEADS ============================== */

function leadFields(f: FormData) {
  const business_name = str(f.get("business_name"));
  if (!business_name) throw new Error("Business name is required.");
  const tier = str(f.get("tier"));
  return {
    business_name,
    category: str(f.get("category")),
    area: str(f.get("area")),
    tier: tier && ["A", "B", "C"].includes(tier) ? tier : null,
    status: str(f.get("status")) ?? "new",
    contact_person: str(f.get("contact_person")),
    phone: str(f.get("phone")),
    facebook: normalizeUrl(f.get("facebook")),
    maps_url: normalizeUrl(f.get("maps_url")),
    address: str(f.get("address")),
    next_follow_up: str(f.get("next_follow_up")),
    notes: str(f.get("notes")),
    ...(f.has("email") ? { email: str(f.get("email")) } : {}),
    ...(f.has("website") ? { website: normalizeUrl(f.get("website")) } : {}),
  };
}

export async function createLead(f: FormData) {
  const db = await admin();
  check(await db.from("leads").insert(leadFields(f)), "Add lead");
  revalidatePath("/admin/leads");
}

/** One lead per line:  Business name | Area | Category | Tier */
export async function bulkCreateLeads(f: FormData) {
  const db = await admin();
  const text = str(f.get("bulk")) ?? "";
  const rows = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, area, category, tier] = line.split("|").map((s) => s?.trim() || null);
      const t = tier?.toUpperCase();
      return { business_name: name!, area, category, tier: t && ["A", "B", "C"].includes(t) ? t : null };
    })
    .filter((r) => r.business_name);
  if (!rows.length) throw new Error("Paste at least one line.");
  check(await db.from("leads").insert(rows), "Bulk add leads");
  revalidatePath("/admin/leads");
}

export async function updateLead(f: FormData) {
  const db = await admin();
  const leadId = id(f);
  check(await db.from("leads").update(leadFields(f)).eq("id", leadId), "Save lead");
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
}

export async function deleteLead(f: FormData) {
  const db = await admin();
  check(await db.from("leads").delete().eq("id", id(f)), "Delete lead");
  revalidatePath("/admin/leads");
  redirect("/admin/leads");
}

export async function convertLead(f: FormData) {
  const db = await admin();
  const leadId = id(f);
  const lead = check(await db.from("leads").select("*").eq("id", leadId).single(), "Load lead");
  if (lead.customer_id) redirect(`/admin/customers/${lead.customer_id}`);

  const customer = check(
    await db
      .from("customers")
      .insert({
        business_name: lead.business_name,
        contact_person: lead.contact_person,
        phone: lead.phone,
        email: lead.email ?? null,
        area: lead.area,
        address: lead.address,
        notes: lead.notes,
        lead_id: lead.id,
      })
      .select("id")
      .single(),
    "Create customer"
  );
  check(await db.from("leads").update({ status: "won", customer_id: customer.id }).eq("id", leadId), "Update lead");
  await maybeSendWelcome(db, customer.id);
  revalidatePath("/admin/leads");
  revalidatePath("/admin/customers");
  redirect(`/admin/customers/${customer.id}`);
}

export async function createOutreach(f: FormData) {
  const db = await admin();
  const leadId = id(f, "lead_id");
  const outcome = str(f.get("outcome"));
  check(
    await db.from("outreach").insert({
      lead_id: leadId,
      contacted_on: str(f.get("contacted_on")) ?? todayISO(),
      channel: str(f.get("channel")) ?? "visit",
      summary: str(f.get("summary")),
      outcome,
    }),
    "Log outreach"
  );

  // Move the lead forward automatically.
  const { data: lead } = await db.from("leads").select("status").eq("id", leadId).single();
  const update: Record<string, unknown> = {};
  const nextFollowUp = str(f.get("next_follow_up"));
  if (nextFollowUp) update.next_follow_up = nextFollowUp;
  if (outcome === "sold") update.status = "won";
  else if (outcome === "not_interested") update.status = "lost";
  else if (outcome === "demo_booked") update.status = lead?.status === "demo" ? "demo" : "interested";
  else if (lead?.status === "new") update.status = "contacted";
  if (Object.keys(update).length) await db.from("leads").update(update).eq("id", leadId);

  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
}

export async function deleteOutreach(f: FormData) {
  const db = await admin();
  const leadId = id(f, "lead_id");
  check(await db.from("outreach").delete().eq("id", id(f)), "Delete outreach");
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function quickLeadStatus(f: FormData) {
  const db = await admin();
  const leadId = id(f);
  check(await db.from("leads").update({ status: str(f.get("status")) }).eq("id", leadId), "Update lead");
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
}
