"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { LEAD_AREAS } from "@/lib/constants";
import {
  CARD_COLORS,
  HEADLINES,
  HEADLINE_MAX,
  ORDER_PURPOSES,
  PAYMENT_OPTIONS,
  SHOP_PRODUCTS,
  colorHex,
  initialsOf,
  shopProduct,
  type CardColor,
  type OrderPurpose,
  type ShopProduct,
} from "@/lib/shop";
import { peso } from "@/lib/utils";
import { NfcCard, ProductCardArt } from "@/components/marketing/NfcCard";
import { ReviewPlate, type PlateDesign } from "@/components/marketing/ReviewPlate";
import { placeOrder, type OrderState } from "./actions";

const input =
  "w-full rounded-2xl border border-navy/12 bg-white px-4 py-3 text-[16px] text-navy outline-none transition-[border-color,box-shadow] placeholder:text-slate-400 hover:border-navy/25 focus:border-sky-500 focus:ring-4 focus:ring-sky-200/70";
const label = "mb-1.5 block text-sm font-semibold text-navy";
const hint = "font-normal text-slate-ink";

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: string }) {
  return (
    <fieldset className="rounded-[28px] bg-white p-5 ring-1 ring-navy/[0.06] sm:p-7">
      <legend className="sr-only">{title}</legend>
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-bold tracking-tight" aria-hidden="true">{title}</h2>
        {aside && <p className="text-sm text-slate-ink">{aside}</p>}
      </div>
      {children}
    </fieldset>
  );
}

