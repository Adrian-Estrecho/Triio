"use client";

import { useActionState } from "react";
import { CONCERN_TOPICS } from "@/lib/constants";
import { submitConcern, type ConcernState } from "./actions";

const input =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[15px] text-white outline-none transition-[border-color,box-shadow] placeholder:text-slate-500 focus:border-sky focus:ring-2 focus:ring-sky/30";
const label = "mb-1.5 block text-sm font-medium text-slate-300";

export function SupportForm({ cardCode, topic }: { cardCode?: string; topic?: string }) {
  const [state, action, pending] = useActionState<ConcernState, FormData>(submitConcern, null);

  if (state?.ok) {
    return (
      <div className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10" role="status">
        <p className="text-sm font-semibold tracking-[0.2em] text-sky uppercase">Message sent</p>
        <h2 className="mt-3 text-2xl font-bold">Thanks, we&apos;ve got it.</h2>
        <p className="mt-3 text-slate-300">
          {state.ticket ? <>Your ticket number is <b className="text-white">#{state.ticket}</b>. </> : null}
          We&apos;ll reply to your email within one business day. If your card isn&apos;t working, the QR code on it still works in the meantime.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate={false}>
      {/* Honeypot for bots: hidden from people and screen readers. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Leave this empty <input name="hp_extra" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="name">Your name</label>
          <input className={input} id="name" name="name" autoComplete="name" maxLength={100} />
        </div>
        <div>
          <label className={label} htmlFor="business_name">Business name</label>
          <input className={input} id="business_name" name="business_name" autoComplete="organization" maxLength={150} />
        </div>
        <div>
          <label className={label} htmlFor="email">Email <span className="text-sky">*</span></label>
          <input className={input} id="email" name="email" type="email" required autoComplete="email" maxLength={200} />
        </div>
        <div>
          <label className={label} htmlFor="phone">Mobile number</label>
          <input className={input} id="phone" name="phone" type="tel" autoComplete="tel" maxLength={40} placeholder="09XX XXX XXXX" />
        </div>
        <div>
          <label className={label} htmlFor="topic">What&apos;s it about?</label>
          <select className={input} id="topic" name="topic" defaultValue={topic ?? "general"}>
            {CONCERN_TOPICS.map((t) => (
              <option key={t.value} value={t.value} className="text-navy">{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="card_code">Card code <span className="text-slate-500">(if it&apos;s about a card)</span></label>
          <input className={`${input} font-mono uppercase`} id="card_code" name="card_code" defaultValue={cardCode} maxLength={12} placeholder="e.g. 8KX29A" />
        </div>
      </div>

      <div>
        <label className={label} htmlFor="message">Message <span className="text-sky">*</span></label>
        <textarea className={input} id="message" name="message" rows={6} required minLength={5} maxLength={4000} placeholder="Tell us what happened, and we'll sort it out." />
      </div>

      {state?.error && (
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-200 ring-1 ring-red-400/30" role="alert">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 items-center justify-center rounded-full bg-sky px-7 font-semibold text-navy transition-[background-color,transform] duration-100 hover:bg-sky-300 active:scale-[0.97] disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
