"use client";

import { useEffect, useRef, useState } from "react";
import { onColor, safeColor } from "@/lib/color";
import type { WalletKind, WalletPass } from "@/lib/types";
import { isImageSrc, isSafeHttpUrl } from "@/lib/utils";
import { bankOf, isPaymentKind, presetOf } from "@/lib/wallet";

/** A pass ready to draw: the QR is pre-computed (on the server for public pages). */
export type ShownPass = WalletPass & { qr: { size: number; d: string } | null };

/** How much of each card shows in the stack (its title strip). */
const PEEK = 62;
/** Space under the open card for its buttons. */
const ACTIONS = 76;

const glyphPaths: Record<"wallet" | "qr" | "link" | "person", string> = {
  wallet: "M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9ZM4 9.5h16M15 14.5h2",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM18 14h2M14 18v2",
  link: "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 1 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 1 0 5.66 5.66l1-1",
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c0-3.6 3.1-6 7-6s7 2.4 7 6",
};

export function passGlyph(kind: WalletKind) {
  return isPaymentKind(kind) ? "wallet" : kind === "link" ? "link" : kind === "profile" ? "person" : "qr";
}

export function PassGlyph({ kind, className = "h-[18px] w-[18px]" }: { kind: WalletKind; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={glyphPaths[passGlyph(kind)]} />
    </svg>
  );
}

function QrImage({ pass }: { pass: ShownPass }) {
  if (pass.qr) {
    const { size, d } = pass.qr;
    return (
      <svg viewBox={`-1 -1 ${size + 2} ${size + 2}`} className="h-full w-full" shapeRendering="crispEdges" role="img" aria-label={`QR code: ${pass.title}`}>
        <path d={d} fill="#000" />
      </svg>
    );
  }
  if (isImageSrc(pass.qr_image)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={pass.qr_image} alt={`QR code: ${pass.title}`} className="h-full w-full object-contain" draggable={false} />;
  }
  return null;
}

/** Front of a pass: the colored card. Its top strip (title) is what shows in the stack. */
export function PassFront({ pass, ownerName }: { pass: WalletPass; ownerName: string }) {
  const preset = presetOf(pass.kind);
  const c = safeColor(pass.color);
  const ink = onColor(c);
  const name = pass.name?.trim() || (isPaymentKind(pass.kind) || pass.kind === "profile" ? ownerName : "");
  return (
    <span
      className="pass-face pass-front"
      style={{
        color: ink,
        background: `linear-gradient(140deg, color-mix(in srgb, ${c} 76%, #fff) 0%, ${c} 44%, color-mix(in srgb, ${c} 68%, #000) 100%)`,
      }}
    >
      <span className="pass-rings" aria-hidden="true" />
      <span className="relative flex h-[62px] items-center justify-between gap-3 px-[18px]">
        <span className="flex min-w-0 items-center gap-2.5">
          {isImageSrc(pass.logo) ? (
            <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center overflow-hidden rounded-[9px] bg-white p-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.2)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pass.logo} alt="" className="h-full w-full object-contain" draggable={false} />
            </span>
          ) : (
            <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px]" style={{ background: `color-mix(in srgb, ${ink} 16%, transparent)` }}>
              <PassGlyph kind={pass.kind} />
            </span>
          )}
          <span className="truncate text-[17px] font-semibold" style={{ letterSpacing: "-0.02em" }}>
            {pass.title || bankOf(pass.bank)?.name || preset.label}
          </span>
        </span>
        <span className="shrink-0 text-[11px] font-semibold uppercase opacity-75" style={{ letterSpacing: "0.08em" }}>
          {preset.tag}
        </span>
      </span>
      <span className="absolute inset-x-[18px] bottom-4 flex items-end justify-between gap-4">
        <span className="min-w-0">
          {name && (
            <>
              <span className="block text-[10px] font-semibold uppercase opacity-70" style={{ letterSpacing: "0.1em" }}>
                {isPaymentKind(pass.kind) ? "Account name" : "Name"}
              </span>
              <span className="mt-0.5 block truncate text-[15px] font-semibold">{name}</span>
            </>
          )}
        </span>
        {pass.number?.trim() ? (
          <span className="min-w-0 text-right">
            <span className="block text-[10px] font-semibold uppercase opacity-70" style={{ letterSpacing: "0.1em" }}>
              {isPaymentKind(pass.kind) ? "Number" : "Details"}
            </span>
            <span className="mt-0.5 block truncate text-[15px] font-semibold tabular-nums">{pass.number}</span>
          </span>
        ) : (
          <span className="shrink-0 opacity-80">
            <PassGlyph kind="custom" className="h-6 w-6" />
          </span>
        )}
      </span>
    </span>
  );
}

