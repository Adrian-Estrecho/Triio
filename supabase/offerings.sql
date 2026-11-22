-- =====================================================================
-- OFFERINGS: products & services on a business profile
-- Run once in Supabase → SQL Editor, AFTER wallet.sql and games.sql. Safe to run again.
-- =====================================================================

-- A list of items: [{ id, title, price, category, description, image, url }].
-- The admin app validates every field; the database only checks it's a short list.
alter table profiles add column if not exists offerings jsonb not null default '[]'::jsonb;
alter table profiles add column if not exists offerings_title text;

do $$
begin
  alter table profiles add constraint profiles_offerings_list
    check (jsonb_typeof(offerings) = 'array' and jsonb_array_length(offerings) <= 24);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table profiles add constraint profiles_offerings_title_len
    check (offerings_title is null or char_length(offerings_title) <= 40);
exception when duplicate_object then null;
end $$;

-- Public fields now include the offerings.
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
