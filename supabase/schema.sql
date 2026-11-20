-- =====================================================================
-- Triio — database schema
-- Run this whole file once in Supabase → SQL Editor → New query → Run.
-- Safe to re-run: it uses "if not exists" / "or replace" where possible.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Admins: only users listed here can use the admin dashboard.
-- ---------------------------------------------------------------------
create table if not exists admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from admin_users where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- Customers (the businesses that buy cards)
-- ---------------------------------------------------------------------
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_person text,
  email text,
  phone text,
  area text,
  address text,
  notes text,
  lead_id uuid,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Digital profiles (what a Profile card opens)
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  slug text unique not null,
  display_name text not null,
  tagline text,
  description text,
  logo_url text,
  cover_url text,
  phone text,
  email text,
  website text,
  address text,
  maps_url text,
  review_url text,
  facebook text,
  instagram text,
  tiktok text,
  messenger text,
  whatsapp text,
  viber text,
  links jsonb not null default '[]'::jsonb,       -- [{ "label": "Menu", "url": "https://..." }]
  accent_color text not null default '#38BDF8',
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_no serial unique,
  customer_id uuid references customers(id) on delete set null,
  product text not null default 'review_card',
  quantity int not null default 1 check (quantity > 0),
  unit_price numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) generated always as (quantity * unit_price - discount) stored,
  status text not null default 'new' check (status in (
    'new','awaiting_payment','designing','for_approval','production',
    'quality_check','ready','completed','cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','partial','paid','refunded')),
  amount_paid numeric(10,2) not null default 0,
  payment_method text,
  direct_cost numeric(10,2),                      -- optional: actual cost for this order
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- NFC cards
--   card_type = 'profile' → opens the linked profile
--   card_type = 'review'  → redirects to destination_url (Google review link)
--   card_type = 'link'    → redirects to destination_url (any link)
-- The chip always stores  {SITE_URL}/c/{card_code}  so the destination
-- can change later without reprogramming the chip.
-- ---------------------------------------------------------------------
create table if not exists nfc_cards (
  id uuid primary key default gen_random_uuid(),
  card_code text unique not null,
  card_type text not null default 'review' check (card_type in ('review','profile','link')),
  customer_id uuid references customers(id) on delete set null,
  profile_id uuid references profiles(id) on delete set null,
  order_id uuid references orders(id) on delete set null,
  destination_url text,
  label text,                                     -- e.g. "Counter", "Chair 2"
  chip_type text not null default 'NTAG213',
  status text not null default 'pending' check (status in ('pending','programmed','tested','delivered','disabled')),
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Anonymous tap log (no IP, no device data — just which card and when)
create table if not exists card_taps (
  id bigserial primary key,
  card_id uuid not null references nfc_cards(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists card_taps_card_idx on card_taps(card_id, created_at desc);

-- ---------------------------------------------------------------------
-- Costs
--   expenses: every peso spent (materials, packaging, transport, marketing…)
--   production_batches: how many cards you attempted vs. how many were sellable
-- Cost per sellable card = (material + packaging spend) ÷ sellable cards
-- ---------------------------------------------------------------------
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null default current_date,
  category text not null default 'material' check (category in (
    'material','printing','nfc_chip','packaging','transport','marketing','software','other')),
  description text not null,
  quantity numeric(10,2),
  amount numeric(10,2) not null check (amount >= 0),
  yield_cards int,                                -- how many cards this purchase can make
  order_id uuid references orders(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists production_batches (
  id uuid primary key default gen_random_uuid(),
  made_on date not null default current_date,
  attempted int not null check (attempted >= 0),
  sellable int not null check (sellable >= 0),
  minutes_spent int,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Leads + outreach
-- ---------------------------------------------------------------------
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  category text,
  area text,
  tier text check (tier in ('A','B','C')),
  status text not null default 'new' check (status in ('new','contacted','interested','demo','won','lost')),
  contact_person text,
  phone text,
  facebook text,
  maps_url text,
  address text,
  next_follow_up date,
  notes text,
  customer_id uuid references customers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists outreach (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  contacted_on date not null default current_date,
  channel text not null default 'visit' check (channel in ('visit','facebook','instagram','sms','call','email','other')),
  summary text,
  outcome text check (outcome in ('no_answer','not_interested','follow_up','demo_booked','sold')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','orders','nfc_cards','leads'] loop
    execute format('drop trigger if exists %I_touch on %I', t, t);
    execute format('create trigger %I_touch before update on %I for each row execute function touch_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Row Level Security: everything is admin-only.
-- The public never reads tables directly; it uses the functions below.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['admin_users','customers','profiles','orders','nfc_cards','card_taps',
                           'expenses','production_batches','leads','outreach'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists admin_all on %I', t);
    execute format('create policy admin_all on %I for all to authenticated using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Public functions (callable without logging in).
-- They return ONLY the fields meant for public display.
-- ---------------------------------------------------------------------
create or replace function public_profile_json(p profiles)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'slug', p.slug, 'display_name', p.display_name, 'tagline', p.tagline,
    'description', p.description, 'logo_url', p.logo_url, 'cover_url', p.cover_url,
    'phone', p.phone, 'email', p.email, 'website', p.website, 'address', p.address,
    'maps_url', p.maps_url, 'review_url', p.review_url, 'facebook', p.facebook,
    'instagram', p.instagram, 'tiktok', p.tiktok, 'messenger', p.messenger,
    'whatsapp', p.whatsapp, 'viber', p.viber, 'links', p.links,
    'accent_color', p.accent_color, 'theme', p.theme
  );
$$;

-- Resolve a tapped card: logs the tap and returns where to go.
create or replace function resolve_card(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c nfc_cards;
  pr profiles;
begin
  select * into c from nfc_cards where card_code = upper(p_code);
  if not found or c.status = 'disabled' then
    return null;
  end if;

  insert into card_taps(card_id) values (c.id);

  if c.card_type = 'profile' then
    select * into pr from profiles where id = c.profile_id and is_active;
    if not found then return null; end if;
    return jsonb_build_object('type', 'profile', 'profile', public_profile_json(pr));
  end if;

  if c.destination_url is null or c.destination_url = '' then
    return null;
  end if;
  return jsonb_build_object('type', c.card_type, 'url', c.destination_url);
end $$;

-- Read a profile by its slug (for sharing links and Save Contact).
create or replace function get_public_profile(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select public_profile_json(p) from profiles p where p.slug = lower(p_slug) and p.is_active;
$$;

revoke all on function resolve_card(text) from public;
revoke all on function get_public_profile(text) from public;
grant execute on function resolve_card(text) to anon, authenticated;
grant execute on function get_public_profile(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Storage bucket for logos and cover photos (public read, admin write)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('brand-assets', 'brand-assets', true)
on conflict (id) do nothing;

drop policy if exists "brand assets admin insert" on storage.objects;
drop policy if exists "brand assets admin update" on storage.objects;
drop policy if exists "brand assets admin delete" on storage.objects;

create policy "brand assets admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'brand-assets' and is_admin());
create policy "brand assets admin update" on storage.objects
  for update to authenticated using (bucket_id = 'brand-assets' and is_admin());
create policy "brand assets admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'brand-assets' and is_admin());


-- =====================================================================
-- PERSONAL CARDS (self-service profiles)
-- A "personal" card is set up by its owner: on the first tap they create an
-- account, enter the setup code that came with the card, and from then on
-- they edit their own profile at /me. Safe to re-run.
-- =====================================================================

alter table profiles add column if not exists kind text not null default 'business';
alter table profiles add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table profiles add column if not exists intro_enabled boolean not null default true;
alter table profiles add column if not exists intro_greeting text;
create index if not exists profiles_owner_idx on profiles(owner_id);

alter table profiles drop constraint if exists profiles_kind_check;
alter table profiles add constraint profiles_kind_check check (kind in ('business', 'personal'));

alter table nfc_cards add column if not exists claim_code text;
alter table nfc_cards add column if not exists claim_attempts int not null default 0;
-- The buyer's name (e.g. from a Shopee / Lazada / TikTok order). The setup screen greets them with it.
alter table nfc_cards add column if not exists owner_name text;
alter table nfc_cards drop constraint if exists nfc_cards_card_type_check;
alter table nfc_cards add constraint nfc_cards_card_type_check check (card_type in ('review','profile','link','personal'));

-- Owners can read and update their own profile (admins keep full access via admin_all).
drop policy if exists owner_select on profiles;
drop policy if exists owner_update on profiles;
create policy owner_select on profiles for select to authenticated using (owner_id = auth.uid());
create policy owner_update on profiles for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Owners can't change who owns it, its link, its customer, whether it's live, or the review link.
create or replace function protect_profile_columns()
returns trigger language plpgsql as $$
begin
  if not is_admin() then
    new.owner_id    := old.owner_id;
    new.customer_id := old.customer_id;
    new.slug        := old.slug;
    new.kind        := old.kind;
    new.is_active   := old.is_active;
    new.review_url  := old.review_url;
    new.created_at  := old.created_at;
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect on profiles;
create trigger profiles_protect before update on profiles
  for each row execute function protect_profile_columns();

-- Public fields now include the profile kind and the intro settings.
create or replace function public_profile_json(p profiles)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'slug', p.slug, 'display_name', p.display_name, 'tagline', p.tagline,
    'description', p.description, 'logo_url', p.logo_url, 'cover_url', p.cover_url,
    'phone', p.phone, 'email', p.email, 'website', p.website, 'address', p.address,
    'maps_url', p.maps_url, 'review_url', p.review_url, 'facebook', p.facebook,
    'instagram', p.instagram, 'tiktok', p.tiktok, 'messenger', p.messenger,
    'whatsapp', p.whatsapp, 'viber', p.viber, 'links', p.links,
    'accent_color', p.accent_color, 'theme', p.theme,
    'kind', p.kind, 'intro_enabled', p.intro_enabled, 'intro_greeting', p.intro_greeting
  );
$$;

-- Tapped card. A personal card with no owner yet returns { type: 'setup', name: buyer name }.
create or replace function resolve_card(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c nfc_cards;
  pr profiles;
begin
  select * into c from nfc_cards where card_code = upper(p_code);
  if not found or c.status = 'disabled' then
    return null;
  end if;

  insert into card_taps(card_id) values (c.id);

  if c.card_type = 'personal' and c.profile_id is null then
    return jsonb_build_object('type', 'setup', 'name', c.owner_name);
  end if;

  if c.card_type in ('profile', 'personal') then
    select * into pr from profiles where id = c.profile_id and is_active;
    if not found then return null; end if;
    return jsonb_build_object('type', 'profile', 'profile', public_profile_json(pr));
  end if;

  if c.destination_url is null or c.destination_url = '' then
    return null;
  end if;
  return jsonb_build_object('type', c.card_type, 'url', c.destination_url);
end $$;

-- Claim an unowned personal card. The logged-in user must know the card's setup code.
-- Returns { ok: true, slug } or { ok: false, error }. After 10 wrong codes the card
-- locks until an admin makes a new setup code.
create or replace function claim_card(p_code text, p_claim text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  c nfc_cards;
  pid uuid;
  s text;
  base text;
  n int := 1;
  nm text;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'Please log in first.');
  end if;

  select * into c from nfc_cards where card_code = upper(p_code) for update;
  if not found or c.status = 'disabled' or c.card_type <> 'personal' then
    return jsonb_build_object('ok', false, 'error', 'This card can''t be set up.');
  end if;
  if c.profile_id is not null then
    return jsonb_build_object('ok', false, 'error', 'This card has already been set up.');
  end if;
  if c.claim_attempts >= 10 then
    return jsonb_build_object('ok', false, 'error', 'Too many wrong codes. Please contact Triio to unlock this card.');
  end if;
  if c.claim_code is null or upper(regexp_replace(coalesce(p_claim, ''), '\s', '', 'g')) <> c.claim_code then
    update nfc_cards set claim_attempts = claim_attempts + 1 where id = c.id;
    return jsonb_build_object('ok', false, 'error', 'That setup code isn''t right. Check the code that came with your card.');
  end if;

  -- The name they typed, or the buyer name entered when the card was made.
  nm := left(trim(coalesce(nullif(trim(p_name), ''), c.owner_name, '')), 80);

  -- Reuse the person's existing profile if they already have one (a second card, same person).
  select id, slug into pid, s from profiles where owner_id = uid order by created_at limit 1;

  if pid is null then
    if nm = '' then
      return jsonb_build_object('ok', false, 'error', 'Please enter your name.');
    end if;
    base := left(trim(both '-' from regexp_replace(lower(nm), '[^a-z0-9]+', '-', 'g')), 40);
    if base = '' then base := 'me'; end if;
    s := base;
    while exists (select 1 from profiles where slug = s) loop
      n := n + 1;
      s := base || '-' || n;
    end loop;

    insert into profiles (kind, owner_id, customer_id, slug, display_name, email)
    values ('personal', uid, c.customer_id, s, nm, (select email from auth.users where id = uid))
    returning id into pid;
  end if;

  update nfc_cards
     set profile_id = pid, claim_code = null, claim_attempts = 0,
         status = case when status in ('pending', 'programmed', 'tested') then 'delivered' else status end
   where id = c.id;

  return jsonb_build_object('ok', true, 'slug', s);
end $$;

revoke all on function resolve_card(text) from public;
revoke all on function claim_card(text, text, text) from public;
grant execute on function resolve_card(text) to anon, authenticated;
grant execute on function claim_card(text, text, text) to authenticated;

-- Owners upload their own photos into brand-assets/owners/{their user id}/...
drop policy if exists "owner photos insert" on storage.objects;
create policy "owner photos insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = 'owners'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Admin only: the login email of each personal-card owner (for Customers → Users).
-- auth.users isn't readable from the app, so this returns just id, email and last sign-in.
create or replace function admin_card_owners()
returns table (user_id uuid, email text, last_sign_in_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.email::text, u.last_sign_in_at
  from auth.users u
  where is_admin() and u.id in (select owner_id from profiles where owner_id is not null);
$$;

revoke all on function admin_card_owners() from public, anon;
grant execute on function admin_card_owners() to authenticated;
