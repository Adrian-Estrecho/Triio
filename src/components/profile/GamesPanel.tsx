import { onColor } from "@/lib/color";
import { fullGameId, gameName, gameOf } from "@/lib/games";
import type { GameId } from "@/lib/types";
import { CopyButton } from "./CopyButton";

/**
 * The Games tab on a personal card: a large title over the owner's in-game IDs, each one copyable.
 * Styled like the profile's sections (an uppercase label over an ios-card of rows).
 */
export function GamesPanel({ name, games }: { name: string; games: GameId[] }) {
  const first = name.trim().split(/\s+/)[0] || name;
  return (
    <div className="mx-auto w-full max-w-md px-4 pt-[calc(env(safe-area-inset-top)+28px)] pb-[calc(env(safe-area-inset-bottom)+128px)]">
      <header className="mb-6 flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold uppercase" style={{ color: "var(--ios-secondary)", letterSpacing: "0.08em" }}>
            {name}
          </p>
          <h1 className="font-display mt-1 text-[34px] leading-none font-bold" style={{ fontStretch: "112%", letterSpacing: "-0.035em" }}>
            Games
          </h1>
        </div>
        <span className="pb-1 text-[13px] font-medium" style={{ color: "var(--ios-secondary)" }}>
          {games.length} {games.length === 1 ? "game" : "games"}
        </span>
      </header>

      <section className="pp-section" style={{ marginTop: 0 }}>
        <h2 className="pp-section-title">Play with {first}</h2>
        <div className="ios-card">
          {games.map((g, i) => {
            const info = gameOf(g.game);
            const title = gameName(g);
            const id = fullGameId(g);
            const ign = g.ign?.trim();
            return (
              <div key={i} className="ios-row">
                <span
                  className="pf-game-tile font-display"
                  style={{ width: 36, height: 36, borderRadius: 10, fontSize: 9.5, background: info.color, color: onColor(info.color) }}
                  aria-hidden="true"
                >
                  {info.short}
                </span>
                <span className="ios-row-body">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium" style={{ color: "var(--ios-secondary)" }}>
                      {title}
                    </span>
                    <span className="mt-0.5 block truncate text-[16px] leading-snug font-semibold">{ign || id}</span>
                    {ign && (
                      <span className="font-code mt-0.5 block truncate text-[12px]" style={{ color: "var(--ios-secondary)" }}>
                        {info.idLabel} {id}
                      </span>
                    )}
                  </span>
                  <span style={{ color: "var(--tint)" }}>
                    <CopyButton text={id} label={`Copy ${title} ${info.idLabel}`} className="pf-copy" />
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <p className="mt-3 px-2 text-center text-[12.5px] leading-snug" style={{ color: "var(--ios-secondary)" }}>
        Copy an ID, then add {first} as a friend in the game.
      </p>
    </div>
  );
}
