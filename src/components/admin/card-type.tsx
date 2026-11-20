"use client";

import { createContext, useContext, useState } from "react";
import { CARD_TYPES } from "@/lib/constants";
import type { CardType } from "@/lib/types";

const TYPE_HELP: Record<CardType, string> = {
  review: "Tap → straight to the business's Google review page.",
  profile: "Tap → a business profile you set up under Profiles.",
  link: "Tap → any link you choose (menu, booking page…).",
  personal: "Tap → the buyer sets up their own profile with a setup code. Use this for Shopee / Lazada / TikTok orders.",
};

const Ctx = createContext<{ type: CardType; setType: (t: CardType) => void }>({ type: "review", setType: () => {} });

/** Wrap a card form so the fields below can show or hide based on the chosen card type. */
export function CardTypeScope({ defaultType, children }: { defaultType: CardType; children: React.ReactNode }) {
  const [type, setType] = useState<CardType>(defaultType);
  return <Ctx.Provider value={{ type, setType }}>{children}</Ctx.Provider>;
}

/** The "Card type" select, with a one-line explanation of the chosen type. */
export function CardTypePicker({ className = "" }: { className?: string }) {
  const { type, setType } = useContext(Ctx);
  return (
    <div className={className}>
      <label className="label" htmlFor="card_type">
        Card type
      </label>
      <select className="input" id="card_type" name="card_type" value={type} onChange={(e) => setType(e.target.value as CardType)}>
        {CARD_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-ink-faint">{TYPE_HELP[type]}</p>
    </div>
  );
}

/**
 * Shows its fields only for the given card types. Hidden fields are also disabled,
 * so they aren't sent with the form.
 */
export function OnlyFor({ types, children }: { types: CardType[]; children: React.ReactNode }) {
  const { type } = useContext(Ctx);
  const on = types.includes(type);
  return (
    <fieldset disabled={!on} hidden={!on} className={on ? "contents" : undefined}>
      {children}
    </fieldset>
  );
}