function PassBack({ pass, ownerName }: { pass: ShownPass; ownerName: string }) {
  const preset = presetOf(pass.kind);
  const name = pass.name?.trim() || ownerName;
  return (
    <span className="pass-face pass-back">
      <span className="pass-qr">
        <QrImage pass={pass} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-between py-0.5 text-left">
        <span className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: safeColor(pass.color) }} />
          <span className="truncate text-[14px] font-semibold">{pass.title || preset.label}</span>
        </span>
        <span className="min-w-0">
          <span className="block text-[12px] font-medium text-[#8e8e93]">{preset.action}</span>
          <span className="mt-0.5 block text-[15px] leading-tight font-semibold [overflow-wrap:anywhere]">{name}</span>
          {pass.number?.trim() && <span className="mt-1 block truncate text-[13px] text-[#3c3c43] tabular-nums">{pass.number}</span>}
        </span>
        <span className="text-[11px] text-[#aeaeb2]">Tap to close</span>
      </span>
    </span>
  );
}


/** Hold this long (touch) before a card lifts for dragging, so normal scrolling still works. */
const HOLD_MS = 280;

type Drag = { index: number; pointerId: number; startY: number; dy: number; active: boolean; touch: boolean };

/**
 * Apple Wallet–style stack. Cards overlap so each title shows; tapping one brings it to the
 * top, flips it over to show its QR code, and lines the others up underneath.
 * With `onReorder` (the owner's settings), cards can be dragged up or down to change the order:
 * press and drag with a mouse, or hold and drag on a phone.
 */
