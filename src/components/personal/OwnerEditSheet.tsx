"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Wraps the profile photo on a personal card. Tapping it opens an iOS-style action sheet:
 * the owner goes straight to their settings, anyone else is asked to log in first
 * (the /me pages and the database both check that only the owner can edit).
 */
export function OwnerEditSheet({
  isOwner,
  loggedIn,
  name,
  accent,
  children,
}: {
  isOwner: boolean;
  loggedIn: boolean;
  name: string;
  accent: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // The sheet is portalled to the page root: the photo sits inside animated (transformed) wrappers,
  // which would otherwise trap a position:fixed sheet inside them.
  const [host, setHost] = useState<HTMLElement | null>(null);
  const firstAction = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    setHost(document.querySelector<HTMLElement>("[data-reveal-root]") ?? document.body);
  }, []);

  useEffect(() => {
    if (!open) return;
    firstAction.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Logged in as someone else? "switch=1" shows the login form instead of bouncing them to their own settings.
  const href = isOwner ? "/me" : loggedIn ? "/me/login?switch=1" : "/me/login";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative cursor-pointer rounded-[26px] transition-transform duration-150 ease-out active:scale-[0.96] motion-reduce:transition-none"
        aria-label={isOwner ? "Edit your profile" : `${name} — edit profile`}
        aria-haspopup="dialog"
      >
        {children}
        {isOwner && (
          <span
            className="absolute right-0.5 bottom-0.5 flex h-8 w-8 items-center justify-center rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
            style={{ background: accent, boxShadow: "0 0 0 3px var(--ios-bg)" }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
            </svg>
          </span>
        )}
      </button>

      {host &&
        createPortal(
          <>
            <div className="sheet-backdrop" data-open={open} onClick={() => setOpen(false)} aria-hidden="true" />
            <div className="sheet" data-open={open} role="dialog" aria-modal="true" aria-label="Edit profile" inert={!open}>
              <div className="overflow-hidden rounded-[14px]" style={{ background: "var(--ios-cell)" }}>
                <div className="px-6 pt-4 pb-3.5 text-center">
                  <p className="text-[13px] font-semibold" style={{ color: "var(--ios-secondary)" }}>
                    {isOwner ? "This is your card" : "Is this your card?"}
                  </p>
                  <p className="mt-1 text-[13px] leading-snug" style={{ color: "var(--ios-secondary)" }}>
                    {isOwner
                      ? "Change your photo, details, links and intro."
                      : loggedIn
                        ? "You're logged in with a different account. Log in as the owner to edit it."
                        : "Only the owner can edit this profile. Log in to make changes."}
                  </p>
                </div>
                <a
                  ref={firstAction}
                  href={href}
                  className="flex h-[57px] items-center justify-center text-[20px] outline-none focus-visible:bg-[var(--ios-cell-pressed)] active:bg-[var(--ios-cell-pressed)]"
                  style={{
                    borderTop: "0.5px solid var(--ios-separator)",
                    color: accent,
                  }}
                >
                  {isOwner ? "Edit Profile" : "Log In to Edit"}
                </a>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-2 flex h-[57px] w-full cursor-pointer items-center justify-center rounded-[14px] text-[20px] font-semibold active:bg-[var(--ios-cell-pressed)]"
                style={{ background: "var(--ios-cell)", color: accent }}
              >
                Cancel
              </button>
            </div>
          </>,
          host
        )}
    </>
  );
}
