"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { LogoMark } from "@/components/Logo";
import { ownerSignIn, type FormState } from "../actions";

const ACCENT = "#38BDF8";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-[52px] w-full cursor-pointer items-center justify-center rounded-[14px] text-[17px] font-semibold transition-[transform,opacity] duration-100 active:scale-[0.97] disabled:opacity-60 motion-reduce:transition-none"
      style={{ background: ACCENT, color: "#000" }}
    >
      {pending ? "Logging in…" : "Log In"}
    </button>
  );
}

export function OwnerLoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const [state, action] = useActionState<FormState, FormData>(ownerSignIn, {});
  const error = state.error ?? initialError;

  return (
    <main className="ios ios-dark min-h-dvh" style={{ background: "var(--ios-bg)", color: "var(--ios-label)" }}>
      <div className="relative mx-auto w-full max-w-md overflow-hidden px-4 pt-20 pb-[calc(env(safe-area-inset-bottom)+40px)]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-80"
          style={{ background: `radial-gradient(100% 70% at 50% 0%, ${ACCENT}4D 0%, ${ACCENT}12 50%, transparent 80%)` }}
          aria-hidden="true"
        />

        <header className="setup-in relative flex flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-[18px]" style={{ background: "var(--ios-cell)" }}>
            <LogoMark size={34} />
          </span>
          <h1 className="mt-5 text-[30px] leading-[1.1] font-bold" style={{ letterSpacing: "-0.025em" }}>
            Edit your card
          </h1>
          <p className="mt-2 text-[17px] leading-snug" style={{ color: "var(--ios-secondary)" }}>
            Log in with the email you used to set up your card.
          </p>
        </header>

        <form action={action} className="setup-in relative mt-8" style={{ "--r": 1 } as React.CSSProperties}>
          <input type="hidden" name="next" value={next} />
          {error && (
            <p className="mb-4 rounded-[12px] px-4 py-3 text-[15px] leading-snug" role="alert" style={{ background: "rgba(255,69,58,0.14)", color: "#FF6961" }}>
              {error}
            </p>
          )}
          <div className="overflow-hidden rounded-[12px]">
            <label className="ios-field">
              <span className="ios-field-label">Email</span>
              <input className="ios-input" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
            </label>
            <label className="ios-field">
              <span className="ios-field-label">Password</span>
              <input className="ios-input" name="password" type="password" placeholder="Your password" autoComplete="current-password" required />
            </label>
          </div>
          <div className="mt-6">
            <Submit />
          </div>
          <p className="mt-4 px-4 text-center text-[13px] leading-snug" style={{ color: "var(--ios-secondary)" }}>
            New card? Tap it with your phone to set it up.
          </p>
        </form>
      </div>
    </main>
  );
}
