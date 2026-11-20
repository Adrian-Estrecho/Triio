# Triio — NFC cards, profiles, orders, costs & leads

One system for running Triio:

- **Public pages:** a digital profile with a Save Contact button, plus review cards that send customers straight to the Google review page.
- **Admin dashboard:** leads and outreach, customers, orders, digital profiles, NFC cards (with QR codes), costs per card, and profit.

Built with Next.js 16, Supabase (database + login + image storage) and Tailwind CSS.

---

## How the cards work

Every card has a permanent code, and you write **one link** to the chip:

```
https://triio.vercel.app/c/8KX29A
```

When someone taps the card, the system looks up the code:

| Card type | What happens on tap |
|---|---|
| **Review** | Goes straight to the business's Google review link |
| **Profile** | Shows the digital profile (Call, Email, Directions, Save Contact, review button, links) |
| **Link** | Goes to any link you choose (a menu, a booking page, etc.) |
| **Personal** | The owner sets up their own profile. It opens with an animated "Hi, I'm {name}" intro, then their profile |

You can change where a card goes, or turn it off, from the admin dashboard. You never have to reprogram the chip. Each tap is counted (no personal data is stored).

> ⚠️ Once you've programmed real cards, **don't change `NEXT_PUBLIC_SITE_URL`**. If you add a custom domain later, keep the `triio.vercel.app` address attached in Vercel (it stays on by default) so the old cards keep working.

---

## 1. Install the tools (once)

1. **Node.js 20 or newer:** https://nodejs.org (download the LTS version)
2. **VS Code:** https://code.visualstudio.com
3. A free **Supabase** account: https://supabase.com

## 2. Create the database

1. In Supabase, click **New project**. Name it `triio`, pick the **Southeast Asia (Singapore)** region, and save the database password somewhere safe.
2. Open **SQL Editor → New query**, paste everything in `supabase/schema.sql`, and click **Run**.
3. In another new query, paste everything in `supabase/automations.sql` and **Run**. This adds the lead finder, emails, concerns and alerts.
4. In another new query, paste everything in `supabase/web-orders.sql` and **Run**. This lets customers order on the website (`/order`).
5. Optional demo data: in a new query, paste `supabase/seed.sql` and **Run**.

## 3. Create your admin login

1. Go to **Authentication → Users → Add user → Create new user**. Enter your email and a password, and tick **Auto Confirm User**.
2. Go to **Authentication → Sign In / Providers**:
   - Leave **"Allow new users to sign up" on**. Personal-card owners create their own accounts. That's safe: a new account can only see and edit its own profile, and only people in `admin_users` can open the dashboard.
   - Turn **off "Confirm email"** (recommended). Supabase's built-in email only sends a few messages an hour, and new card owners would hit that limit quickly. If you keep it on, add `https://triio.vercel.app/auth/callback` and `http://localhost:3000/auth/callback` under **Authentication → URL Configuration → Redirect URLs**.
3. In **SQL Editor**, run this with your email:

```sql
insert into admin_users (user_id)
select id from auth.users where email = 'you@example.com';
```

## 4. Run it in VS Code

1. Unzip the project and open the `triio` folder in VS Code (**File → Open Folder**).
2. Copy `.env.example` to a new file called **`.env.local`**, then fill it in from Supabase. Go to **Project Settings → API Keys** (or click **Connect** at the top), copy the **Project URL** and the **anon / publishable key**, and keep `NEXT_PUBLIC_SITE_URL=http://localhost:3000` for now.
3. Open the terminal (**Terminal → New Terminal**) and run:

```bash
npm install
npm run dev
```

4. Open **http://localhost:3000/admin** and log in.
5. With the demo data loaded, open http://localhost:3000/c/DEMO01 to see a profile card.

## 5. Put it online (free) — Vercel

Phones can't open `localhost`, so deploy before you program real cards.

1. Put the project on GitHub. In VS Code: **Source Control → Publish to GitHub** (private is fine).
2. Go to https://vercel.com, sign in with GitHub, click **Add New → Project**, and import the repo. Name the project **triio** to get `triio.vercel.app` (if that's taken, Vercel shows the address you got instead).
3. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` = `https://triio.vercel.app` (your real Vercel address)
4. Click **Deploy**.
5. In Supabase, go to **Authentication → URL Configuration** and set **Site URL** to your Vercel address.

`vercel.json` has a daily job that pings `/api/keepalive`. That keeps the free Supabase database from pausing after a week with no activity. Without it, a paused database would make every card stop working.

**Prefer Render?** Create a **Web Service** from the same GitHub repo with build command `npm install && npm run build`, start command `npm start`, and the same 3 environment variables (`NEXT_PUBLIC_SITE_URL` = your `onrender.com` address). Render's free tier sleeps when idle, so the first tap after a quiet period can take 30–60 seconds. That's why Vercel is the better choice for cards.

