import { PRODUCTS } from "@/lib/constants";

/**
 * What the website sells. Prices come from PRODUCTS (src/lib/constants.ts), and the
 * database sets the real price in submit_order() (supabase/web-orders.sql). Keep all three in sync.
 */
export type ShopProduct = {
  value: "review_card" | "profile_card" | "barber_pack" | "extra_card";
  name: string;
  price: number;
  unit: string;
  pitch: string;
  opens: string;
  includes: string[];
  bestFor: string;
  /** How the little card render looks for this product. */
  face: "review" | "profile" | "pack" | "extra";
};

const price = (v: ShopProduct["value"]) => PRODUCTS.find((p) => p.value === v)?.price ?? 0;

export const SHOP_PRODUCTS: ShopProduct[] = [
  {
    value: "review_card",
    name: "Review card",
    price: price("review_card"),
    unit: "per card",
    pitch: "Customers tap it and land on your Google review page, ready to rate.",
    opens: "Your Google review page",
    includes: ["Standard design, or your colors, logo and words", "3M foam tape: sticks to counters, walls and tables", "Programmed and tested on iPhone and Android"],
    bestFor: "Counters, tables and checkout",
    face: "review",
  },
  {
    value: "profile_card",
    name: "Profile card",
    price: price("profile_card"),
    unit: "per card",
    pitch: "Opens your digital business page: call, directions, Save Contact, socials and a review button.",
    opens: "Your digital business profile",
    includes: ["Your colors and logo on the card", "Your own profile page, set up for you", "Save Contact straight to their phone"],
    bestFor: "Owners, sales staff and clinics",
    face: "profile",
  },
  {
    value: "barber_pack",
    name: "Barber & Salon pack",
    price: price("barber_pack"),
    unit: "3 review cards",
    pitch: "Three review cards for three chairs or stations, at the price of one profile card.",
    opens: "Your Google review page",
    includes: ["3 review cards in the same design", "3M foam tape on each", "Programmed and tested on iPhone and Android"],
    bestFor: "Barbershops and salons",
    face: "pack",
  },
  {
    value: "extra_card",
    name: "Extra card",
    price: price("extra_card"),
    unit: "per card",
    pitch: "One more card for another table, chair or staff member. Same design, same link.",
    opens: "The same page as your other card",
    includes: ["Matches your existing design", "Programmed and tested"],
    bestFor: "Adding to an order you already have",
    face: "extra",
  },
];

export const PAYMENT_OPTIONS = [
  { value: "GCash", label: "GCash" },
  { value: "Maya", label: "Maya" },
  { value: "Bank transfer", label: "Bank transfer" },
  { value: "Cash", label: "Cash on delivery" },
] as const;

/* ───────── Card design (the review plate) ───────── */

/** Band colors customers can pick. "Standard" is the stock design. */
export const CARD_COLORS = [
  { value: "standard", label: "Standard blue", hex: "#1d4fc4" },
  { value: "black", label: "Black", hex: "#16181d" },
  { value: "coffee", label: "Coffee", hex: "#6b3f2a" },
  { value: "rose", label: "Rose", hex: "#be185d" },
  { value: "teal", label: "Teal", hex: "#0f766e" },
  { value: "red", label: "Red", hex: "#b91c1c" },
  { value: "green", label: "Forest", hex: "#166534" },
  { value: "violet", label: "Violet", hex: "#5b21b6" },
] as const;

export type CardColor = (typeof CARD_COLORS)[number]["value"];

export const STANDARD_HEADLINE = "We would appreciate your Google review!";

export const HEADLINES = [
  STANDARD_HEADLINE,
  "Enjoyed your visit? Leave us a review!",
  "Salamat! Rate us on Google",
  "Loved it here? Tell Google about it!",
] as const;

export const HEADLINE_MAX = 60;

/** Business-style examples for the "Make it yours" section. */
export const DESIGN_PRESETS = [
  { key: "standard", label: "Standard", color: "standard", business: null, initials: null, headline: STANDARD_HEADLINE },
  { key: "cafe", label: "Café", color: "coffee", business: "Kapihan sa Kanto", initials: "K", headline: "Enjoyed your coffee? Leave us a review!" },
  { key: "barber", label: "Barbershop", color: "black", business: "Fade Kings", initials: "FK", headline: "Fresh cut? Tell Google about it!" },
  { key: "salon", label: "Salon", color: "rose", business: "Glow Studio", initials: "G", headline: "Love your look? Leave us a review!" },
  { key: "clinic", label: "Clinic", color: "teal", business: "Smile Dental", initials: "SD", headline: "How was your visit? Tap to review us" },
] as const satisfies readonly { key: string; label: string; color: CardColor; business: string | null; initials: string | null; headline: string }[];

export function colorHex(value: string | null | undefined) {
  return (CARD_COLORS.find((c) => c.value === value) ?? CARD_COLORS[0]).hex;
}

/** "Glow Studio" → "GS". */
export function initialsOf(name: string | null | undefined) {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
}

export const ORDER_PURPOSES = [
  { value: "business", label: "Business" },
  { value: "personal", label: "Personal use" },
] as const;

export type OrderPurpose = (typeof ORDER_PURPOSES)[number]["value"];

export function shopProduct(value: string | null | undefined) {
  return SHOP_PRODUCTS.find((p) => p.value === value) ?? null;
}
