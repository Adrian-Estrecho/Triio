"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./ui";

/** The cover fills the top of the card behind the name: about 3 wide by 4 tall on a phone. */
export const COVER_ASPECT = 3 / 4;
const OUT_W = 1080;
const MAX_ZOOM = 4;

/** x, y: where the photo's center sits, relative to the frame's center (frame px). z: zoom, 1 = just covers the frame. */
type View = { x: number; y: number; z: number };
type Pt = { x: number; y: number };

/**
 * Move-and-scale for the cover photo, shown in the exact shape it has on the card.
 * Drag to move, pinch / scroll / slider to zoom, arrow keys to nudge. "Done" crops it to a JPEG.
 */
export function CoverCropper({
  src,
  name,
  tint,
  onCancel,
  onDone,
}: {
  src: string;
  name: string;
  tint: string;
  onCancel: () => void;
  onDone: (file: File) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [fw, setFw] = useState(0);
  const [view, setViewState] = useState<View>({ x: 0, y: 0, z: 1 });
  const [moving, setMoving] = useState(false);
  const [busy, setBusy] = useState(false);
  const viewRef = useRef(view);
  const pointers = useRef(new Map<number, Pt>());
  const start = useRef<{ view: View; pts: Pt[] } | null>(null);

  const fh = fw / COVER_ASPECT;
  const iw = img?.naturalWidth ?? 1;
  const ih = img?.naturalHeight ?? 1;
  const base = fw ? Math.max(fw / iw, fh / ih) : 1;

  // Keep the photo covering the whole frame.
  const clamp = useCallback(
    (v: View): View => {
      const z = Math.min(MAX_ZOOM, Math.max(1, v.z));
      const mx = Math.max(0, (iw * base * z - fw) / 2);
      const my = Math.max(0, (ih * base * z - fh) / 2);
      return { z, x: Math.min(mx, Math.max(-mx, v.x)), y: Math.min(my, Math.max(-my, v.y)) };
    },
    [iw, ih, base, fw, fh]
  );
  const setView = useCallback(
    (v: View) => {
      const c = clamp(v);
      viewRef.current = c;
      setViewState(c);
    },
    [clamp]
  );

  /** Zoom to z while keeping the point p (relative to the frame's center) still. */
  const zoomAt = useCallback(
    (from: View, z: number, p: Pt): View => {
      const nz = Math.min(MAX_ZOOM, Math.max(1, z));
      const k = nz / from.z;
      return { z: nz, x: p.x - (p.x - from.x) * k, y: p.y - (p.y - from.y) * k };
    },
    []
  );

  useEffect(() => {
    const el = new Image();
    if (/^https?:/.test(src)) el.crossOrigin = "anonymous"; // so a saved cover can be cropped again
    el.onload = () => {
      setFailed(false);
      setImg(el);
    };
    el.onerror = () => setFailed(true);
    el.src = src;
    return () => {
      el.onload = el.onerror = null;
    };
  }, [src]);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFw(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A new photo (or a new frame size) starts centered.
  useEffect(() => {
    viewRef.current = { x: 0, y: 0, z: 1 };
    setViewState(viewRef.current);
  }, [img, fw]);

  // Scroll / trackpad pinch zooms around the cursor (needs a non-passive listener).
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const p = { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
      const v = viewRef.current;
      setView(zoomAt(v, v.z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0025)), p));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [setView, zoomAt]);

  const rel = (e: React.PointerEvent): Pt => {
    const r = frame.current!.getBoundingClientRect();
    return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
  };
  const restart = () => {
    const pts = [...pointers.current.values()];
    start.current = pts.length ? { view: viewRef.current, pts } : null;
    setMoving(pts.length > 0);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!img) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    pointers.current.set(e.pointerId, rel(e));
    restart();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !start.current) return;
    pointers.current.set(e.pointerId, rel(e));
    const s = start.current;
    const now = [...pointers.current.values()];
    if (now.length === 1 || s.pts.length === 1) {
      setView({ ...s.view, x: s.view.x + now[0].x - s.pts[0].x, y: s.view.y + now[0].y - s.pts[0].y });
      return;
    }
    // Two fingers: pinch around their midpoint, and move with it.
    const mid = (a: Pt, b: Pt) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const m0 = mid(s.pts[0], s.pts[1]);
    const m1 = mid(now[0], now[1]);
    const z = zoomAt(s.view, s.view.z * (dist(now[0], now[1]) / dist(s.pts[0], s.pts[1])), m0);
    setView({ ...z, x: z.x + m1.x - m0.x, y: z.y + m1.y - m0.y });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    restart();
  };

  const onKey = (e: React.KeyboardEvent) => {
    const v = viewRef.current;
    const step = e.shiftKey ? 40 : 10;
    const moves: Record<string, Partial<View>> = {
      ArrowLeft: { x: v.x + step },
      ArrowRight: { x: v.x - step },
      ArrowUp: { y: v.y + step },
      ArrowDown: { y: v.y - step },
    };
    if (moves[e.key]) setView({ ...v, ...moves[e.key] });
    else if (e.key === "+" || e.key === "=") setView(zoomAt(v, v.z * 1.15, { x: 0, y: 0 }));
    else if (e.key === "-") setView(zoomAt(v, v.z / 1.15, { x: 0, y: 0 }));
    else return;
    e.preventDefault();
  };

  const done = async () => {
    if (!img || !fw || busy) return;
    setBusy(true);
    try {
      const s = base * view.z; // frame px per photo px
      const sw = fw / s;
      const sh = fh / s;
      const sx = (iw * s - fw) / 2 / s - view.x / s;
      const sy = (ih * s - fh) / 2 / s - view.y / s;
      const outW = Math.round(Math.min(OUT_W, sw));
      const outH = Math.round(outW / COVER_ASPECT);
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
      if (!blob) throw new Error("no blob");
      onDone(new File([blob], "cover.jpg", { type: "image/jpeg" }));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const w = iw * base;
  const h = ih * base;

  return (
    <div className="pb-3">
      <span className="mx-auto mt-2 block h-[5px] w-9 rounded-full" style={{ background: "var(--ios-tertiary)" }} aria-hidden="true" />
      <div className="grid h-11 grid-cols-[1fr_auto_1fr] items-center px-4">
        <button type="button" onClick={onCancel} className="cursor-pointer justify-self-start text-[17px]" style={{ color: "var(--ios-secondary)" }}>
          Cancel
        </button>
        <h3 className="text-[17px] font-semibold">Move and scale</h3>
        <button
          type="button"
          onClick={done}
          disabled={!img || busy || failed}
          className="cursor-pointer justify-self-end text-[17px] font-semibold disabled:cursor-default disabled:opacity-40"
          style={{ color: tint }}
        >
          {busy ? "…" : "Done"}
        </button>
      </div>

      <div className="px-4 pt-2">
        <div
          ref={frame}
          tabIndex={0}
          role="application"
          aria-label="Cover photo. Drag to move, pinch or scroll to zoom. Arrow keys move it, plus and minus zoom."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKey}
          className="relative mx-auto touch-none overflow-hidden rounded-[22px] outline-none select-none focus-visible:ring-2"
          style={{
            width: "min(100%, calc((100dvh - 250px) * 0.75))",
            aspectRatio: `${COVER_ASPECT}`,
            background: "#111",
            cursor: moving ? "grabbing" : "grab",
            ["--tw-ring-color" as string]: tint,
          }}
        >
          {img && fw > 0 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute top-1/2 left-1/2 max-w-none"
              style={{
                width: w,
                height: h,
                transform: `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) scale(${view.z})`,
                transition: moving ? "none" : "transform 120ms ease-out",
              }}
            />
          )}

          {/* How the card lays over it: the name near the bottom, on a soft shade. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/60 to-transparent" aria-hidden="true" />
          <p
            className="pointer-events-none absolute inset-x-4 bottom-[18%] truncate text-center text-[26px] leading-none font-bold text-white"
            style={{ letterSpacing: "-0.035em", textShadow: "0 2px 20px rgba(0,0,0,0.35)" }}
            aria-hidden="true"
          >
            {name}
          </p>

          {/* Thirds grid while moving */}
          <div className="pointer-events-none absolute inset-0 transition-opacity duration-200" style={{ opacity: moving ? 1 : 0 }} aria-hidden="true">
            {[1, 2].map((i) => (
              <span key={`v${i}`} className="absolute inset-y-0 w-px bg-white/45" style={{ left: `${(i * 100) / 3}%` }} />
            ))}
            {[1, 2].map((i) => (
              <span key={`h${i}`} className="absolute inset-x-0 h-px bg-white/45" style={{ top: `${(i * 100) / 3}%` }} />
            ))}
          </div>

          {!img && !failed && (
            <span className="absolute inset-0 flex items-center justify-center text-[14px] text-white/70" aria-hidden="true">
              Loading…
            </span>
          )}
          {failed && (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center text-[14px] leading-snug text-white/85" role="alert">
              <Icon name="alert" className="h-6 w-6" />
              Couldn’t edit this photo. Choose it again from your phone.
            </span>
          )}
        </div>

        <div className="mx-auto mt-4 flex max-w-sm items-center gap-3" style={{ color: "var(--ios-secondary)" }}>
          <Icon name="image" className="h-4 w-4 shrink-0" />
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={view.z}
            onChange={(e) => setView(zoomAt(viewRef.current, Number(e.target.value), { x: 0, y: 0 }))}
            className="h-1 flex-1 cursor-pointer"
            style={{ accentColor: tint }}
            aria-label="Zoom"
            disabled={!img}
          />
          <Icon name="image" className="h-6 w-6 shrink-0" />
        </div>
        <p className="mt-2 text-center text-[13px]" style={{ color: "var(--ios-secondary)" }}>
          Drag to choose what shows. This is how it sits behind your name on your card.
        </p>
      </div>
    </div>
  );
}
