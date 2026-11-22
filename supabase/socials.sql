-- =====================================================================
-- SOCIALS: YouTube and LinkedIn on every profile
-- Run once in Supabase → SQL Editor, AFTER offerings.sql. Safe to run again.
--
-- The social bar now shows Facebook, Instagram, TikTok, YouTube and LinkedIn.
-- Messenger, WhatsApp and Viber stay in the table (business pages use them for
-- the "Ask about this" button on products), they're just no longer social links.
-- =====================================================================

alter table profiles add column if not exists youtube text;
alter table profiles add column if not exists linkedin text;

do $$
begin
  alter table profiles add constraint profiles_youtube_len check (youtube is null or char_length(youtube) <= 300);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table profiles add constraint profiles_linkedin_len check (linkedin is null or char_length(linkedin) <= 300);
exception when duplicate_object then null;
end $$;

-- Public fields now include YouTube and LinkedIn.
-- Built from the row itself, keeping only the public keys, so a column that doesn't
-- exist yet is simply left out instead of breaking this function.
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
