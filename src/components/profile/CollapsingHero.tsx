"use client";

import { useEffect, useRef } from "react";

/** Size of the avatar the photo card shrinks into. */
const CIRCLE = 96;

/**
 * Personal profile header. It opens as a big photo card with the name on it; as you scroll,
 * the card shrinks into a circle avatar with the name under it, and the page content follows
 * its bottom edge so nothing overlaps. Works on the page and inside the settings preview.
 *
 * The morph is one element: it scales toward the top centre while a clip-path trims it
 * to a square and rounds it into a circle.
 */
export function CollapsingHero({
  photo,
  initial,
  name,
  tagline,
  place,
  socials,
  actions,
  className = "",
  style,
}: {
  photo: string | null;
  initial: string;
  name: string;
  tagline: string | null;
  place: string | null;
  /** Social links, shown on the photo in the name's row; they fade out with it. */
  socials?: React.ReactNode;
  /** Floating buttons in the top corners (share, owner menu). */
  actions: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const space = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const info = useRef<HTMLDivElement>(null);
  const mini = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);

  // Name and social icons share a row; if the name's longest word doesn't fit beside them, stack the icons under it.
  useEffect(() => {
    const r = row.current;
    const h = r?.querySelector("h1");
    if (!r || !h) return;
    const fit = () => {
      r.classList.remove("is-stacked");
      h.style.fontSize = "";
      if (r.childElementCount < 2) return;
      const over = () => h.scrollWidth > h.clientWidth + 1;
      // First try a slightly smaller name (down to 30px), then give up and stack.
      for (let size = parseFloat(getComputedStyle(h).fontSize) - 1; over() && size >= 30; size--) h.style.fontSize = size + "px";
      if (over()) {
        h.style.fontSize = "";
        r.classList.add("is-stacked");
      }
    };
    fit();
    document.fonts?.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(r);
    return () => ro.disconnect();
  }, [name, socials]);

  useEffect(() => {
    const el = space.current;
    const f = frame.current;
    if (!el || !f) return;
    const scroller = el.closest<HTMLElement>("[data-preview-scroll]");
    let raf = 0;

    const update = () => {
      raf = 0;
      const W = f.offsetWidth;
      const H = f.offsetHeight;
      if (!W || !H) return; // hidden (another tab is open)
      const labelH = (mini.current?.offsetHeight ?? 0) + 12;
      const D = Math.max(1, H - CIRCLE - labelH);
      const top = scroller ? scroller.getBoundingClientRect().top : 0;
      // How far the page has scrolled past the top of the hero.
      const y = Math.max(0, top - el.getBoundingClientRect().top);
      const p = Math.min(1, y / D);
      const after = Math.max(0, y - D);

      // Keep the card's bottom edge moving with the content below it.
      // Visible height shrinks from H to CIRCLE: clip the card to a square (cut), then scale it down.
      const cut = Math.max(0, H - W) * p;
      const s = (H - p * (H - CIRCLE)) / (H - cut);
      const radius = 32 + (W / 2 - 32) * p;
      f.style.transform = `translate3d(0, ${-after}px, 0) scale(${Math.min(1, s)})`;
      f.style.clipPath = `inset(0 0 ${cut}px 0 round ${radius}px)`;

      if (info.current) {
        const o = Math.max(0, 1 - p / 0.35);
        info.current.style.opacity = String(o);
        // Once it has mostly faded, the social links stop taking taps.
        info.current.style.pointerEvents = o < 0.5 ? "none" : "";
      }
      // The name fades in only near the end, once the gap under the circle has opened up.
      const m = Math.min(1, Math.max(0, (p - 0.86) / 0.14));
      if (mini.current) {
        mini.current.style.opacity = String(m);
        // Sit just under the shrinking photo (its bottom edge is 12 + H - p(H - CIRCLE)), not at a fixed spot.
        const under = (H - p * (H - CIRCLE)) - CIRCLE;
        mini.current.style.transform = `translate3d(0, ${under - after + (1 - m) * 8}px, 0)`;
      }
      if (bar.current) bar.current.style.transform = `translate3d(0, ${-after}px, 0)`;
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    const target: HTMLElement | Window = scroller ?? window;
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const ro = new ResizeObserver(onScroll);
    ro.observe(f);
    return () => {
      cancelAnimationFrame(raf);
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      ro.disconnect();
    };
  }, []);

  return (
    // display: contents, so the sticky header is pinned for the whole page (not just this box).
    <div className="pp-collapse">
      <div className={`pp-head ${className}`} style={style}>
        <div ref={frame} className="pp-frame">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="pp-frame-img" />
          ) : (
            <>
              <div className="pf-banner-mesh" />
              <span className="pp-frame-initial" aria-hidden="true">
                {initial}
              </span>
            </>
          )}
          <div className="pp-frame-shade" aria-hidden="true" />
          <div ref={info} className="pp-frame-info">
            {place && <span className="pp-chip">{place}</span>}
            <div ref={row} className="pp-name-row">
              <h1 className="pp-name">{name}</h1>
              {socials}
            </div>
            {tagline && <p className="pp-tagline">{tagline}</p>}
          </div>
        </div>

        {/* Shown once the photo is a circle: the name under it, centred */}
        <div ref={mini} className="pp-mini" aria-hidden="true">
          <p className="pp-mini-name">{name}</p>
          {tagline && <p className="pp-mini-sub">{tagline}</p>}
        </div>

        <div ref={bar} className="pp-topbar">
          {actions}
        </div>
      </div>
      <div ref={space} className="pp-frame-space" aria-hidden="true" />
    </div>
  );
}