---

## Daily workflow

1. **Leads:** add businesses (or paste a list: `Name | Area | Category | Tier`). After every visit or message, open the lead, **log the contact**, and set a follow-up date. Follow-ups due show up on the dashboard.
2. **Won a lead?** Click **Won → make customer**.
3. **Order:** from the customer page or Orders. Move it through the stages: Designing → For approval → Production → Quality check → Ready → Completed. Record payments (GCash, cash and so on).
4. **Profile** (Profile cards only): fill in the logo, brand color, buttons, Google review link and custom buttons. The live preview on the right updates when you save.
5. **Card:** create it from the profile page, the order page or NFC cards. Copy its link.
6. **Program the chip:** in the **NFC Tools** app, go to Write → Add record → URL → paste the link → Write. Then tap-test on Android and iPhone, and click **Mark tested**.
7. **QR backup:** on the card page, download the QR as SVG and put it on the print design.
8. **Costs:** log every purchase (PVC, print sheets, chips, packaging, transport) and every production batch (cards attempted vs. sellable). The system works out your **actual cost per sellable card**, defect rate, minutes per card, and margin per product.

## Automations

Open **Admin → Automations**. Every morning at 8:00 (Manila time) it:

1. **Finds new businesses** near you (if you turn on the lead finder) and adds them to Leads. It skips businesses you already have. With a Google key, each one gets a tier from its review count: under 30 reviews is **Tier A**, your best prospects.
2. **Sends welcome emails** to new customers that didn't get one.
3. **Checks what needs attention** and emails you a digest: overdue follow-ups, late or stuck orders, unpaid balances, concerns waiting for a reply, interested leads with no next step, and delivered cards with no taps in 30 days. You see the same list on the Dashboard under **Needs attention**.

Emails that go out on their own:

| When | Who gets it |
|---|---|
| You add a customer with an email (or win a lead that has one) | Customer: welcome + how the cards work |
| An order is created / moved to *For approval* / *Ready* / *Completed* | Customer: order update (each stage is sent only once) |
| Someone sends a concern on `/support` | Them: auto-reply with a ticket number. You: an alert email |
| Every morning, if something needs attention | You: the daily digest |

