-- =====================================================================
-- WALLET: QR passes on a personal profile (GCash, Maya, bank QR, links…)
-- Run in Supabase → SQL Editor, after schema.sql. Safe to run again, and
-- safe to run before or after games.sql (neither one undoes the other).
-- =====================================================================

-- A list of passes: [{ id, kind, title, name, number, color, qr_text, qr_image, bank, logo }].
-- The app validates every field; the database only checks it's a short list.
alter table profiles add column if not exists wallet jsonb not null default '[]'::jsonb;

-- Fix any odd values first, so the check below can be added.
update profiles set wallet = '[]'::jsonb where jsonb_typeof(wallet) is distinct from 'array';

-- (CASE so a non-list value fails the check instead of raising an error.)
alter table profiles drop constraint if exists profiles_wallet_list;
alter table profiles add constraint profiles_wallet_list
  check (case when jsonb_typeof(wallet) = 'array' then jsonb_array_length(wallet) <= 8 else false end);

-- The public fields of a profile, now including the wallet (shown on the card's Wallet tab).
-- Built from the row itself, keeping only the public keys: a column that doesn't exist yet
-- (e.g. games, before games.sql) is simply left out instead of breaking this function,
-- and running this file again never removes fields added by other files.
create or replace function public_profile_json(p profiles)
returns jsonb language sql stable as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
  from jsonb_each(to_jsonb(p))
  where key = any (array[
    'slug', 'display_name', 'tagline', 'description', 'logo_url', 'cover_url',
    'phone', 'email', 'website', 'address', 'maps_url', 'review_url',
    'facebook', 'instagram', 'tiktok', 'youtube', 'linkedin',
    'messenger', 'whatsapp', 'viber', 'links',
    'accent_color', 'theme', 'kind', 'intro_enabled', 'intro_greeting',
    'wallet', 'games', 'offerings', 'offerings_title'
  ]);
$$;

-- Let the API see the new column right away.
notify pgrst, 'reload schema';
