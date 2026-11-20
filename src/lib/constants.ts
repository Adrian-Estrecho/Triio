export const STARTING_CAPITAL = 5000;

export const PRODUCTS = [
  { value: "review_card", label: "Tap Review card", price: 449 },
  { value: "profile_card", label: "Tap Profile card", price: 999 },
  { value: "barber_pack", label: "Barber/Salon pack (3 cards)", price: 999 },
  { value: "extra_card", label: "Extra card", price: 199 },
  { value: "custom", label: "Custom / quote", price: 0 },
] as const;

export const ORDER_STATUSES = [
  { value: "new", label: "New" },
  { value: "awaiting_payment", label: "Awaiting payment" },
  { value: "designing", label: "Designing" },
  { value: "for_approval", label: "For approval" },
  { value: "production", label: "Production" },
  { value: "quality_check", label: "Quality check" },
  { value: "ready", label: "Ready for delivery" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const PAYMENT_STATUSES = [
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "refunded", label: "Refunded" },
] as const;

export const PAYMENT_METHODS = ["GCash", "Maya", "Cash", "Bank transfer", "Other"] as const;

export const CARD_TYPES = [
  { value: "review", label: "Review card → Google review link" },
  { value: "profile", label: "Profile card → digital profile" },
  { value: "link", label: "Link card → any URL" },
  { value: "personal", label: "Personal card → owner sets up their own profile" },
] as const;

export const CARD_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "programmed", label: "Programmed" },
  { value: "tested", label: "Tested" },
  { value: "delivered", label: "Delivered" },
  { value: "disabled", label: "Disabled" },
] as const;

export const EXPENSE_CATEGORIES = [
  { value: "material", label: "PVC / card material", direct: true },
  { value: "printing", label: "Printing", direct: true },
  { value: "nfc_chip", label: "NFC chips", direct: true },
  { value: "packaging", label: "Packaging", direct: true },
  { value: "transport", label: "Transport / delivery", direct: false },
  { value: "marketing", label: "Marketing", direct: false },
  { value: "software", label: "Software / hosting", direct: false },
  { value: "other", label: "Other", direct: false },
] as const;

export const DIRECT_COST_CATEGORIES: string[] = EXPENSE_CATEGORIES.filter((c) => c.direct).map((c) => c.value);

export const LEAD_STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "interested", label: "Interested" },
  { value: "demo", label: "Demo done" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
] as const;

export const LEAD_AREAS = ["Marikina", "Antipolo", "Cubao / QC", "Other"] as const;

export const LEAD_CATEGORIES = ["Cafe", "Restaurant", "Barbershop", "Salon", "Clinic", "Retail", "Hotel", "Freelancer", "Other"] as const;

export const OUTREACH_CHANNELS = [
  { value: "visit", label: "In-person visit" },
  { value: "facebook", label: "Facebook / Messenger" },
  { value: "instagram", label: "Instagram" },
  { value: "sms", label: "SMS / Viber" },
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "other", label: "Other" },
] as const;

export const OUTREACH_OUTCOMES = [
  { value: "follow_up", label: "Follow up" },
  { value: "demo_booked", label: "Demo booked" },
  { value: "sold", label: "Sold" },
  { value: "no_answer", label: "No answer" },
  { value: "not_interested", label: "Not interested" },
] as const;

export function labelOf(list: readonly { value: string; label: string }[], value: string | null | undefined) {
  return list.find((i) => i.value === value)?.label ?? value ?? "—";
}

/* ============================== AUTOMATIONS ============================== */

/**
 * Where the lead finder searches. `query` is what Google gets ("Cafe in Marikina City");
 * the center + radius (meters) are used for OpenStreetMap and to keep Google results nearby.
 * Add a new area here (and to LEAD_AREAS) to search it.
 */
export const DISCOVERY_AREAS: Record<string, { query: string; lat: number; lng: number; radius: number }> = {
  Marikina: { query: "Marikina City, Metro Manila", lat: 14.6507, lng: 121.1029, radius: 4000 },
  Antipolo: { query: "Antipolo, Rizal", lat: 14.5862, lng: 121.1761, radius: 4000 },
  "Cubao / QC": { query: "Cubao, Quezon City", lat: 14.6195, lng: 121.0537, radius: 2000 },
};

/** Tier from Google review count: few reviews = they need a review card most. */
export function tierFromReviews(count: number | null | undefined): "A" | "B" | "C" | null {
  if (count === null || count === undefined) return null;
  if (count < 30) return "A";
  if (count < 100) return "B";
  return "C";
}

/** Order stages that send the customer an email (when order emails are on and they have an email). */
export const ORDER_EMAIL_STATUSES = ["new", "for_approval", "ready", "completed"] as const;

export const CONCERN_TOPICS = [
  { value: "general", label: "General question" },
  { value: "order", label: "My order" },
  { value: "card_problem", label: "My card isn't working" },
  { value: "billing", label: "Payment / billing" },
  { value: "other", label: "Something else" },
] as const;

export const CONCERN_STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "Replied" },
  { value: "resolved", label: "Resolved" },
] as const;

export const EMAIL_KINDS: Record<string, string> = {
  welcome: "Welcome",
  order_new: "Order received",
  order_for_approval: "Proof ready",
  order_ready: "Order ready",
  order_completed: "Order completed",
  order_alert: "New website order (you)",
  concern_autoreply: "Concern auto-reply",
  concern_alert: "Concern alert (you)",
  concern_reply: "Concern reply",
  digest: "Daily digest (you)",
  test: "Test",
};