Each one can be turned off on the Automations page. Every email is logged (Automations → Recent emails, and on the customer's page).

**Concerns:** share `https://triio.vercel.app/support` (every email links to it automatically). Messages land in **Admin → Concerns**, where you can reply by email and mark them resolved. `/support?card=8KX29A` pre-fills a card code.

### Set it up

1. **Email (Resend, free for 3,000 emails/month).** Sign up at https://resend.com, create an API key, and add `RESEND_API_KEY` to `.env.local` and to Vercel. Set `ADMIN_ALERT_EMAIL` (your Gmail) and `EMAIL_REPLY_TO` (where customer replies go).
   - Until you **verify a domain** in Resend (**Domains → Add domain**, then add the DNS records it shows), Resend only delivers to your own email address. That's fine for testing. Before emailing customers, verify a domain and set `EMAIL_FROM=Triio <hello@yourdomain.com>`.
2. **Lead finder.** It works right away with OpenStreetMap (free, no key), but OpenStreetMap lists fewer Philippine businesses and has no review counts. For better results, create a **Google Places API (New)** key in Google Cloud Console (APIs & Services → enable *Places API (New)* → Credentials → API key, restricted to that API), then set `GOOGLE_PLACES_API_KEY`. Three searches a day stays inside Google's free monthly allowance, but Google still needs a billing account on file, so set a budget alert. Google's terms limit how long you may keep its place data, so treat found leads as a to-visit list and confirm details in person.
   - The areas it searches are in `DISCOVERY_AREAS` in `src/lib/constants.ts` (center point + radius). Add more there.
3. **The 8:00 AM schedule (Vercel).** Add two environment variables in Vercel: `CRON_SECRET` (any long random text) and `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API Keys → *service_role*). Redeploy. `vercel.json` already has the schedule.
4. On **Automations**, enter your alert email, press **Send test email**, then **Run daily automation now** to try everything.

## Orders from the website

The home page shows the cards and prices, and **Order a card** opens `/order`. A customer picks a card and quantity, fills in their business, mobile, email, area and preferred payment, and presses **Place order**. Nothing is charged online.

- The order lands in **Admin → Orders** as **New** with a **Website** badge. The customer is added to **Customers** (or matched by email if they already exist). Their delivery address, payment choice, Google review link and design notes are in the order notes.
- The customer gets the usual "We got your order" email, and you get a **New website order** alert at your alert email. The dashboard shows **New orders to confirm** until you move them on.
- **Card design:** for review cards, customers choose our standard design (blue, "We would appreciate your Google review!") or **Customize**: a band color, a headline (presets or their own words, up to 60 characters), with a live preview using their business name. Their choices appear at the top of the order notes. Ask for their logo when you confirm. Colors and headline presets are in `CARD_COLORS` and `HEADLINES` in `src/lib/shop.ts`.
- Your next step: message them to confirm, send payment details, then move the order to **Awaiting payment**.
- Prices are set in the database (`submit_order()` in `supabase/web-orders.sql`) so nobody can change them from the browser. If you change a price, change it there **and** in `PRODUCTS` in `src/lib/constants.ts`, then re-run that file.
- Limits: 3 website orders per email per day, 30 per hour overall.

## Personal cards (the owner edits their own profile)

1. **NFC cards → Create cards → Card type: Personal**. Type the **buyer name** from the order (Shopee, Lazada, TikTok Shop…), and put the order number in **Label**. No profile or link is needed.
2. Open the card and click **Print packaging insert**. It prints a 95 × 140 mm insert with "Hi {name}!", three setup steps, their private **setup code** and a QR backup. Print at 100%, cut it out and pack it with the card.
3. On the first tap, the card greets them: **"Hi Maria, your card is ready"**. Their name is already filled in, so they enter the setup code, their email and a password. The card is now theirs, and it opens their profile.
4. To edit later, they tap **their photo** on the card and choose **Edit Profile**. They log in if needed, then change their photo, details, links, colors and intro in **Settings** (`/me`).
5. Lost access, or gave the card away? On the card page, click **Reset setup (new code)**. Their old profile is kept, and the card shows the setup screen again.

## Getting the Google review link

Use the business's **Google Business Profile → Read reviews / Ask for reviews → Copy link**. The link looks like `https://g.page/r/XXXX/review`. If the owner can't find it, look up the business in Google's **Place ID Finder** (developers.google.com/maps/documentation/places/web-service/place-id) and use `https://search.google.com/local/writereview?placeid=PLACE_ID`. Always test the link before programming the card.

## Prices & settings

Products and default prices are in `src/lib/constants.ts` (Review card ₱449, Profile card ₱999, Barber/Salon pack ₱999, Extra card ₱199). Edit them there. The ₱5,000 starting capital used on the dashboard is set in the same file.

## Project map

```
supabase/schema.sql        tables, security rules, public functions, image bucket
supabase/seed.sql          optional demo data
src/app/c/[code]           the link on every chip: redirect, show the profile, or set up a new personal card
src/app/me                 card owners log in and edit their own profile (Settings)
src/app/auth/callback      finishes "confirm your email" links
src/components/personal    name intro animation, setup screen, tap-photo-to-edit sheet
src/app/p/[slug]           shareable profile page
src/app/p/[slug]/vcard     Save Contact (.vcf)
src/app/admin/...          dashboard, leads, customers, orders, profiles, cards, costs
src/app/admin/actions.ts   everything that saves data
src/app/admin/automations  automations page + its actions (lead finder, settings, concern replies)
src/app/admin/concerns     concerns inbox
src/app/support            public support / concern form
src/app/order              public order page + its action (calls submit_order)
src/components/marketing   home page pieces: the tap animation, card renders, header/footer
src/lib/shop.ts            what the website sells (names, copy; prices come from constants.ts)
supabase/web-orders.sql    orders.source + submit_order() for website orders
src/app/api/cron/daily     the 8:00 AM job
src/lib/automation         lead finder, alerts, daily run, email triggers
src/lib/email              sending (Resend) and email templates
supabase/automations.sql   tables + submit_concern() for the automations
src/components/ProfileView.tsx   the public profile design
src/lib/constants.ts       products, prices, statuses, areas
src/proxy.ts               keeps logged-out visitors out of /admin and /me
```

## Security

- Every table has Row Level Security on. Only users in `admin_users` can read or change data.
- Public pages read data only through two database functions (`resolve_card`, `get_public_profile`). Those return only the fields meant for display, never your notes, prices, leads or costs.
- Only admins can upload logos. Card owners can only upload into their own folder (`owners/{their user id}/`).
- Card owners can read and change **only their own** profile. A database trigger stops them from changing its link, owner, customer, review link or live status.
- A personal card can only be claimed with its setup code. After 10 wrong codes it locks until you make a new code.
- The public pages and the admin never use Supabase's `service_role` key. Only the **8:00 AM automation** (`/api/cron/daily`) uses it, because nobody is logged in when it runs. Add it **only** as `SUPABASE_SERVICE_ROLE_KEY` in Vercel (never with a `NEXT_PUBLIC_` prefix, never in Git). That route only runs when the request carries your `CRON_SECRET`. If you skip both, everything else still works and you can press **Run daily automation now** yourself.
- The public support form writes through one database function (`submit_concern`). It checks the input, allows 3 messages per email per day, and returns only the ticket number. The automatic reply never repeats what the sender typed, so the form can't be used to send spam to other people.
