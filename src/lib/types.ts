export type CardType = "review" | "profile" | "link" | "personal";

export type ProfileLink = { label: string; url: string };

/** Fields the public can see (returned by the get_public_profile / resolve_card functions). */
export type PublicProfile = {
  slug: string;
  display_name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  maps_url: string | null;
  review_url: string | null;
  facebook: string | null;
  instagram: string | null;
  tiktok: string | null;
  messenger: string | null;
  whatsapp: string | null;
  viber: string | null;
  links: ProfileLink[];
  accent_color: string;
  theme: "dark" | "light";
  /** "personal" = self-managed by its owner, shows the name intro. Missing on old databases. */
  kind?: "business" | "personal";
  intro_enabled?: boolean;
  intro_greeting?: string | null;
};

export type Profile = PublicProfile & {
  id: string;
  owner_id?: string | null;
  customer_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  business_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  area: string | null;
  address: string | null;
  notes: string | null;
  lead_id: string | null;
  welcome_sent_at?: string | null;
  created_at: string;
};

export type Order = {
  id: string;
  order_no: number;
  customer_id: string | null;
  product: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  status: string;
  payment_status: string;
  amount_paid: number;
  payment_method: string | null;
  direct_cost: number | null;
  due_date: string | null;
  notes: string | null;
  /** 'website' = placed on /order. Missing until supabase/web-orders.sql is run. */
  source?: "admin" | "website";
  created_at: string;
  customers?: { business_name: string } | null;
};

export type Card = {
  id: string;
  card_code: string;
  card_type: CardType;
  customer_id: string | null;
  profile_id: string | null;
  order_id: string | null;
  destination_url: string | null;
  label: string | null;
  chip_type: string;
  status: string;
  is_locked: boolean;
  claim_code?: string | null;
  /** Buyer name for a personal card (shown on the setup screen and the packaging insert). */
  owner_name?: string | null;
  claim_attempts?: number;
  created_at: string;
  customers?: { business_name: string } | null;
  profiles?: { display_name: string; slug: string } | null;
};

export type Expense = {
  id: string;
  spent_on: string;
  category: string;
  description: string;
  quantity: number | null;
  amount: number;
  yield_cards: number | null;
  order_id: string | null;
};

export type Batch = {
  id: string;
  made_on: string;
  attempted: number;
  sellable: number;
  minutes_spent: number | null;
  notes: string | null;
};

export type Lead = LeadDiscoveryFields & {
  id: string;
  business_name: string;
  category: string | null;
  area: string | null;
  tier: "A" | "B" | "C" | null;
  status: string;
  contact_person: string | null;
  phone: string | null;
  facebook: string | null;
  maps_url: string | null;
  address: string | null;
  next_follow_up: string | null;
  notes: string | null;
  customer_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Outreach = {
  id: string;
  lead_id: string;
  contacted_on: string;
  channel: string;
  summary: string | null;
  outcome: string | null;
  created_at: string;
};

/* ============================== AUTOMATIONS ============================== */

/** Extra lead fields added by supabase/automations.sql (missing on older databases). */
export type LeadDiscoveryFields = {
  source?: "manual" | "google" | "osm" | string;
  place_id?: string | null;
  rating?: number | null;
  review_count?: number | null;
  website?: string | null;
  email?: string | null;
};

export type AutomationSettings = {
  id: number;
  alert_email: string | null;
  digest_enabled: boolean;
  welcome_enabled: boolean;
  order_emails_enabled: boolean;
  concern_autoreply_enabled: boolean;
  discovery_enabled: boolean;
  discovery_areas: string[];
  discovery_categories: string[];
  discovery_searches_per_run: number;
  discovery_cursor: number;
  updated_at: string;
};

export type AutomationRun = {
  id: number;
  kind: string;
  trigger: "cron" | "manual";
  status: "ok" | "partial" | "error";
  summary: string | null;
  details: Record<string, unknown>;
  started_at: string;
  finished_at: string | null;
};

export type EmailLog = {
  id: number;
  kind: string;
  to_email: string;
  subject: string;
  status: "sent" | "failed" | "skipped";
  error: string | null;
  provider_id: string | null;
  related_id: string | null;
  body: string | null;
  created_at: string;
};

export type Concern = {
  id: string;
  ticket_no: number;
  name: string | null;
  email: string;
  phone: string | null;
  business_name: string | null;
  topic: string;
  card_code: string | null;
  message: string;
  status: "open" | "in_progress" | "resolved";
  customer_id: string | null;
  admin_notes: string | null;
  first_reply_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};
