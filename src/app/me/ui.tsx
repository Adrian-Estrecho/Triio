"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* Small building blocks for the owner settings (iOS Settings look). */

export const icons = {
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c0-3.6 3.1-6 7-6s7 2.4 7 6",
  sparkle: "M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.5l-1.8-5.9-5.7-1.8L10.2 9 12 3.5Z",
  text: "M5 6.5h14M5 11h14M5 15.5h9",
  phone: "M6.6 3.5h2.2c.4 0 .8.3.9.7l1 3.6c.1.4 0 .8-.3 1l-1.7 1.5a13 13 0 0 0 5.5 5.5l1.5-1.7c.3-.3.7-.4 1-.3l3.6 1c.4.1.7.5.7.9v2.2c0 1.4-1.2 2.6-2.6 2.6C10.3 20.5 4 14.2 4 6.1c0-1.4 1.2-2.6 2.6-2.6Z",
  mail: "M4.5 5.5h15A1.5 1.5 0 0 1 21 7v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17V7a1.5 1.5 0 0 1 1.5-1.5Zm-.8 1.3L12 12.5l8.3-5.7",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-9-9h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z",
  map: "M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  pin: "M9 20.5 3.5 18V4.5L9 7l6-2.5 5.5 2.5v13.5L15 18l-6 2.5ZM9 7v13.5M15 4.5V18",
  link: "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 1 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 1 0 5.66 5.66l1-1",
  palette: "M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.6-1-2.6 0-.9.7-1.6 1.7-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3Zm-4.5 9.5h.01M9 7.5h.01M14.5 7h.01M17.5 10.5h.01",
  share: "M12 3v12M7.5 7.5 12 3l4.5 4.5M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12",
  camera: "M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9ZM12 16.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z",
  image: "M5.5 4.5h13a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18V6a1.5 1.5 0 0 1 1.5-1.5ZM4 15.5l4.5-4.5 4 4 2.5-2.5 5 5M15.5 9.5h.01",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  check: "m5 12.5 4.5 4.5L19 7.5",
  plus: "M12 5v14M5 12h14",
  close: "M6 6l12 12M18 6 6 18",
  chevron: "m9 5 7 7-7 7",
  up: "m6 15 6-6 6 6",
  down: "m6 9 6 6 6-6",
  trash: "M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5",
  logout: "M14 4.5h4a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-4M10 16.5 5.5 12 10 7.5M5.5 12H15",
  play: "M8 5.5v13l10-6.5-10-6.5Z",
  copy: "M9 9h10.5v10.5H9zM15 9V4.5H4.5V15H9",
  alert: "M12 8v5M12 16.5h.01M10.3 4.2 2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z",
  open: "M14 4.5h5.5V10M19.5 4.5 11 13M10 5.5H6A1.5 1.5 0 0 0 4.5 7v11A1.5 1.5 0 0 0 6 19.5h11a1.5 1.5 0 0 0 1.5-1.5v-4",
  pencil: "M14.5 5.5l4 4M4.5 19.5l1-4.5L15.8 4.7a1.4 1.4 0 0 1 2 0l1.5 1.5a1.4 1.4 0 0 1 0 2L9 18.5l-4.5 1Z",
  gamepad:
    "M7.6 7.5h8.8a4.6 4.6 0 0 1 4.5 3.7l.8 4.3a2.6 2.6 0 0 1-4.5 2.2l-1.9-2.1H8.7l-1.9 2.1a2.6 2.6 0 0 1-4.5-2.2l.8-4.3a4.6 4.6 0 0 1 4.5-3.7ZM8 10.4v3M6.5 11.9h3M15.6 11.2h.01M17.4 13h.01",
} as const;

export type IconName = keyof typeof icons;

/** Dropdown options get the theme's colours themselves: on Windows the open list ignores the page's dark theme. */
export const optionStyle: React.CSSProperties = { background: "var(--ios-cell)", color: "var(--ios-label)" };

export function Icon({ name, className = "h-[18px] w-[18px]", strokeWidth = 2 }: { name: IconName; className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={icons[name]} />
    </svg>
  );
}

/** Rounded color tile with a white glyph, like the icons in iOS Settings. */
export function Tile({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <span className="flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-[7px] text-white" style={{ background: bg }} aria-hidden="true">
      {children}
    </span>
  );
}

export function Group({
  id,
  title,
  footer,
  aside,
  children,
}: {
  id?: string;
  title?: string;
  footer?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-8 scroll-mt-24">
      {(title || aside) && (
        <div className="mb-1.5 flex items-end justify-between gap-3 px-4">
          {title && (
            <h2 className="text-[13px] font-medium uppercase" style={{ color: "var(--ios-secondary)", letterSpacing: "0.02em" }}>
              {title}
            </h2>
          )}
          {aside}
        </div>
      )}
      <div className="overflow-hidden rounded-[12px]" style={{ background: "var(--ios-cell)" }}>
        {children}
      </div>
      {footer && (
        <div className="mt-1.5 px-4 text-[13px] leading-snug" style={{ color: "var(--ios-secondary)" }}>
          {footer}
        </div>
      )}
    </section>
  );
}

/** A labeled input row. `icon` goes before the label; `invalid` shows a warning glyph. */
export function Row({
  label,
  icon,
  invalid,
  children,
  htmlFor,
}: {
  label?: string;
  icon?: React.ReactNode;
  invalid?: string | false | null;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="ios-field">
      {icon}
      {label && (
        <label htmlFor={htmlFor} className="ios-field-label">
          {label}
        </label>
      )}
      {children}
      {invalid && (
        <span className="shrink-0 text-[#FF453A]" title={invalid} aria-label={invalid} role="img">
          <Icon name="alert" className="h-[18px] w-[18px]" />
        </span>
      )}
    </div>
  );
}

export function Counter({ value, max }: { value: string; max: number }) {
  const left = max - value.length;
  return (
    <span className="text-[12px] tabular-nums" style={{ color: left < max * 0.1 ? "#FF9F0A" : "var(--ios-tertiary)" }} aria-live="polite">
      {value.length}/{max}
    </span>
  );
}

/**
 * Bottom sheet, portalled into the settings root so it keeps the theme colors.
 * Escape and the backdrop close it; the page behind doesn't scroll while it's open.
 */
export function Sheet({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: React.ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => setHost(document.querySelector<HTMLElement>("[data-settings-root]") ?? document.body), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    // Focus the sheet itself (not a field, which would pop up the phone keyboard).
    const t = setTimeout(() => panel.current?.focus({ preventScroll: true }), 60);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!host) return null;
  return createPortal(
    <>
      <div className="sheet-backdrop" data-open={open} onClick={onClose} aria-hidden="true" />
      <div className="sheet" data-open={open} role="dialog" aria-modal="true" aria-label={label} aria-hidden={!open} inert={!open}>
        <div
          ref={panel}
          tabIndex={-1}
          className="max-h-[calc(100dvh-24px-env(safe-area-inset-top))] overflow-y-auto outline-none overscroll-contain rounded-[22px] shadow-[0_-10px_40px_rgba(0,0,0,0.3)]"
          style={{ background: "var(--ios-bg)" }}
        >
          {children}
        </div>
      </div>
    </>,
    host
  );
}