export function WalletStack({
  passes,
  ownerName,
  tint,
  hint = true,
  onReorder,
}: {
  passes: ShownPass[];
  ownerName: string;
  tint: string;
  hint?: boolean;
  onReorder?: (from: number, to: number) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justDragged = useRef(false);
  const sel = picked !== null && picked < passes.length ? picked : null;
  const n = passes.length;

  const update = (d: Drag | null) => {
    dragRef.current = d;
    setDrag(d);
  };

  useEffect(() => {
    if (sel === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPicked(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel]);

  // While a card is lifted on a phone, stop the page from scrolling under the finger.
  const lifted = Boolean(drag?.active && drag.touch);
  useEffect(() => {
    if (!lifted) return;
    const stop = (e: TouchEvent) => e.preventDefault();
    document.addEventListener("touchmove", stop, { passive: false });
    return () => document.removeEventListener("touchmove", stop);
  }, [lifted]);

  // Where the dragged card would land.
  const target = drag?.active ? Math.max(0, Math.min(n - 1, Math.round((drag.index * PEEK + drag.dy) / PEEK))) : null;

  const onPointerDown = (e: React.PointerEvent, i: number) => {
    if (!onReorder || sel !== null || n < 2 || (e.pointerType === "mouse" && e.button !== 0)) return;
    const touch = e.pointerType !== "mouse";
    const d: Drag = { index: i, pointerId: e.pointerId, startY: e.clientY, dy: 0, active: false, touch };
    update(d);
    if (touch) {
      holdTimer.current = setTimeout(() => {
        const cur = dragRef.current;
        if (!cur || cur.pointerId !== d.pointerId) return;
        update({ ...cur, active: true });
        navigator.vibrate?.(8);
      }, HOLD_MS);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dy = e.clientY - d.startY;
    if (!d.active) {
      if (d.touch) {
        // Moved before the hold finished: it's a scroll, not a drag.
        if (Math.abs(dy) > 8) cancel();
        return;
      }
      if (Math.abs(dy) < 6) return;
      capture(e);
      update({ ...d, dy, active: true });
      return;
    }
    if (d.touch) capture(e);
    const min = -d.index * PEEK - 24;
    const max = (n - 1 - d.index) * PEEK + 24;
    update({ ...d, dy: Math.max(min, Math.min(max, dy)) });
  };

  /** Keep getting moves even when the pointer leaves the card. */
  const capture = (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    try {
      if (!el.hasPointerCapture(e.pointerId)) el.setPointerCapture(e.pointerId);
    } catch {
      /* pointer already gone */
    }
  };

  const cancel = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    update(null);
  };

  const onPointerUp = () => {
    const d = dragRef.current;
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (d?.active) {
      justDragged.current = true; // the click that follows a drag shouldn't open the card
      setTimeout(() => (justDragged.current = false), 50);
      const to = Math.max(0, Math.min(n - 1, Math.round((d.index * PEEK + d.dy) / PEEK)));
      if (to !== d.index) onReorder?.(d.index, to);
    }
    update(null);
  };

  // Keyboard: Alt + ↑/↓ moves the focused card.
  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (!onReorder || sel !== null || !e.altKey) return;
    const to = e.key === "ArrowUp" ? i - 1 : e.key === "ArrowDown" ? i + 1 : null;
    if (to === null || to < 0 || to >= n) return;
    e.preventDefault();
    onReorder(i, to);
  };

  const others = n - 1;
  const height =
    sel === null
      ? `calc(var(--ch) + ${(n - 1) * PEEK}px)`
      : others > 0
        ? `calc(var(--ch) * 2 + ${ACTIONS + (others - 1) * PEEK}px)`
        : `calc(var(--ch) + ${ACTIONS}px)`;
  const open = sel !== null ? passes[sel] : null;
  const openLink = open?.qr_text && (open.kind === "link" || open.kind === "profile") && isSafeHttpUrl(open.qr_text) ? open.qr_text : null;

  return (
    <div className="wallet" style={{ "--tint": tint, "--on-tint": onColor(tint) } as React.CSSProperties}>
      <div className="wallet-stack" data-open={sel !== null} data-dragging={drag?.active ?? false} style={{ height }}>
        {passes.map((p, i) => {
          let y = `${i * PEEK}px`;
          let scale = 1;
          let z = i + 1;
          let dragging = false;
          if (sel !== null) {
            if (i === sel) {
              y = "0px";
              z = 50;
            } else {
              // The other cards line up under the open one, titles showing, nothing cut off.
              const k = i < sel ? i : i - 1;
              y = `calc(var(--ch) + ${ACTIONS + k * PEEK}px)`;
            }
          } else if (drag?.active && target !== null) {
            if (i === drag.index) {
              y = `${i * PEEK + drag.dy}px`;
              scale = 1.03;
              z = 60;
              dragging = true;
            } else {
              const j = i > drag.index && i <= target ? i - 1 : i < drag.index && i >= target ? i + 1 : i;
              y = `${j * PEEK}px`;
              z = j + 1;
            }
          }
          const isOpen = i === sel;
          return (
            <button
              key={p.id}
              type="button"
              className="pass"
              data-dragging={dragging}
              data-holding={drag && !drag.active && drag.index === i && drag.touch ? true : undefined}
              style={{ transform: `translateY(${y}) scale(${scale})`, zIndex: z, transitionDelay: sel === null && !drag ? "150ms" : "0ms" }}
              onClick={() => {
                if (justDragged.current) return;
                setPicked(isOpen ? null : i);
              }}
              onPointerDown={(e) => onPointerDown(e, i)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={cancel}
              onKeyDown={(e) => onKeyDown(e, i)}
              onContextMenu={onReorder ? (e) => e.preventDefault() : undefined}
              aria-expanded={isOpen}
              aria-label={isOpen ? `${p.title}: QR code shown. Tap to close.` : `${p.title}: show QR code${onReorder ? ". Alt plus arrow keys to move." : ""}`}
            >
              <span className="pass-flip" data-flipped={isOpen}>
                <PassFront pass={p} ownerName={ownerName} />
                <PassBack pass={p} ownerName={ownerName} />
              </span>
            </button>
          );
        })}

        <div className="wallet-actions" aria-hidden={sel === null}>
          {openLink && (
            <a href={openLink} target="_blank" rel="noopener noreferrer" className="wallet-btn" tabIndex={sel === null ? -1 : 0}>
              Open link
            </a>
          )}
          <button type="button" className="wallet-btn wallet-btn-primary" onClick={() => setPicked(null)} tabIndex={sel === null ? -1 : 0}>
            Done
          </button>
        </div>
      </div>

      {hint && (
        <p className="mt-5 text-center text-[13px] transition-opacity duration-300" style={{ color: "var(--ios-secondary)", opacity: sel === null ? 1 : 0 }} aria-hidden={sel !== null}>
          {onReorder && n > 1 ? "Tap a card to show its QR code · Hold and drag to reorder" : "Tap a card to show its QR code"}
        </p>
      )}
    </div>
  );
}
