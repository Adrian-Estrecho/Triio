"use client";

import { useEffect, useState } from "react";
import { NAME_START, STEP, introTimeline } from "./introTimeline";

/**
 * Full-screen "Hi, I'm …" intro that plays when a personal card is opened.
 * It's server-rendered and animated with CSS, so it covers the page from the first paint;
 * JavaScript only adds tap-to-skip and removes it once it's done.
 */
export function NameIntro({
  name,
  greeting,
  tagline,
  photo,
  accent,
  onAccent,
}: {
  name: string;
  greeting: string;
  tagline: string | null;
  photo: string | null;
  accent: string;
  onAccent: string;
}) {
  const [state, setState] = useState<"playing" | "skipped" | "done">("playing");
  const { nameEnd, exit } = introTimeline(name);

  const skip = () => {
    if (state !== "playing") return;
    setState("skipped");
    document.querySelector<HTMLElement>("[data-reveal-root]")?.style.setProperty("--reveal-delay", "0ms");
  };

  useEffect(() => {
    if (state !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (state === "done") return null;

  // Split into words (so a name never breaks mid-word), then letters.
  let i = 0;
  const words = name.trim().split(/\s+/).map((word) => Array.from(word).map((ch) => ({ ch, i: i++ })));

  return (
    <div
      className={`intro ${state === "skipped" ? "is-skipped" : ""}`}
      style={
        {
          "--accent": accent,
          "--intro-exit": `${exit}ms`,
          "--name-start": `${NAME_START}ms`,
          "--name-end": `${nameEnd}ms`,
          "--step": `${STEP}ms`,
        } as React.CSSProperties
      }
      onClick={skip}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget && e.animationName === "intro-out") setState("done");
      }}
      aria-hidden="true"
    >
      <div className="intro-aurora">
        <span className="intro-orb intro-orb-a" />
        <span className="intro-orb intro-orb-b" />
        <span className="intro-grain" />
      </div>

      <div className="intro-stage">
        <div className="intro-avatar">
          <span className="intro-ring" />
          <span className="intro-avatar-img" style={{ background: photo ? "#fff" : accent, color: onAccent }}>
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="h-full w-full object-cover" />
            ) : (
              Array.from(name)[0]?.toUpperCase()
            )}
          </span>
        </div>

        <p className="intro-greeting">{greeting}</p>

        <h2 className="intro-name">
          {words.map((letters, w) => (
            <span key={w}>
              <span className="intro-word">
                {letters.map(({ ch, i }) => (
                  <span key={i} className="intro-letter" style={{ "--i": Math.min(i, 28) } as React.CSSProperties}>
                    {ch}
                  </span>
                ))}
              </span>
              {w < words.length - 1 && " "}
            </span>
          ))}
        </h2>

        <span className="intro-rule" />
        {tagline && <p className="intro-tagline">{tagline}</p>}
      </div>

      <span className="intro-skip">Tap to skip</span>
    </div>
  );
}
