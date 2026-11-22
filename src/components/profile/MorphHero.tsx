"use client";

import { useEffect, useRef } from "react";
import { ProfileCard } from "./ProfileCard";
import type { ProfileData } from "./shared";

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** The round photo: as big on the big photo as on the card (the card's is 108px). */
const AVATAR = 108;
const AVATAR_START = 116;

/**
 * Personal hero. After the intro, a big photo sits in the middle of the screen with the round
 * profile photo in its centre; the round photo is the one from the intro, which stays on screen
 * and flies down into place as the intro leaves. As you scroll, the big photo shrinks up into
 * the banner of the profile card, the round photo travels to its spot on the banner's edge,
 * and the rest of the card (name, actions) fades in; then the finished card scrolls away.
 *
 * The card underneath is the real ProfileCard; the big photo and the round photo are overlays
 * that land exactly on its banner and its round photo, then hand over to them.
 * Works on the page and inside the settings preview.
 */
export function MorphHero({
  d,
  photo,
  socials,
  actions,
  edit,
  intro = false,
  className = "",
  style,
}: {
  d: ProfileData;
  photo: string | null;
  /** Social icons for the big photo (the card shows its own). */
  socials: React.ReactNode;
  /** Share and owner menu, shown on the big photo. */
  actions: React.ReactNode;
  /** The owner menu again, for the card's banner. */
  edit?: React.ReactNode;
  /** The name intro is playing: its round photo flies into place when it leaves. */
  intro?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const p = d.profile;
  const scene = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const shot = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const info = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const avatar = useRef<HTMLSpanElement>(null);

  // Scroll-linked morph: big photo → the card's banner; round photo → its spot on the card.
  useEffect(() => {
    const sc = scene.current;
    const pn = pin.current;
    const cd = card.current;
    const sh = shot.current;
    const av = avatar.current;
    if (!sc || !pn || !cd || !sh || !av) return;
    const scroller = sc.closest<HTMLElement>("[data-preview-scroll]");
    let raf = 0;

    const update = () => {
      raf = 0;
      const W = pn.offsetWidth;
      if (!W) return; // hidden (another tab is open)
      const vh = scroller ? scroller.clientHeight : window.innerHeight;
      const T = parseFloat(getComputedStyle(pn).top) || 0;
      const scrTop = scroller ? scroller.getBoundingClientRect().top : 0;
      // How far the page has scrolled into the scene (0 at rest).
      const y = scrTop + T - sc.getBoundingClientRect().top;
      const D = sc.offsetHeight - pn.offsetHeight;
      const t = D < 80 ? 1 : clamp(y / D);
      // The photo reaches the banner at 85%, then fades so the round photo on its edge shows.
      const e = ease(clamp(t / 0.85));

      // Where the photo lands: the card's banner (its section's first child), relative to the pin.
      const pr = pn.getBoundingClientRect();
      const banner = cd.querySelector("section")?.firstElementChild as HTMLElement | null;
      const br = banner?.getBoundingClientRect();
      const bTop = br ? br.top - pr.top : 8;
      const bLeft = br ? br.left - pr.left : 8;
      const bW = br ? br.width : W - 16;
      const bH = br ? br.height : 178;

      // Where it starts: as big as before (3:4, at most 72% of the screen), centred on the screen.
      const H0 = Math.min((W * 4) / 3, vh * 0.72);
      const top0 = (vh - H0) / 2 - T;

      const s = sh.style;
      s.top = `${mix(top0, bTop, e)}px`;
      s.left = `${mix(0, bLeft, e)}px`;
      s.width = `${mix(W, bW, e)}px`;
      s.height = `${mix(H0, bH, e)}px`;
      s.borderRadius = `${mix(32, 23, e)}px`;
      // The overlay hands over to the real banner at the very end.
      s.opacity = String(1 - clamp((t - 0.82) / 0.13));
      s.pointerEvents = t > 0.5 ? "none" : "auto";
      if (img.current) img.current.style.objectPosition = `50% ${mix(22, 30, e)}%`;

      // The round photo: from the centre of the big photo to the card's round photo.
      const slot = cd.querySelector<HTMLElement>(".pc-avatar");
      const sr = slot?.getBoundingClientRect();
      const a = ease(t);
      const x0 = W / 2 - AVATAR_START / 2;
      const y0 = top0 + H0 / 2 - AVATAR_START / 2;
      const x1 = sr ? sr.left - pr.left : 20;
      const y1 = sr ? sr.top - pr.top : bTop + bH - 56;
      const scale = mix(AVATAR_START, AVATAR, a) / AVATAR;
      av.style.transform = `translate3d(${mix(x0, x1, a)}px, ${mix(y0, y1, a)}px, 0) scale(${scale})`;
      // Its glow is for the middle only: gone by the time it's halfway to the card.
      av.style.setProperty("--glow", String(1 - clamp(t / 0.45)));
      // At the very end it hands over to the card's own (same place, same size).
      const done = t >= 0.999;
      av.style.visibility = done ? "hidden" : "";
      if (slot) slot.style.visibility = done ? "" : "hidden";

      // Name and buttons on the photo leave first; the card arrives in the second half.
      const o = Math.max(0, 1 - t / 0.35);
      if (info.current) info.current.style.opacity = String(o);
      if (bar.current) bar.current.style.opacity = String(o);
      const c = clamp((t - 0.4) / 0.4);
      cd.style.opacity = String(c);
      cd.style.pointerEvents = c < 0.5 ? "none" : "";
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    const target: HTMLElement | Window = scroller ?? window;
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const ro = new ResizeObserver(onScroll);
    ro.observe(sc);
    ro.observe(pn);
    return () => {
      cancelAnimationFrame(raf);
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      ro.disconnect();
    };
  }, []);

  // The hand-off from the intro: when the intro's text starts to leave, its round photo is
  // swapped (same place, same size) for a copy that flies into the centre of the big photo.
  useEffect(() => {
    const av = avatar.current;
    if (!av) return;
    const show = () => av.classList.remove("is-waiting");
    const root = av.closest<HTMLElement>("[data-reveal-root]");
    const introEl = root?.querySelector<HTMLElement>(".intro");
    if (!intro || !root || !introEl) return show();

    let flown = false;
    let flight: Animation | undefined;
    // A copy of the round photo, on the page root so it can sit above the leaving intro.
    const fl = av.cloneNode(true) as HTMLElement;
    fl.className = "mx-flyer";
    fl.style.transform = "none";
    fl.style.visibility = "";
    const fly = () => {
      if (flown) return;
      flown = true;
      const from = introEl.querySelector(".intro-avatar-img")?.getBoundingClientRect();
      if (!from?.width) return show();
      const to = av.getBoundingClientRect();
      root.appendChild(fl);
      // Where (0,0) of the flyer is: the screen, or the phone frame in the settings preview.
      const origin = fl.getBoundingClientRect();
      const at = (r: DOMRect, size: number) => `translate3d(${r.left - origin.left}px, ${r.top - origin.top}px, 0) scale(${size / AVATAR})`;
      flight = fl.animate(
        [
          { transform: at(from, from.width), boxShadow: "0 0 0 0 rgba(0,0,0,0)" },
          { transform: at(to, to.width), boxShadow: "" },
        ],
        { duration: 1000, easing: "cubic-bezier(0.3, 0.7, 0.15, 1)", fill: "forwards" }
      );
      flight.finished
        .then(() => {
          show();
          fl.remove();
        })
        .catch(() => {});
    };

    const onStart = (e: AnimationEvent) => {
      if (e.animationName === "stage-out") fly();
    };
    introEl.addEventListener("animationstart", onStart);
    // Loaded late, after the hand-off already started?
    const leaving = introEl
      .querySelector(".intro-stage")
      ?.getAnimations()
      .find((a) => (a as CSSAnimation).animationName === "stage-out");
    const delay = Number(leaving?.effect?.getTiming().delay ?? 0);
    if (leaving && Number(leaving.currentTime ?? -1) >= delay) fly();

    return () => {
      introEl.removeEventListener("animationstart", onStart);
      // Just stop; don't reveal the round photo here (React runs effects twice in development,
      // and the second run still has to fly it in).
      flight?.cancel();
      fl.remove();
    };
  }, [intro]);

  // Name and social icons share a row on the photo; if the name's longest word doesn't fit
  // beside them, shrink it a little (to 30px), then stack the icons under it.
  useEffect(() => {
    const r = row.current;
    const h = r?.querySelector<HTMLElement>(".pp-name");
    if (!r || !h) return;
    const fit = () => {
      r.classList.remove("is-stacked");
      h.style.fontSize = "";
      if (r.childElementCount < 2 || !r.offsetWidth) return;
      const over = () => h.scrollWidth > h.clientWidth + 1;
      for (let size = parseFloat(getComputedStyle(h).fontSize) - 1; over() && size >= 30; size--) h.style.fontSize = `${size}px`;
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
  }, [p.display_name, socials]);

  // The round photo, drawn like the card's: photo (or initial). Its ring and glow are in CSS.
  const face = (
    <>
      {d.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={d.logo} alt="" className="h-full w-full object-cover" />
      ) : (
        p.display_name.slice(0, 1).toUpperCase()
      )}
    </>
  );
  const faceStyle: React.CSSProperties = {
    background: d.logo ? "var(--pf-bg)" : `linear-gradient(150deg, color-mix(in srgb, ${d.accent} 80%, #fff), ${d.accent} 45%, color-mix(in srgb, ${d.accent} 65%, #000))`,
    color: d.onAccent,
  };

  return (
    <div ref={scene} className="mx-scene">
      <div ref={pin} className="mx-pin">
        <div ref={card} className="mx-card">
          <ProfileCard d={d} edit={edit} />
        </div>

        {/* The intro reveal goes on this wrapper, so it never fights the photo's own fade-out. */}
        <div className={`mx-photo-wrap ${className}`} style={style}>
          <div ref={shot} className="mx-photo">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img ref={img} src={photo} alt="" className="pp-frame-img" />
            ) : (
              <>
                <div className="pf-banner-mesh" />
                <span className="pp-frame-initial" aria-hidden="true">
                  {p.display_name.slice(0, 1).toUpperCase()}
                </span>
              </>
            )}
            <div className="pp-frame-shade" aria-hidden="true" />
            <div ref={info} className="pp-frame-info">
              {d.place && (
                <span className="pp-chip" aria-hidden="true">
                  {d.place}
                </span>
              )}
              <div ref={row} className="pp-name-row">
                {/* The card below has the real heading; this is the same name, big, on the photo. */}
                <p className="pp-name" aria-hidden="true">
                  {p.display_name}
                </p>
                {socials}
              </div>
              {p.tagline && (
                <p className="pp-tagline" aria-hidden="true">
                  {p.tagline}
                </p>
              )}
            </div>
            <div ref={bar} className="pp-topbar">
              {actions}
            </div>
          </div>
        </div>

        <span ref={avatar} className={`mx-avatar ${intro ? "is-waiting" : ""}`} style={faceStyle} aria-hidden="true">
          {face}
        </span>
      </div>
    </div>
  );
}
