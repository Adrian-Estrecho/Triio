"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { LogoMark } from "@/components/Logo";
import { ownerSignOut, setupCard, type FormState } from "@/app/me/actions";

const ACCENT = "#38BDF8";

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-[52px] w-full cursor-pointer items-center justify-center rounded-[14px] text-[17px] font-semibold transition-[transform,opacity] duration-100 active:scale-[0.97] disabled:opacity-60 motion-reduce:transition-none"
      style={{ background: ACCENT, color: "#000" }}
    >
      {pending ? "Setting up…" : children}
    </button>
  );
}

function Group({ title, footer, children }: { title?: string; footer?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      {title && (
        <h2 className="mb-1.5 px-4 text-[13px] uppercase" style={{ color: "var(--ios-secondary)" }}>
          {title}
        </h2>
      )}
      <div className="overflow-hidden rounded-[12px]">{children}</div>
      {footer && (
        <p className="mt-1.5 px-4 text-[13px] leading-snug" style={{ color: "var(--ios-secondary)" }}>
          {footer}
        </p>
      )}
    </section>
  );
}

/** The screen a brand-new personal card shows on its first tap. */
export function CardSetup({ code, buyerName, email, notice }: { code: string; buyerName: string | null; email: string | null; notice?: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(setupCard.bind(null, code), {});
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const loggedIn = Boolean(email);
  const firstName = buyerName?.trim().split(/\s+/)[0] ?? null;
  const banner = state.error ?? (notice ? "Your email is confirmed. Enter your setup code to finish." : null);

  return (
    <main className="ios ios-dark min-h-dvh" style={{ background: "var(--ios-bg)", color: "var(--ios-label)", "--accent": ACCENT } as React.CSSProperties}>
      <div className="relative mx-auto w-full max-w-md overflow-hidden px-4 pt-14 pb-[calc(env(safe-area-inset-bottom)+40px)]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-96"
          style={{ background: `radial-gradient(100% 70% at 50% 0%, ${ACCENT}55 0%, ${ACCENT}14 50%, transparent 80%)` }}
          aria-hidden="true"
        />

        {/* A floating card with NFC waves */}
        <div className="relative mx-auto flex h-48 w-full items-center justify-center" aria-hidden="true">
          <div className="absolute h-40 w-40">
            <span className="setup-wave" />
            <span className="setup-wave" />
            <span className="setup-wave" />
          </div>
          <div
            className="setup-card relative flex h-[132px] w-[210px] flex-col justify-between rounded-[16px] p-4"
            style={{
              background: "linear-gradient(135deg, #1f2937 0%, #0b1220 100%)",
              boxShadow: `0 30px 60px -20px ${ACCENT}66, inset 0 1px 0 rgba(255,255,255,0.12), 0 0 0 0.5px rgba(255,255,255,0.12)`,
            }}
          >
            <div className="flex items-center justify-between">
              <LogoMark size={22} />
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round">
                <path d="M8.5 7.5a6.5 6.5 0 0 1 0 9M12 5a10 10 0 0 1 0 14M5 10a2.5 2.5 0 0 1 0 4" />
              </svg>
            </div>
            {buyerName ? (
              <div className="min-w-0 text-left">
                <p className="truncate text-[15px] font-semibold text-white" style={{ letterSpacing: "-0.01em" }}>
                  {buyerName}
                </p>
                <div className="mt-1.5 h-1.5 w-14 rounded-full" style={{ background: "rgba(255,255,255,0.14)" }} />
              </div>
            ) : (
              <div>
                <div className="h-2 w-24 rounded-full" style={{ background: "rgba(255,255,255,0.22)" }} />
                <div className="mt-2 h-2 w-14 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
              </div>
            )}
          </div>
        </div>

        <header className="setup-in relative mt-4 text-center" style={{ "--r": 0 } as React.CSSProperties}>
          <h1 className="text-[30px] leading-[1.1] font-bold" style={{ letterSpacing: "-0.025em" }}>
            {firstName ? `Hi ${firstName}, your card is ready` : "Make this card yours"}
          </h1>
          <p className="mx-auto mt-2 max-w-[22rem] text-[17px] leading-snug" style={{ color: "var(--ios-secondary)" }}>
            {firstName
              ? "Enter the setup code from your package and your email. That’s it — your card goes live."
              : "Set up your profile in a minute. Everyone who taps your card will see it, starting with your name."}
          </p>
        </header>

        {state.notice ? (
          <div className="setup-in relative mt-8 rounded-[14px] p-5 text-center" style={{ background: "var(--ios-cell)", "--r": 1 } as React.CSSProperties}>
            <p className="text-[17px] font-semibold">Check your email</p>
            <p className="mt-1.5 text-[15px] leading-snug" style={{ color: "var(--ios-secondary)" }}>
              {state.notice}
            </p>
          </div>
        ) : (
          <form action={action} className="setup-in relative" style={{ "--r": 1 } as React.CSSProperties}>
            <input type="hidden" name="mode" value={loggedIn ? "claim" : mode} />

            {banner && (
              <p
                className="mt-6 rounded-[12px] px-4 py-3 text-[15px] leading-snug"
                role={state.error ? "alert" : "status"}
                style={state.error ? { background: "rgba(255,69,58,0.14)", color: "#FF6961" } : { background: `${ACCENT}1F`, color: ACCENT }}
              >
                {banner}
              </p>
            )}

            <Group title="Your card" footer="The 6-character code that came with your card. Ask Triio if you can’t find it.">
              <label className="ios-field">
                <span className="ios-field-label">Setup code</span>
                <input
                  className="ios-input font-mono tracking-[0.3em] uppercase"
                  name="setup_code"
                  placeholder="ABC234"
                  maxLength={8}
                  autoCapitalize="characters"
                  autoComplete="one-time-code"
                  spellCheck={false}
                  required
                />
              </label>
            </Group>

            <Group title="You" footer={buyerName ? "This is how your name appears on your card. Fix the spelling if you need to." : undefined}>
              <label className="ios-field">
                <span className="ios-field-label">Name</span>
                <input
                  className="ios-input"
                  name="name"
                  defaultValue={buyerName ?? ""}
                  placeholder={mode === "login" || loggedIn ? "Only needed for a new profile" : "Juan dela Cruz"}
                  maxLength={80}
                  autoComplete="name"
                  required={!loggedIn && mode === "signup" && !buyerName}
                />
              </label>
            </Group>

            {loggedIn ? (
              <Group title="Account">
                <div className="ios-field">
                  <span className="ios-field-label">Signed in</span>
                  <span className="min-w-0 flex-1 truncate text-[17px]" style={{ color: "var(--ios-secondary)" }}>
                    {email}
                  </span>
                </div>
              </Group>
            ) : (
              <Group
                title={mode === "signup" ? "Create your account" : "Log in"}
                footer={
                  <button type="button" className="cursor-pointer font-medium" style={{ color: ACCENT }} onClick={() => setMode(mode === "signup" ? "login" : "signup")}>
                    {mode === "signup" ? "I already have an account" : "I’m new — create an account"}
                  </button>
                }
              >
                <label className="ios-field">
                  <span className="ios-field-label">Email</span>
                  <input className="ios-input" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
                </label>
                <label className="ios-field">
                  <span className="ios-field-label">Password</span>
                  <input
                    className="ios-input"
                    name="password"
                    type="password"
                    placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                    minLength={mode === "signup" ? 8 : undefined}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    required
                  />
                </label>
              </Group>
            )}

            <div className="mt-7">
              <Submit>{loggedIn ? "Set Up My Card" : mode === "signup" ? "Create My Card" : "Log In & Set Up"}</Submit>
            </div>
            {!loggedIn && (
              <p className="mt-3 px-4 text-center text-[13px] leading-snug" style={{ color: "var(--ios-secondary)" }}>
                You’ll use this email and password to edit your card later.
              </p>
            )}
          </form>
        )}

        {loggedIn && (
          <form action={ownerSignOut} className="mt-4 text-center">
            <input type="hidden" name="next" value={`/c/${code}`} />
            <button className="cursor-pointer text-[15px]" style={{ color: "var(--ios-secondary)" }}>
              Not you? Log out
            </button>
          </form>
        )}

        <p className="relative mt-10 flex items-center justify-center gap-1.5 text-[13px]" style={{ color: "var(--ios-secondary)" }}>
          <LogoMark size={14} /> Triio
        </p>
      </div>
    </main>
  );
}
