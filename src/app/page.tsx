import type { Metadata } from "next";
import Link from "next/link";
import { marketingFonts } from "./fonts";
import { siteUrl } from "@/lib/env";
import { SHOP_PRODUCTS } from "@/lib/shop";
import { peso } from "@/lib/utils";
import { Contactless, NfcCard, ProductCardArt } from "@/components/marketing/NfcCard";
import { SiteFooter, SiteHeader } from "@/components/marketing/SiteChrome";
import { TapDemo } from "@/components/marketing/TapDemo";
import { DesignShowcase } from "@/components/marketing/DesignShowcase";
import { ReviewPlate } from "@/components/marketing/ReviewPlate";

export const metadata: Metadata = {
  title: { absolute: "Triio · NFC review cards for local businesses" },
  description:
    "Custom NFC cards for cafés, barbershops, salons and clinics in Marikina, Antipolo and Cubao. Customers tap their phone and your Google review page opens. From ₱449.",
};

const ORDER_STEPS = [
  { title: "Order here", body: "Pick your card and tell us about your business. Nothing to pay yet." },
  { title: "Approve your design", body: "We send a proof with your logo and colors. Reply “Approved” or tell us what to change." },
  { title: "We program and test", body: "Every chip is written and tap-tested on iPhone and Android before it leaves us." },
  { title: "On your counter", body: "Pickup or delivery. Pay by GCash, Maya, bank transfer or cash on delivery." },
];

const PLACES = [
  { where: "Cafés & restaurants", spot: "By the register, or one on each table" },
  { where: "Barbershops & salons", spot: "At every chair or mirror station" },
  { where: "Clinics", spot: "At reception, where patients check out" },
  { where: "Shops", spot: "Next to the cashier, on the bag counter" },
];

const FAQ = [
  {
    q: "Do my customers need to download an app?",
    a: "No. iPhone XS and newer read the card on their own. Most Android phones just need NFC turned on, which it usually is.",
  },
  {
    q: "What if a customer's phone doesn't have NFC?",
    a: "We can add a QR code to your design. They point the camera at it and the same page opens.",
  },
  {
    q: "Can I change where the card goes later?",
    a: "Yes. Each card has its own permanent link, and we can point it somewhere else at any time, like your menu or a new Google listing. The card itself doesn't change.",
  },
  {
    q: "I don't know my Google review link.",
    a: "That's normal. Leave it blank when you order and we'll find it with you before we program the card.",
  },
  {
    q: "When and how do I pay?",
    a: "Nothing is charged when you order. We message you to confirm the details first. You can pay by GCash, Maya, bank transfer, or cash on delivery.",
  },
  {
    q: "Do you collect my customers' data?",
    a: "No. We only count how many times your card is tapped. No names, numbers or phone details are stored.",
  },
  {
    q: "What if a card gets lost?",
    a: "Tell us and we switch that card off, so it stops opening your page. A replacement is an extra card.",
  },
];

