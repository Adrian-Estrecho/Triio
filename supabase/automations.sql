-- =====================================================================
-- Triio — automations (lead finder, emails, concerns, alerts)
-- Run this whole file once in Supabase → SQL Editor → New query → Run,
-- AFTER schema.sql. Safe to re-run.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Leads: extra fields filled in by the automatic lead finder
-- ---------------------------------------------------------------------
alter table leads add column if not exists source text not null default 'manual';   -- manual | google | osm
alter table leads add column if not exists place_id text;                          -- Google place id or "osm:node/123"
alter table leads add column if not exists rating numeric(2,1);
alter table leads add column if not exists review_count int;
alter table leads add column if not exists website text;
alter table leads add column if not exists email text;
create unique index if not exists leads_place_id_key on leads(place_id);           -- NULLs never collide

-- Customers: remember when the welcome email went out
alter table customers add column if not exists welcome_sent_at timestamptz;


-- ---------------------------------------------------------------------
-- Settings (one row)
-- ---------------------------------------------------------------------
create table if not exists automation_settings (
  id int primary key default 1 check (id = 1),
  alert_email text,                                           -- where alerts + the daily digest go
  digest_enabled boolean not null default true,
  welcome_enabled boolean not null default true,
  order_emails_enabled boolean not null default true,
  concern_autoreply_enabled boolean not null default true,
  discovery_enabled boolean not null default false,
  discovery_areas text[] not null default array['Marikina','Antipolo','Cubao / QC'],
  discovery_categories text[] not null default array['Cafe','Restaurant','Barbershop','Salon','Clinic'],
  discovery_searches_per_run int not null default 3 check (discovery_searches_per_run between 1 and 10),
  discovery_cursor int not null default 0,
  updated_at timestamptz not null default now()
);
insert into automation_settings (id) values (1) on conflict (id) do nothing;


-- ---------------------------------------------------------------------
-- Run history + every email sent
-- ---------------------------------------------------------------------
create table if not exists automation_runs (
  id bigserial primary key,
  kind text not null,                                         -- daily | discovery
  trigger text not null default 'cron' check (trigger in ('cron','manual')),
  status text not null default 'ok' check (status in ('ok','partial','error')),
  summary text,
  details jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists automation_runs_started_idx on automation_runs(started_at desc);

create table if not exists email_log (
  id bigserial primary key,
  kind text not null,                                         -- welcome | order_new | concern_reply | digest | …
  to_email text not null,
  subject text not null,
  status text not null check (status in ('sent','failed','skipped')),
  error text,
  provider_id text,
  related_id uuid,                                            -- customer, order or concern id
  body text,                                                  -- kept for concern replies (conversation history)
  created_at timestamptz not null default now()
);
create index if not exists email_log_related_idx on email_log(related_id, created_at desc);
create index if not exists email_log_created_idx on email_log(created_at desc);


-- ---------------------------------------------------------------------
-- Customer concerns (from the public /support form)
-- ---------------------------------------------------------------------
create table if not exists concerns (
  id uuid primary key default gen_random_uuid(),
  ticket_no serial unique,
  name text,
  email text not null,
  phone text,
  business_name text,
  topic text not null default 'general' check (topic in ('general','order','card_problem','billing','other')),
  card_code text,
  message text not null,
  status text not null default 'open' check (status in ('open','in_progress','resolved')),
  customer_id uuid references customers(id) on delete set null,
  admin_notes text,
  first_reply_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists concerns_status_idx on concerns(status, created_at desc);
create index if not exists concerns_email_idx on concerns(lower(email), created_at desc);

drop trigger if exists concerns_touch on concerns;
create trigger concerns_touch before update on concerns for each row execute function touch_updated_at();


-- ---------------------------------------------------------------------
-- Row Level Security: admin-only, same as every other table
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['automation_settings','automation_runs','email_log','concerns'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists admin_all on %I', t);
    execute format('create policy admin_all on %I for all to authenticated using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- Public: submit a concern without logging in.
-- Validates input, rate-limits (3 per email per day, 30 per hour overall),
-- links the concern to a customer with the same email, and returns the
-- ticket number. It never returns anything else from the database.
-- ---------------------------------------------------------------------
create or replace function submit_concern(
  p_name text, p_email text, p_phone text, p_business text,
  p_topic text, p_card_code text, p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  em  text := lower(trim(coalesce(p_email, '')));
  msg text := trim(coalesce(p_message, ''));
  tp  text := coalesce(nullif(trim(p_topic), ''), 'general');
  cid uuid;
  r   concerns;
  autoreply boolean;
begin
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(em) > 200 then
    return jsonb_build_object('ok', false, 'error', 'Please enter a valid email address.');
  end if;
  if length(msg) < 5 then
    return jsonb_build_object('ok', false, 'error', 'Please tell us a bit more about your concern.');
  end if;
  if tp not in ('general','order','card_problem','billing','other') then tp := 'general'; end if;

  if (select count(*) from concerns where lower(email) = em and created_at > now() - interval '1 day') >= 3 then
    return jsonb_build_object('ok', false, 'error', 'We already have your recent messages. We''ll get back to you soon.');
  end if;
  if (select count(*) from concerns where created_at > now() - interval '1 hour') >= 30 then
    return jsonb_build_object('ok', false, 'error', 'We''re getting a lot of messages right now. Please try again in an hour.');
  end if;

  select id into cid from customers where lower(email) = em order by created_at limit 1;

  insert into concerns (name, email, phone, business_name, topic, card_code, message, customer_id)
  values (
    left(nullif(trim(p_name), ''), 100), em, left(nullif(trim(p_phone), ''), 40),
    left(nullif(trim(p_business), ''), 150), tp, upper(left(nullif(trim(p_card_code), ''), 12)),
    left(msg, 4000), cid
  )
  returning * into r;

  select coalesce((select concern_autoreply_enabled from automation_settings where id = 1), true) into autoreply;

  return jsonb_build_object('ok', true, 'id', r.id, 'ticket_no', r.ticket_no, 'autoreply', autoreply);
end $$;

revoke all on function submit_concern(text, text, text, text, text, text, text) from public;
grant execute on function submit_concern(text, text, text, text, text, text, text) to anon, authenticated;
