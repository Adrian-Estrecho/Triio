"use client";

import Image from "next/image";
import { useState } from "react";
import { DESIGN_PRESETS, colorHex } from "@/lib/shop";
import { ReviewPlate } from "./ReviewPlate";

const CUSTOMIZE = [
  ["Your colors", "Matched to your sign, your menu or your logo."],
  ["Your logo and name", "So customers know it's yours, not a generic sticker."],
  ["Your words", "English, Taglish or Filipino. Whatever sounds like your shop."],
  ["Where the tap goes", "Your Google reviews, Facebook page, menu or booking page."],
] as const;

/** "Make it yours": switch business styles and watch the same plate change. */
export function DesignShowcase() {
  const [key, setKey] = useState<(typeof DESIGN_PRESETS)[number]["key"]>("cafe");
  const preset = DESIGN_PRESETS.find((p) => p.key === key) ?? DESIGN_PRESETS[0];

  return (
    <div className="grid items-center gap-12 md:grid-cols-[1fr_1.05fr] md:gap-16">
      <div>
        <p className="text-sm font-semibold text-sky-700">Made for your business</p>
        <h2 className="display mt-3 text-[clamp(2rem,4.4vw,3.4rem)]">Your shop, your card.</h2>
        <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-ink">
          Start with our standard design, or we make it match your business. You see a proof before anything is printed.
        </p>

        <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Example designs">
          {DESIGN_PRESETS.map((p) => {
            const on = p.key === key;
            return (
              <button
                key={p.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setKey(p.key)}
                className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 transition-[background-color,color,box-shadow] duration-200 ${
                  on ? "bg-navy text-white ring-navy" : "bg-white text-navy ring-navy/10 hover:ring-navy/25"
                }`}
              >
                <span className="h-3 w-3 rounded-full ring-1 ring-white/40" style={{ background: colorHex(p.color) }} aria-hidden="true" />
                {p.label}
              </button>
            );
          })}
        </div>

        <dl className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {CUSTOMIZE.map(([t, b]) => (
            <div key={t} className="border-t-2 border-navy pt-3">
              <dt className="font-semibold">{t}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-slate-ink">{b}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="relative">
        {/* The plate, restyled live */}
        <div className="relative mx-auto w-full max-w-[26rem] rounded-[36px] bg-[radial-gradient(90%_80%_at_50%_10%,#ffffff,#e2e8ef)] p-10 ring-1 ring-navy/[0.06] sm:p-14">
          <div className="relative mx-auto w-full max-w-[17rem]">
            <span className="plate-liner translate-x-[7%] translate-y-[-4%] rotate-[7deg]" aria-hidden="true" />
            <div key={preset.key} className="reveal relative -rotate-2" style={{ "--r": 0 } as React.CSSProperties}>
              <ReviewPlate
                color={colorHex(preset.color)}
                headline={preset.headline}
                business={preset.business}
                initials={preset.initials}
                className="shadow-[0_34px_50px_-24px_rgba(17,24,39,0.6)]"
              />
            </div>
          </div>
          <p className="mt-8 text-center text-sm text-slate-ink" aria-live="polite">
            {preset.business ? <>Example design for a {preset.label.toLowerCase()}</> : <>Our standard design</>}
          </p>
        </div>

        {/* The real thing */}
        <figure className="mx-auto mt-6 w-52 rounded-3xl bg-white p-3 shadow-[0_24px_50px_-20px_rgba(17,24,39,0.45)] ring-1 ring-navy/[0.06] sm:absolute sm:-bottom-8 sm:-left-2 sm:mt-0 sm:w-44 md:-left-10">
          <Image src="/products/review-card-sample.png" alt="Photo of a real Triio review card in the standard blue design, with its 3M foam-tape backing" width={400} height={361} className="h-auto w-full" />
          <figcaption className="mt-2 px-1 text-xs leading-snug text-slate-ink">
            The real card. 3M foam tape on the back sticks it to counters, walls and tables.
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
