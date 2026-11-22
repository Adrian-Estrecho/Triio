-- =====================================================================
-- GAME IDS: in-game IDs on a personal profile (CODM, MLBB, PUBG…)
-- Run in Supabase → SQL Editor. Safe to run again, in any order with the other files.
-- =====================================================================

-- A list of games: [{ game, title, ign, uid, server }].
-- The app validates every field; the database only checks it's a short list.
alter table profiles add column if not exists games jsonb not null default '[]'::jsonb;

do $$
begin
  alter table profiles add constraint profiles_games_list
    check (jsonb_typeof(games) = 'array' and jsonb_array_length(games) <= 10);
exception when duplicate_object then null;
end $$;

-- Public fields now include the game IDs (shown on the card so friends can add the owner).
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
