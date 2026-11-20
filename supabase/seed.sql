-- Optional demo data. Run AFTER schema.sql if you want something to look at.
-- Delete these rows from the admin dashboard once you have real customers.

with c as (
  insert into customers (business_name, contact_person, phone, area, notes)
  values ('Triio Demo Cafe', 'Demo Owner', '09171234567', 'Marikina', 'Demo record — safe to delete')
  returning id
), p as (
  insert into profiles (customer_id, slug, display_name, tagline, description, phone, email,
                        website, address, maps_url, review_url, facebook, instagram, links,
                        accent_color, theme)
  select id, 'demo-cafe', 'Triio Demo Cafe', 'Specialty coffee in Marikina',
         'This is a sample profile. Edit it in the admin dashboard to see changes live.',
         '09171234567', 'hello@example.com', 'https://example.com',
         'J.P. Rizal St, Marikina City', 'https://maps.google.com/?q=Marikina',
         'https://search.google.com/local/writereview?placeid=REPLACE_WITH_PLACE_ID',
         'https://facebook.com/', 'https://instagram.com/',
         '[{"label":"View our menu","url":"https://example.com/menu"},{"label":"Book a table","url":"https://example.com/book"}]'::jsonb,
         '#38BDF8', 'dark'
  from c
  returning id, customer_id
)
insert into nfc_cards (card_code, card_type, customer_id, profile_id, label, status)
select 'DEMO01', 'profile', customer_id, id, 'Demo profile card', 'tested' from p;

insert into nfc_cards (card_code, card_type, destination_url, label, status)
values ('DEMO02', 'review', 'https://search.google.com/local/writereview?placeid=REPLACE_WITH_PLACE_ID',
        'Demo review card', 'tested');

insert into expenses (spent_on, category, description, quantity, amount, yield_cards) values
  (current_date, 'material', 'PVC sheets (10 sheets)', 10, 300, 50),
  (current_date, 'printing', 'Printed design sheets (4 sheets)', 4, 400, 20),
  (current_date, 'nfc_chip', 'NTAG213 chips (20 pcs)', 20, 120, 20);
