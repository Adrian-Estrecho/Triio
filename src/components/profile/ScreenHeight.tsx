"use client";

import { useEffect, useRef } from "react";

/**
 * The personal page's first screen is exactly one screen tall (`--pp-vh`, 100svh by default).
 * Inside the settings preview the "screen" is the phone frame, so measure that instead.
 */
export function ScreenHeight() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    const pp = el?.closest<HTMLElement>(".pp");
    const scroller = el?.closest<HTMLElement>("[data-preview-scroll]");
    // On the real page 100svh is right (and doesn't jump when the address bar hides).
    if (!pp || !scroller) return;
    const set = () => pp.style.setProperty("--pp-vh", `${scroller.clientHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(scroller);
    return () => ro.disconnect();
  }, []);

  return <span ref={ref} hidden />;
}