export function OrderForm({ initialProduct }: { initialProduct: ShopProduct["value"] }) {
  const [state, action, pending] = useActionState<OrderState, FormData>(placeOrder, null);
  const [product, setProduct] = useState<ShopProduct["value"]>(initialProduct);
  const [qty, setQty] = useState(1);
  const [purpose, setPurpose] = useState<OrderPurpose>("business");
  const personal = purpose === "personal";
  const selected = shopProduct(product)!;
  const total = selected.price * qty;

  // Card design (review plates). The preview in the summary follows these.
  const [bizName, setBizName] = useState("");
  const [yourName, setYourName] = useState("");
  const [custom, setCustom] = useState(false);
  const [color, setColor] = useState<CardColor>("standard");
  const [headlineChoice, setHeadlineChoice] = useState<string>(HEADLINES[1]);
  const [ownHeadline, setOwnHeadline] = useState("");
  const isPlate = product !== "profile_card";
  const shownName = bizName.trim() || (personal ? yourName.trim() : "") || "Your business";
  const design: PlateDesign | undefined = custom
    ? {
        color: colorHex(color),
        headline: headlineChoice === "own" ? ownHeadline || "Your words here" : headlineChoice,
        business: shownName,
        initials: initialsOf(shownName),
      }
    : undefined;

  if (state?.ok) return <Placed state={state} />;

  return (
    <form
      action={action}
      onSubmit={(e) => {
        // Submit through a transition so React doesn't clear the fields if we come back with an error.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]"
    >
      {/* Honeypot for bots: hidden from people and screen readers. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>Leave this empty <input name="hp_extra" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <div className="space-y-6">
        <Section title="1. Your card">
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Card">
            {SHOP_PRODUCTS.map((p) => {
              const on = p.value === product;
              return (
                <label
                  key={p.value}
                  className={`group relative flex cursor-pointer gap-4 rounded-2xl p-4 ring-1 transition-[box-shadow,background-color] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-sky-500 ${
                    on ? "bg-sky-50/70 ring-2 ring-navy" : "bg-paper/60 ring-navy/10 hover:ring-navy/25"
                  }`}
                >
                  <input type="radio" name="product" value={p.value} checked={on} onChange={() => setProduct(p.value)} className="sr-only" />
                  <span className="mt-0.5 flex w-16 shrink-0 justify-center">
                    {p.face === "profile" ? <NfcCard face="profile" className="w-16" /> : <ReviewPlate {...design} className="w-12" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold">{p.name}</span>
                      <span className="font-display font-bold [font-stretch:112%]">{peso(p.price)}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-ink">{p.unit} · opens {p.opens.charAt(0).toLowerCase() + p.opens.slice(1)}</span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-navy/[0.07] pt-5">
            <div>
              <p className="font-semibold">How many?</p>
              <p className="text-sm text-slate-ink">
                {product === "barber_pack" ? "Each pack has 3 cards." : "One card per counter, table or chair."}
              </p>
            </div>
            <div className="flex items-center rounded-full bg-paper p-1 ring-1 ring-navy/10">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} className="grid h-10 w-10 place-items-center rounded-full text-xl transition-colors hover:bg-white disabled:opacity-30" aria-label="One less">−</button>
              <input
                name="quantity"
                inputMode="numeric"
                value={qty}
                onChange={(e) => setQty(Math.min(50, Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1)))}
                className="w-12 bg-transparent text-center text-lg font-semibold outline-none"
                aria-label="Quantity"
              />
              <button type="button" onClick={() => setQty((q) => Math.min(50, q + 1))} disabled={qty >= 50} className="grid h-10 w-10 place-items-center rounded-full text-xl transition-colors hover:bg-white disabled:opacity-30" aria-label="One more">+</button>
            </div>
          </div>
        </Section>

        <Section title="2. Your business" aside="* required">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={label} htmlFor="business_name">
                {personal ? <>Business or brand name <span className={hint}>(optional for personal use)</span></> : "Business name *"}
              </label>
              <input className={input} id="business_name" name="business_name" onChange={(e) => setBizName(e.target.value)} required={!personal} autoComplete="organization" maxLength={150} placeholder="As it should appear on the card" />
            </div>
            <div>
              <label className={label} htmlFor="contact_person">Your name{personal ? " *" : ""}</label>
              <input className={input} id="contact_person" name="contact_person" onChange={(e) => setYourName(e.target.value)} required={personal} autoComplete="name" maxLength={100} />
            </div>
            <div>
              <label className={label} htmlFor="phone">Mobile number *</label>
              <input className={input} id="phone" name="phone" type="tel" required autoComplete="tel" maxLength={40} placeholder="09XX XXX XXXX" />
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="email">Email *</label>
              <input className={input} id="email" name="email" type="email" required autoComplete="email" maxLength={200} />
              <p className="mt-1.5 text-sm text-slate-ink">Your order confirmation and updates go here.</p>
            </div>
          </div>
        </Section>

        <Section title="3. Delivery and payment">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="area">Area</label>
              <select className={`${input} cursor-pointer`} id="area" name="area" defaultValue="">
                <option value="" disabled>Choose your area</option>
                {LEAD_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="address">Delivery address <span className={hint}>(or where to meet)</span></label>
              <textarea className={input} id="address" name="address" rows={2} maxLength={300} autoComplete="street-address" />
            </div>
          </div>
          <div className="mt-6">
            <p className={label} id="purpose-label">Is this order for a business or personal use?</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="purpose-label">
              {ORDER_PURPOSES.map((p) => (
                <label key={p.value} className="cursor-pointer">
                  <input type="radio" name="purpose" value={p.value} checked={purpose === p.value} onChange={() => setPurpose(p.value)} className="peer sr-only" />
                  <span className="inline-flex h-10 items-center rounded-full bg-paper px-4 text-sm font-medium ring-1 ring-navy/10 transition-colors peer-checked:bg-navy peer-checked:text-white peer-checked:ring-navy peer-focus-visible:ring-2 peer-focus-visible:ring-sky-500 hover:ring-navy/25">
                    {p.label}
                  </span>
                </label>
              ))}
            </div>
            {personal && <p className="mt-2 text-sm text-slate-ink">No business needed. We&apos;ll print your name, or a brand name if you add one above.</p>}
          </div>
          <div className="mt-6">
            <p className={label} id="pay-label">How would you like to pay? <span className={hint}>(after we confirm)</span></p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="pay-label">
              {PAYMENT_OPTIONS.map((p, i) => (
                <label key={p.value} className="cursor-pointer">
                  <input type="radio" name="payment" value={p.value} defaultChecked={i === 0} className="peer sr-only" />
                  <span className="inline-flex h-10 items-center rounded-full bg-paper px-4 text-sm font-medium ring-1 ring-navy/10 transition-colors peer-checked:bg-navy peer-checked:text-white peer-checked:ring-navy peer-focus-visible:ring-2 peer-focus-visible:ring-sky-500 hover:ring-navy/25">
                    {p.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </Section>

        <Section title="4. Design your card">
          {isPlate ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Design">
                {[
                  { v: false, t: "Our standard design", d: "Blue, with “We would appreciate your Google review!”" },
                  { v: true, t: "Customize it for my business", d: "Your colors, your name or logo, your words." },
                ].map((o) => (
                  <label
                    key={o.t}
                    className={`cursor-pointer rounded-2xl p-4 ring-1 transition-[box-shadow,background-color] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-sky-500 ${
                      custom === o.v ? "bg-sky-50/70 ring-2 ring-navy" : "bg-paper/60 ring-navy/10 hover:ring-navy/25"
                    }`}
                  >
                    <input type="radio" name="design" value={o.v ? "custom" : "standard"} checked={custom === o.v} onChange={() => setCustom(o.v)} className="sr-only" />
                    <span className="block font-semibold">{o.t}</span>
                    <span className="mt-0.5 block text-sm text-slate-ink">{o.d}</span>
                  </label>
                ))}
              </div>

              {custom && (
                <div className="mt-6 space-y-6">
                  <div>
                    <p className={label} id="color-label">Color</p>
                    <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-labelledby="color-label">
                      {CARD_COLORS.map((c) => (
                        <label key={c.value} className="cursor-pointer" title={c.label}>
                          <input type="radio" name="card_color" value={c.value} checked={color === c.value} onChange={() => setColor(c.value)} className="peer sr-only" />
                          <span
                            className="block h-10 w-10 rounded-full ring-2 ring-transparent ring-offset-2 transition-shadow peer-checked:ring-navy peer-focus-visible:ring-sky-500"
                            style={{ background: c.hex }}
                          />
                          <span className="sr-only">{c.label}</span>
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 text-sm text-slate-ink">
                      {CARD_COLORS.find((c) => c.value === color)?.label}. Need an exact brand color? Put it in the notes below.
                    </p>
                  </div>

                  <div>
                    <p className={label} id="headline-label">Headline</p>
                    <div className="space-y-2" role="radiogroup" aria-labelledby="headline-label">
                      {[...HEADLINES, "own"].map((h) => (
                        <label
                          key={h}
                          className={`flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-[15px] ring-1 transition-[box-shadow,background-color] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-sky-500 ${
                            headlineChoice === h ? "bg-sky-50/70 ring-2 ring-navy" : "bg-paper/60 ring-navy/10 hover:ring-navy/25"
                          }`}
                        >
                          <input type="radio" name="headline" value={h} checked={headlineChoice === h} onChange={() => setHeadlineChoice(h)} className="sr-only" />
                          <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ring-2 ${headlineChoice === h ? "ring-navy" : "ring-navy/25"}`} aria-hidden="true">
                            {headlineChoice === h && <span className="h-2 w-2 rounded-full bg-navy" />}
                          </span>
                          {h === "own" ? <span className="font-semibold">Write my own</span> : h}
                        </label>
                      ))}
                    </div>
                    {headlineChoice === "own" && (
                      <div className="mt-3">
                        <label className="sr-only" htmlFor="own_headline">Your headline</label>
                        <input
                          className={input}
                          id="own_headline"
                          name="own_headline"
                          value={ownHeadline}
                          onChange={(e) => setOwnHeadline(e.target.value.slice(0, HEADLINE_MAX))}
                          maxLength={HEADLINE_MAX}
                          placeholder="e.g. Busog ka ba? Rate us on Google!"
                        />
                        <p className="mt-1.5 text-right text-xs text-slate-ink">{ownHeadline.length}/{HEADLINE_MAX}</p>
                      </div>
                    )}
                  </div>

                  <p className="rounded-2xl bg-paper px-4 py-3 text-sm text-slate-ink">
                    <span className="font-semibold text-navy">Your logo:</span> after you order, reply to our message with your logo, or paste a link to your Facebook page in the notes.
                    The preview shows your initials until then.
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="rounded-2xl bg-paper px-4 py-3 text-[15px] text-slate-ink">
              We design your profile card with your logo and colors, and send you a proof to approve before it&apos;s printed.
            </p>
          )}

          <div className="mt-6 space-y-5 border-t border-navy/[0.07] pt-6">
            <div>
              <label className={label} htmlFor="review_url">Google review link <span className={hint}>(optional)</span></label>
              <input className={input} id="review_url" name="review_url" inputMode="url" maxLength={500} placeholder="https://g.page/r/…/review" />
              <p className="mt-1.5 text-sm text-slate-ink">Don&apos;t have it? Leave it blank and we&apos;ll find it with you.</p>
            </div>
            <div>
              <label className={label} htmlFor="notes">Notes for the design <span className={hint}>(optional)</span></label>
              <textarea className={input} id="notes" name="notes" rows={4} maxLength={1500} placeholder="Exact brand colors, anything else to print, or a link to your Facebook page so we can grab your logo." />
            </div>
          </div>
        </Section>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-24">
        <div className="overflow-hidden rounded-[28px] bg-navy text-white">
          <div className="flex h-64 flex-col items-center justify-center bg-[radial-gradient(90%_80%_at_50%_0%,rgba(56,189,248,0.3),transparent_70%)] px-8">
            <div className="w-full">
              <ProductCardArt face={selected.face} design={design} />
            </div>
          </div>
          {isPlate && <p className="-mt-6 text-center text-xs text-slate-400">{custom ? "Preview. Your proof will have your real logo." : "Our standard design"}</p>}
          <div className="p-6">
            <p className="text-sm text-slate-400">Your order</p>
            <div className="mt-2 flex items-baseline justify-between gap-4">
              <p className="font-semibold">{selected.name} × {qty}</p>
              <p className="text-slate-300">{peso(selected.price)} {product === "barber_pack" ? "per pack" : "each"}</p>
            </div>
            <div className="mt-5 flex items-baseline justify-between border-t border-white/10 pt-5">
              <p className="text-slate-300">Total</p>
              <p className="font-display text-3xl font-bold [font-stretch:115%]" aria-live="polite">{peso(total)}</p>
            </div>
            <p className="mt-2 text-sm text-slate-400">Pay after we confirm. Nothing is charged today.</p>

            {state && !state.ok && (
              <p className="mt-5 rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-100 ring-1 ring-red-400/30" role="alert">{state.error}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-sky font-semibold text-navy transition-[background-color,transform] duration-100 hover:bg-sky-300 active:scale-[0.98] disabled:opacity-60"
            >
              {pending ? "Placing order…" : "Place order"}
            </button>
            <p className="mt-4 text-center text-xs text-slate-500">
              Questions first? <Link href="/support" className="underline underline-offset-2 hover:text-slate-300">Message us</Link>
            </p>
          </div>
        </div>
      </aside>
    </form>
  );
}

function Placed({ state }: { state: Extract<OrderState, { ok: true }> }) {
  const p = shopProduct(state.product);
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]" role="status">
      <div className="reveal rounded-[28px] bg-white p-7 ring-1 ring-navy/[0.06] sm:p-10">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <svg viewBox="0 0 20 20" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4.5 10.5 3.5 3.5 7.5-8" /></svg>
        </span>
        <h2 className="display mt-6 text-[clamp(1.9rem,4vw,2.8rem)]">Order #{state.orderNo} placed.</h2>
        <p className="mt-4 max-w-lg text-lg text-slate-ink">
          Thanks! We sent a copy to <b className="text-navy">{state.email}</b>. Here&apos;s what happens next:
        </p>
        <ol className="mt-8 space-y-5">
          {[
            ["We message you", "Within one business day, to confirm the details and send payment instructions."],
            ["You approve the design", "We send a proof with your logo and colors. Nothing is printed until you say it's right."],
            ["We program, test and deliver", "Every card is tap-tested on iPhone and Android before it reaches you."],
          ].map(([t, b], i) => (
            <li key={t} className="flex gap-4">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy font-display text-sm font-bold text-white">{i + 1}</span>
              <span>
                <span className="block font-semibold">{t}</span>
                <span className="block text-slate-ink">{b}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/" className="inline-flex h-11 items-center rounded-full bg-navy px-5 text-sm font-semibold text-white hover:bg-[#25314a]">Back to home</Link>
          <Link href={`/support?topic=order`} className="inline-flex h-11 items-center rounded-full bg-paper px-5 text-sm font-semibold ring-1 ring-navy/10 hover:ring-navy/25">Add something to my order</Link>
        </div>
      </div>
      <aside className="rounded-[28px] bg-navy p-6 text-white">
        {p && <ProductCardArt face={p.face} design={state.design ?? undefined} />}
        <div className="mt-6 flex items-baseline justify-between">
          <p className="font-semibold">{p?.name} × {state.quantity}</p>
          <p className="font-display text-2xl font-bold [font-stretch:115%]">{peso(state.total)}</p>
        </div>
        {state.payment && <p className="mt-2 text-sm text-slate-400">Paying by {state.payment === "Cash" ? "cash on delivery" : state.payment}</p>}
      </aside>
    </div>
  );
}
