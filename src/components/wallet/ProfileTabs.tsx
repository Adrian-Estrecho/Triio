"use client";

import { useEffect, useRef, useState } from "react";

export type ProfileTab = "profile" | "wallet" | "games";

export const TAB_ICONS: Record<ProfileTab, string> = {
  profile: "M12 12.2a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2ZM4.5 20.5c.6-3.9 3.7-6.3 7.5-6.3s6.9 2.4 7.5 6.3",
  wallet: "M5 8.2h14M6.6 4.6h10.8M4.8 11.2c0-1 .8-1.8 1.8-1.8h10.8c1 0 1.8.8 1.8 1.8v7.4c0 1-.8 1.8-1.8 1.8H6.6c-1 0-1.8-.8-1.8-1.8v-7.4Z",
  games:
    "M7.6 7.5h8.8a4.6 4.6 0 0 1 4.5 3.7l.8 4.3a2.6 2.6 0 0 1-4.5 2.2l-1.9-2.1H8.7l-1.9 2.1a2.6 2.6 0 0 1-4.5-2.2l.8-4.3a4.6 4.6 0 0 1 4.5-3.7ZM8 10.4v3M6.5 11.9h3M15.6 11.2h.01M17.4 13h.01",
};
const labels: Record<ProfileTab, string> = { profile: "Profile", wallet: "Wallet", games: "Games" };
const ITEM = 96;

/**
 * Bottom tab bar on a personal card: "Profile", plus "Wallet" and "Games" when the owner has
 * something to show in them (a tab with nothing in it is left out). `#wallet` / `#games` in the
 * link opens that tab directly. `embedded` (the live preview in settings) leaves the URL and scroll alone.
 */
export function ProfileTabs({
  children,
  wallet,
  games,
  tint,
  initialTab = "profile",
  embedded = false,
}: {
  children: React.ReactNode;
  wallet?: React.ReactNode;
  games?: React.ReactNode;
  tint: string;
  initialTab?: ProfileTab;
  embedded?: boolean;
}) {
  const panels: Partial<Record<ProfileTab, React.ReactNode>> = { profile: children };
  if (wallet) panels.wallet = wallet;
  if (games) panels.games = games;
  const ids = (["profile", "wallet", "games"] as const).filter((t) => t in panels);
  const key = ids.join(",");

  const [picked, setTab] = useState<ProfileTab>(initialTab);
  // A tab that disappears (e.g. the last game removed in the preview) falls back to the profile.
  const tab: ProfileTab = ids.includes(picked) ? picked : "profile";
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (embedded) return;
    const fromHash = () => {
      const h = window.location.hash.slice(1) as ProfileTab;
      setTab(key.split(",").includes(h) ? h : "profile");
    };
    if (window.location.hash) fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [embedded, key]);

  const go = (t: ProfileTab) => {
    if (t === tab) return;
    // Coming back to the profile replays its rise-in, but without waiting for the intro again.
    root.current?.closest<HTMLElement>("[data-reveal-root]")?.style.setProperty("--reveal-delay", "0ms");
    setTab(t);
    if (!embedded) {
      const { pathname, search } = window.location;
      history.replaceState(null, "", t === "profile" ? `${pathname}${search}` : `${pathname}${search}#${t}`);
      window.scrollTo({ top: 0 });
    } else {
      root.current?.closest<HTMLElement>("[data-preview-scroll]")?.scrollTo({ top: 0 });
    }
  };

  return (
    <div ref={root}>
      {ids.map((t) => (
        <div
          key={t}
          id={`tab-${t}`}
          role="tabpanel"
          aria-labelledby={`tabbtn-${t}`}
          hidden={tab !== t}
          className={t !== "profile" && tab === t ? "tab-in" : undefined}
        >
          {panels[t]}
        </div>
      ))}

      <nav className="tabbar" style={{ "--tint": tint, "--i": ids.indexOf(tab) } as React.CSSProperties} aria-label="Card sections">
        <div role="tablist" className="tabbar-list" style={{ gridTemplateColumns: `repeat(${ids.length}, ${ITEM}px)` }}>
          <span className="tabbar-pill" aria-hidden="true" />
          {ids.map((t) => (
            <button
              key={t}
              id={`tabbtn-${t}`}
              type="button"
              role="tab"
              aria-selected={tab === t}
              aria-controls={`tab-${t}`}
              onClick={() => go(t)}
              className="tabbar-item"
            >
              <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={TAB_ICONS[t]} />
              </svg>
              {labels[t]}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
