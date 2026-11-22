"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Offering } from "@/lib/types";

/**
 * "What we offer" on a business profile: category chips, a two-column photo grid,
 * and a bottom sheet with the details and a way to order or ask.
 */
export function OfferingsGrid({
  items,
  title,
  tint,
  inquire,
}: {
  items: Offering[];
  title: string;
  tint: string;
  inquire: { label: string; href: string } | null;
}) {
  const categories = useMemo(() => Array.from(new Set(items.map((o) => o.category?.trim()).filter(Boolean))) as string[], [items]);
  const [filter, setFilter] = useState<string | null>(null);
  const [open, setOpen] = useState<Offering | null>(null);
  const [shown, setShown] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => setHost(document.querySelector<HTMLElement>("[data-reveal-root]") ?? document.body), []);

  const list = filter ? items.filter((o) => o.category?.trim() === filter) : items;

  const show = (o: Offering) => {
    setOpen(o);
    requestAnimationFrame(() => setShown(true));
  };
  const hide = () => setShown(false);

  useEffect(() => {
    if (!shown) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const t = setTimeout(() => closeBtn.current?.focus({ preventScroll: true }), 60);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hide();
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [shown]);

  return (
    <section className="mt-10 px-3" aria-labelledby="offerings-title">
      <header className="flex items-end justify-between gap-3 px-2">
        <div className="min-w-0">
          <h2 id="offerings-title" className="text-[28px] leading-[1.05] font-bold" style={{ letterSpacing: "-0.035em" }}>
            {title}
          </h2>
          <p className="mt-1 text-[14px]" style={{ color: "var(--ios-secondary)" }}>
            {items.length} {items.length === 1 ? "item" : "items"} · tap one for details
          </p>
        </div>
      </header>

      {categories.length > 1 && (
        <div className="bz-chips mt-4" role="toolbar" aria-label="Filter">
          {[null, ...categories].map((c) => (
            <button key={c ?? "all"} type="button" className="bz-chip" aria-pressed={filter === c} onClick={() => setFilter(c)}>
              {c ?? "All"}
            </button>
          ))}
        </div>
      )}

      {/* Two columns, items alternating left/right so they read in order; tall and square cards stagger. */}
      <div className="bz-grid mt-4">
        {[0, 1].map((col) => (
          <div key={col} className="bz-col">
        {list.map((o, i) => i % 2 !== col ? null : (
          <button key={o.id} type="button" className="bz-item" onClick={() => show(o)} aria-label={`${o.title}${o.price ? `, ${o.price}` : ""}`}>
            <span className="bz-item-media" style={{ aspectRatio: i % 4 === 0 || i % 4 === 3 ? "4 / 5" : "1 / 1" }}>
              {o.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <span className="bz-item-blank" style={{ "--tint": tint } as React.CSSProperties}>
                  <span>{o.title}</span>
                </span>
              )}
              <span className="bz-item-plus" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              {o.image && (
                <span className="bz-item-caption">
                  <span className="line-clamp-2 text-[14px] leading-tight font-semibold">{o.title}</span>
                  {o.price && <span className="mt-0.5 block text-[13px] opacity-85">{o.price}</span>}
                </span>
              )}
            </span>
            {!o.image && o.price && (
              <span className="mt-1.5 block px-1 text-left text-[13px] font-semibold" style={{ color: tint }}>
                {o.price}
              </span>
            )}
          </button>
        ))}
          </div>
        ))}
      </div>

      {host &&
        open &&
        createPortal(
          <>
            <div className="sheet-backdrop" data-open={shown} onClick={hide} aria-hidden="true" />
            <div
              className="sheet"
              data-open={shown}
              role="dialog"
              aria-modal="true"
              aria-label={open.title}
              onTransitionEnd={() => !shown && setOpen(null)}
            >
              <div className="max-h-[calc(100dvh-24px-env(safe-area-inset-top))] overflow-y-auto overscroll-contain rounded-[28px] p-3 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]" style={{ background: "var(--ios-cell)", color: "var(--ios-label)" }}>
                <div className="relative">
                  {open.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={open.image} alt="" className="aspect-[4/3] w-full rounded-[20px] object-cover" />
                  ) : (
                    <div className="bz-item-blank aspect-[16/9] rounded-[20px]" style={{ "--tint": tint } as React.CSSProperties}>
                      <span>{open.title}</span>
                    </div>
                  )}
                  <button
                    ref={closeBtn}
                    type="button"
                    onClick={hide}
                    className="absolute top-2.5 right-2.5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md"
                    aria-label="Close"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>
                <div className="px-2 pt-4 pb-2">
                  {open.category && (
                    <span className="bz-tag" style={{ color: tint }}>
                      {open.category}
                    </span>
                  )}
                  <div className="mt-2 flex items-start justify-between gap-4">
                    <h3 className="text-[24px] leading-tight font-bold" style={{ letterSpacing: "-0.03em" }}>
                      {open.title}
                    </h3>
                    {open.price && (
                      <span className="shrink-0 pt-1 text-[18px] font-semibold" style={{ color: tint }}>
                        {open.price}
                      </span>
                    )}
                  </div>
                  {open.description && (
                    <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line" style={{ color: "var(--ios-secondary)" }}>
                      {open.description}
                    </p>
                  )}
                  <div className="mt-5 flex flex-col gap-2">
                    {open.url && (
                      <a href={open.url} target="_blank" rel="noopener noreferrer" className="bz-primary">
                        Order or book
                      </a>
                    )}
                    {inquire && (
                      <a href={inquire.href} target={inquire.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className={open.url ? "bz-secondary" : "bz-primary"}>
                        {inquire.label}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>,
          host
        )}
    </section>
  );
}
