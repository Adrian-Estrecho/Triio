-- =====================================================================
-- Triio — orders from the website (/order)
-- Run this whole file once in Supabase → SQL Editor → New query → Run,
-- AFTER schema.sql and automations.sql. Safe to re-run.
-- =====================================================================


-- Where an order came from: 'admin' (you typed it in) or 'website' (the /order page).
alter table orders add column if not exists source text not null default 'admin';
alter table orders drop constraint if exists orders_source_check;
alter table orders add constraint orders_source_check check (source in ('admin', 'website'));
create index if not exists orders_source_idx on orders(source, created_at desc);


-- ---------------------------------------------------------------------
-- Public: place an order without logging in.
--
-- - Prices are set HERE, never by the browser, so nobody can change them.
--   Keep them the same as PRODUCTS in src/lib/constants.ts.
-- - Validates the input and rate-limits (3 orders per email per day,
--   30 website orders per hour overall).
-- - Reuses the customer with the same email, or creates a new one.
-- - Returns only what the confirmation screen and emails need.
-- ---------------------------------------------------------------------
-- Older version without the business / personal question.
drop function if exists submit_order(text, int, text, text, text, text, text, text, text, text, text);

create or replace function submit_order(
  p_product text, p_quantity int,
  p_business text, p_contact text, p_email text, p_phone text,
  p_area text, p_address text, p_payment text, p_review_url text, p_notes text,
  p_purpose text default 'business'   -- 'business' or 'personal'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  em    text := lower(trim(coalesce(p_email, '')));
  biz   text := left(trim(coalesce(p_business, '')), 150);
  ph    text := left(trim(coalesce(p_phone, '')), 40);
  ct    text := left(nullif(trim(p_contact), ''), 100);
  ar    text := left(nullif(trim(p_area), ''), 60);
  addr  text := left(nullif(trim(p_address), ''), 300);
  pay   text := nullif(trim(p_payment), '');
  rev   text := left(nullif(trim(p_review_url), ''), 500);
  note  text := left(nullif(trim(p_notes), ''), 2000);
  qty   int  := coalesce(p_quantity, 1);
  purp  text := case when p_purpose = 'personal' then 'personal' else 'business' end;
  price numeric(10,2);
  cid   uuid;
  is_new_customer boolean := false;
  o     orders;
  emails_on boolean;
begin
  price := case p_product
    when 'review_card'  then 449
    when 'profile_card' then 999
    when 'barber_pack'  then 999
    when 'extra_card'   then 199
    else null
  end;
  if price is null then
    return jsonb_build_object('ok', false, 'error', 'Please choose a card.');
  end if;
  if qty < 1 or qty > 50 then
    return jsonb_build_object('ok', false, 'error', 'Quantity must be between 1 and 50. For bigger orders, message us on the support page.');
  end if;
  -- Personal orders don't need a business: file the customer under their own name.
  if purp = 'personal' and length(biz) < 2 then
    biz := left(coalesce(ct, ''), 150);
  end if;
  if length(biz) < 2 then
    return jsonb_build_object('ok', false, 'error',
      case when purp = 'personal' then 'Enter your name.' else 'Enter your business name.' end);
  end if;
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(em) > 200 then
    return jsonb_build_object('ok', false, 'error', 'Enter a valid email address. We send your order updates there.');
  end if;
  if length(regexp_replace(ph, '\D', '', 'g')) < 7 then
    return jsonb_build_object('ok', false, 'error', 'Enter a mobile number so we can arrange delivery.');
  end if;
  if pay is not null and pay not in ('GCash', 'Maya', 'Bank transfer', 'Cash') then
    pay := null;
  end if;

  -- Rate limits
  if (select count(*) from orders o2 join customers c2 on c2.id = o2.customer_id
       where o2.source = 'website' and lower(c2.email) = em and o2.created_at > now() - interval '1 day') >= 3 then
    return jsonb_build_object('ok', false, 'error', 'We already have 3 orders from this email today. Message us on the support page to add more.');
  end if;
  if (select count(*) from orders where source = 'website' and created_at > now() - interval '1 hour') >= 30 then
    return jsonb_build_object('ok', false, 'error', 'We''re getting a lot of orders right now. Please try again in an hour.');
  end if;

  -- Existing customer with this email, or a new one. Existing details are never overwritten from the public form.
  select id into cid from customers where lower(email) = em order by created_at limit 1;
  if cid is null then
    insert into customers (business_name, contact_person, email, phone, area, address, notes)
    values (biz, ct, em, ph, ar, addr,
            case when purp = 'personal' then 'Signed up by ordering on the website (personal use).'
                 else 'Signed up by ordering on the website.' end)
    returning id into cid;
    is_new_customer := true;
  end if;

  insert into orders (customer_id, product, quantity, unit_price, status, payment_status, payment_method, source, notes)
  values (
    cid, p_product, qty, price, 'new', 'unpaid', pay, 'website',
    concat_ws(E'\n',
      'Ordered on the website.',
      'For: ' || case when purp = 'personal' then 'Personal use' else 'Business' end,
      case when purp = 'personal' then 'Name on order: ' else 'Business: ' end || biz,
      'Contact: ' || concat_ws(' · ', ct, ph, em),
      'Area: ' || ar,
      'Delivery address: ' || addr,
      'Preferred payment: ' || pay,
      'Google review link: ' || rev,
      case when note is not null then E'\nNotes from the customer:\n' || note end
    )
  )
  returning * into o;

  emails_on := true;
  if to_regclass('public.automation_settings') is not null then
    execute 'select coalesce((select order_emails_enabled from automation_settings where id = 1), true)' into emails_on;
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', o.id,
    'order_no', o.order_no,
    'product', o.product,
    'quantity', o.quantity,
    'unit_price', o.unit_price,
    'total', o.total,
    'customer_id', cid,
    'new_customer', is_new_customer,
    'order_emails', emails_on
  );
end $$;

revoke all on function submit_order(text, int, text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function submit_order(text, int, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;