export default function Home() {
  const host = siteUrl().replace(/^https?:\/\//, "");
  const from = Math.min(...SHOP_PRODUCTS.filter((p) => p.value !== "extra_card").map((p) => p.price));

  return (
    <div className={`mk ${marketingFonts} min-h-dvh bg-paper text-navy`}>
      <SiteHeader />

      <main>
        {/* ───────── Hero: the tap ───────── */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-6 px-4 pt-10 pb-16 sm:px-6 md:grid-cols-[1.05fr_1fr] md:gap-10 md:pt-16 md:pb-24">
            <div className="reveal" style={{ "--r": 0 } as React.CSSProperties}>
              <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[13px] font-medium text-slate-ink ring-1 ring-navy/[0.07]">
                <Contactless className="h-4 w-4 text-sky-600" />
                NFC cards for Marikina, Antipolo & Cubao
              </p>
              <h1 className="display mt-6 text-[clamp(2.5rem,5.6vw,4.4rem)]">
                One tap from happy customer to <span className="text-sky-600">Google review.</span>
              </h1>
              <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-slate-ink">
                Most happy customers never get around to leaving a review. Put a Triio card on your counter: they hold their phone to it, and your
                review page is already open.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/order"
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-navy px-6 font-semibold text-white shadow-[0_10px_24px_-10px_rgba(17,24,39,0.6)] transition-[background-color,transform] duration-100 hover:bg-[#25314a] active:scale-[0.97]"
                >
                  Order a card
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5" /></svg>
                </Link>
                <Link
                  href="/c/DEMO01"
                  className="inline-flex h-12 items-center rounded-full bg-white px-6 font-semibold text-navy ring-1 ring-navy/10 transition-[box-shadow,transform] duration-100 hover:ring-navy/25 active:scale-[0.97]"
                >
                  See a demo profile
                </Link>
              </div>
              <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-navy/10 pt-6 text-sm">
                <div>
                  <dt className="text-slate-ink">From</dt>
                  <dd className="font-display mt-1 text-xl font-bold [font-stretch:115%]">{peso(from)}</dd>
                </div>
                <div>
                  <dt className="text-slate-ink">Works on</dt>
                  <dd className="mt-1 font-semibold">iPhone & Android</dd>
                </div>
                <div>
                  <dt className="text-slate-ink">Design</dt>
                  <dd className="mt-1 font-semibold">Made for your shop</dd>
                </div>
              </dl>
            </div>

            <div className="relative mx-auto w-full max-w-[34rem] md:max-w-none">
              <div aria-hidden="true" className="absolute inset-[8%] -z-0 rounded-full bg-[radial-gradient(closest-side,rgba(56,189,248,0.22),transparent)]" />
              <TapDemo />
            </div>
          </div>
        </section>

        {/* ───────── Cards & prices ───────── */}
        <section id="cards" className="scroll-mt-20 border-t border-navy/[0.06] bg-white">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 md:py-28">
            <div className="mk-rise flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold text-sky-700">Cards & prices</p>
                <h2 className="display mt-3 text-[clamp(2rem,4.4vw,3.4rem)]">Pick a card. We print, program and test it.</h2>
              </div>
              <p className="max-w-sm text-slate-ink">Square plates with 3M foam tape on the back, so they stick to counters, walls and tables. Our standard design, or yours.</p>
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {SHOP_PRODUCTS.filter((p) => p.value !== "extra_card").map((p) => (
                <article key={p.value} className="group mk-rise flex flex-col overflow-hidden rounded-[28px] bg-paper ring-1 ring-navy/[0.06]">
                  <div className="relative flex h-60 items-center justify-center bg-[radial-gradient(120%_80%_at_50%_0%,#ffffff,transparent_70%)] px-6">
                    {p.value === "barber_pack" && (
                      <span className="absolute top-4 right-4 rounded-full bg-gold/25 px-2.5 py-1 text-xs font-semibold text-amber-800">3 cards</span>
                    )}
                    <ProductCardArt face={p.face} />
                  </div>
                  <div className="flex flex-1 flex-col p-6 pt-5">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-xl font-bold tracking-tight">{p.name}</h3>
                      <p className="shrink-0 text-right">
                        <span className="font-display text-2xl font-bold [font-stretch:115%]">{peso(p.price)}</span>
                        <span className="block text-xs text-slate-ink">{p.unit}</span>
                      </p>
                    </div>
                    <p className="mt-3 text-[15px] leading-relaxed text-slate-ink">{p.pitch}</p>
                    <p className="mt-5 flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm ring-1 ring-navy/[0.06]">
                      <Contactless className="h-4 w-4 shrink-0 text-sky-600" />
                      <span className="text-slate-ink">Opens</span>
                      <span className="font-semibold">{p.opens}</span>
                    </p>
                    <ul className="mt-5 space-y-2 text-sm">
                      {p.includes.map((i) => (
                        <li key={i} className="flex gap-2.5">
                          <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4.5 10.5 3.5 3.5 7.5-8" /></svg>
                          {i}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-5 mb-6 text-sm text-slate-ink">Best for: <span className="font-medium text-navy">{p.bestFor}</span></p>
                    <Link
                      href={`/order?product=${p.value}`}
                      className="mt-auto inline-flex h-11 items-center justify-center rounded-full bg-navy px-5 text-sm font-semibold text-white transition-[background-color,transform] duration-100 hover:bg-[#25314a] active:scale-[0.97]"
                    >
                      Order the {p.name.toLowerCase()}
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {SHOP_PRODUCTS.filter((p) => p.value === "extra_card").map((p) => (
              <div key={p.value} className="group mk-rise mt-5 flex flex-col items-start gap-5 rounded-[28px] bg-paper p-6 ring-1 ring-navy/[0.06] sm:flex-row sm:items-center">
                <div className="w-20 shrink-0 -rotate-3 transition-transform duration-500 group-hover:rotate-0">
                  <ReviewPlate className="shadow-[0_14px_24px_-12px_rgba(17,24,39,0.5)]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold tracking-tight">
                    {p.name} <span className="font-display ml-1 [font-stretch:115%]">{peso(p.price)}</span>
                  </h3>
                  <p className="mt-1 text-[15px] text-slate-ink">{p.pitch}</p>
                </div>
                <Link href={`/order?product=${p.value}`} className="inline-flex h-11 shrink-0 items-center rounded-full bg-white px-5 text-sm font-semibold ring-1 ring-navy/10 transition-[box-shadow,transform] duration-100 hover:ring-navy/25 active:scale-[0.97]">
                  Add extra cards
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ───────── Customizable ───────── */}
        <section id="design" className="scroll-mt-20 overflow-hidden">
          <div className="mk-rise mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 md:py-28">
            <DesignShowcase />
          </div>
        </section>

        {/* ───────── The link stays, the page can change ───────── */}
        <section className="overflow-hidden border-y border-navy/[0.06] bg-white">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-28">
            <div className="mk-rise">
              <p className="text-sm font-semibold text-sky-700">Built to last</p>
              <h2 className="display mt-3 text-[clamp(2rem,4.4vw,3.4rem)]">The card stays. Where it goes can change.</h2>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-ink">
                Each card carries its own permanent link. Running a promo, moved to a new Google listing, or want it to open your menu for a
                while? We point the link somewhere new, and the card on your counter keeps working.
              </p>
              <ul className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  ["Add a QR code", "Optional, for phones without NFC."],
                  ["Taps counted", "We count taps, never who tapped."],
                  ["Lost card?", "We switch it off so it stops working."],
                ].map(([t, b]) => (
                  <li key={t} className="border-t-2 border-navy pt-3">
                    <p className="font-semibold">{t}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-ink">{b}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Card → permanent link → current destination */}
            <div className="mk-rise relative mx-auto w-full max-w-md">
              <div className="w-[46%] -rotate-6">
                <ReviewPlate className="shadow-[0_26px_40px_-18px_rgba(17,24,39,0.6)]" />
              </div>
              <div className="relative -mt-10 ml-auto w-[86%] rounded-3xl bg-white p-5 shadow-[0_30px_60px_-30px_rgba(17,24,39,0.45)] ring-1 ring-navy/[0.06]">
                <p className="text-xs font-semibold tracking-[0.14em] text-slate-ink uppercase">Card link · never changes</p>
                <p className="mt-2 truncate rounded-xl bg-paper px-3 py-2.5 font-code text-[13px] text-navy">
                  {host}/c/<span className="text-sky-700">8KX29A</span>
                </p>
                <div className="my-3 flex justify-center text-slate-300" aria-hidden="true">
                  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v14m-5-5 5 5 5-5" /></svg>
                </div>
                <p className="text-xs font-semibold tracking-[0.14em] text-slate-ink uppercase">Opens right now</p>
                <div className="mt-2 h-[52px] overflow-hidden rounded-xl bg-navy text-white">
                  <ul className="dest-cycle">
                    {[
                      ["★", "Google review page", "text-gold"],
                      ["☰", "This week's menu", "text-sky"],
                      ["◷", "Booking page", "text-emerald-300"],
                    ].map(([icon, label, tone]) => (
                      <li key={label} className="flex h-[52px] items-center gap-3 px-4 text-[15px] font-semibold">
                        <span className={`grid h-7 w-7 place-items-center rounded-lg bg-white/10 ${tone}`} aria-hidden="true">{icon}</span>
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───────── Ordering, in order ───────── */}
        <section id="how" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 md:py-28">
            <div className="mk-rise max-w-2xl">
              <p className="text-sm font-semibold text-sky-700">How ordering works</p>
              <h2 className="display mt-3 text-[clamp(2rem,4.4vw,3.4rem)]">From this page to your counter.</h2>
            </div>
            <ol className="mt-14 grid gap-10 md:grid-cols-4 md:gap-6">
              {ORDER_STEPS.map((s, i) => (
                <li key={s.title} className="mk-rise relative">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy font-display text-sm font-bold text-white [font-stretch:115%]">
                      {i + 1}
                    </span>
                    {i < ORDER_STEPS.length - 1 && <span aria-hidden="true" className="hidden h-px flex-1 bg-[repeating-linear-gradient(90deg,#cbd5e1_0_6px,transparent_6px_12px)] md:block" />}
                  </div>
                  <h3 className="mt-5 text-lg font-bold tracking-tight">{s.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-ink">{s.body}</p>
                </li>
              ))}
            </ol>

            <div className="mk-rise mt-20 rounded-[28px] bg-paper p-6 ring-1 ring-navy/[0.06] sm:p-8">
              <h3 className="text-lg font-bold tracking-tight">Where to put it</h3>
              <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
                {PLACES.map((p) => (
                  <div key={p.where}>
                    <dt className="font-semibold">{p.where}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-slate-ink">{p.spot}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* ───────── Questions ───────── */}
        <section id="faq" className="scroll-mt-20 mb-20 border-y border-navy/[0.06] bg-white">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-[1fr_1.6fr] md:py-28">
            <div className="mk-rise">
              <p className="text-sm font-semibold text-sky-700">Questions</p>
              <h2 className="display mt-3 text-[clamp(2rem,4.4vw,3.4rem)]">Before you order.</h2>
              <p className="mt-5 text-slate-ink">
                Something else on your mind?{" "}
                <Link href="/support" className="font-semibold text-navy underline decoration-sky decoration-2 underline-offset-4 hover:decoration-navy">
                  Send us a message
                </Link>{" "}
                and we&apos;ll reply within one business day.
              </p>
            </div>
            <div className="mk-rise divide-y divide-navy/10 border-y border-navy/10">
              {FAQ.map((f) => (
                <details key={f.q} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] font-semibold">
                    {f.q}
                    <span className="faq-plus grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-lg leading-none ring-1 ring-navy/10 transition-transform duration-200" aria-hidden="true">+</span>
                  </summary>
                  <p className="-mt-1 max-w-xl pb-6 leading-relaxed text-slate-ink">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ───────── Last call ───────── */}
        <section className="px-4 pb-20 sm:px-6">
          <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-[36px] bg-navy px-6 py-14 text-white sm:px-12 md:py-16">
            <div aria-hidden="true" className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,rgba(56,189,248,0.35),transparent)]" />
            <div className="relative grid items-center gap-10 md:grid-cols-[1.4fr_1fr]">
              <div>
                <h2 className="display text-[clamp(2rem,4.6vw,3.6rem)]">Start with one card for {peso(from)}.</h2>
                <p className="mt-4 max-w-md text-lg text-slate-300">Order in two minutes. We confirm the details with you before anything is printed or paid.</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/order?product=review_card" className="inline-flex h-12 items-center rounded-full bg-sky px-6 font-semibold text-navy transition-[background-color,transform] duration-100 hover:bg-sky-300 active:scale-[0.97]">
                    Order a review card
                  </Link>
                  <Link href="/support" className="inline-flex h-12 items-center rounded-full px-6 font-semibold text-white ring-1 ring-white/20 transition-[box-shadow] hover:ring-white/50">
                    Ask a question first
                  </Link>
                </div>
              </div>
              <div className="hidden justify-self-end md:block">
                <div className="w-64 rotate-6 transition-transform duration-500 hover:rotate-2">
                  <NfcCard face="profile" className="shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/10" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
