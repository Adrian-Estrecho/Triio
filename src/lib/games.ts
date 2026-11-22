import type { GameId } from "./types";

/**
 * Games an owner can list their in-game ID for, so friends can add them.
 * Colors are close to each game's look; no logos are bundled (they're trademarks).
 */
export type GameKey =
  | "codm"
  | "mlbb"
  | "pubgm"
  | "freefire"
  | "hok"
  | "wildrift"
  | "valorant"
  | "genshin"
  | "hsr"
  | "roblox"
  | "minecraft"
  | "dota2"
  | "coc"
  | "steam"
  | "other";

export type GameInfo = {
  key: GameKey;
  name: string;
  /** Short tag shown on the game's tile. */
  short: string;
  color: string;
  /** What the game calls its ID. */
  idLabel: string;
  idPlaceholder: string;
  /** A second ID part some games need (MLBB's Zone ID, Genshin's server). */
  serverLabel?: string;
  serverPlaceholder?: string;
};

export const GAMES: GameInfo[] = [
  { key: "codm", name: "Call of Duty: Mobile", short: "CODM", color: "#2B2B2B", idLabel: "UID", idPlaceholder: "6742881322104" },
  { key: "mlbb", name: "Mobile Legends", short: "MLBB", color: "#1F56D6", idLabel: "User ID", idPlaceholder: "123456789", serverLabel: "Zone ID", serverPlaceholder: "2034" },
  { key: "pubgm", name: "PUBG Mobile", short: "PUBG", color: "#E9A100", idLabel: "Character ID", idPlaceholder: "5123456789" },
  { key: "freefire", name: "Free Fire", short: "FF", color: "#FF5A1F", idLabel: "Player ID", idPlaceholder: "1234567890" },
  { key: "hok", name: "Honor of Kings", short: "HOK", color: "#B0802E", idLabel: "UID", idPlaceholder: "1234567890" },
  { key: "wildrift", name: "LoL: Wild Rift", short: "WR", color: "#0AA6C8", idLabel: "Riot ID", idPlaceholder: "Name#TAG" },
  { key: "valorant", name: "Valorant", short: "VAL", color: "#FF4655", idLabel: "Riot ID", idPlaceholder: "Name#TAG" },
  { key: "genshin", name: "Genshin Impact", short: "GI", color: "#4A6FA5", idLabel: "UID", idPlaceholder: "812345678", serverLabel: "Server", serverPlaceholder: "Asia" },
  { key: "hsr", name: "Honkai: Star Rail", short: "HSR", color: "#6457D9", idLabel: "UID", idPlaceholder: "812345678", serverLabel: "Server", serverPlaceholder: "Asia" },
  { key: "roblox", name: "Roblox", short: "RBX", color: "#E2231A", idLabel: "Username", idPlaceholder: "username" },
  { key: "minecraft", name: "Minecraft", short: "MC", color: "#4E9A2F", idLabel: "Gamertag", idPlaceholder: "Gamertag" },
  { key: "dota2", name: "Dota 2", short: "D2", color: "#A3262A", idLabel: "Friend ID", idPlaceholder: "123456789" },
  { key: "coc", name: "Clash of Clans", short: "COC", color: "#D89A0B", idLabel: "Player tag", idPlaceholder: "#2PQ8LJ9Y" },
  { key: "steam", name: "Steam", short: "STM", color: "#1B2838", idLabel: "Friend code", idPlaceholder: "123456789" },
  { key: "other", name: "Other game", short: "GG", color: "#636366", idLabel: "ID", idPlaceholder: "Your ID" },
];

export const GAMES_MAX = 10;

export const gameOf = (key: string | null | undefined): GameInfo => GAMES.find((g) => g.key === key) ?? GAMES[GAMES.length - 1];

/** The name to show: the game's own name, or what the owner typed for "Other game". */
export const gameName = (g: Pick<GameId, "game" | "title">) => (g.game === "other" && g.title?.trim()) || gameOf(g.game).name;

/** What gets copied / shown as the ID, e.g. "123456789 (2034)" for MLBB. */
export function fullGameId(g: Pick<GameId, "uid" | "server">) {
  const server = g.server?.trim();
  return server ? `${g.uid.trim()} (${server})` : g.uid.trim();
}

/** Entries that can actually be shown (an ID is required). */
export function visibleGames(games: GameId[] | null | undefined): GameId[] {
  return (Array.isArray(games) ? games : []).filter((g) => g && typeof g === "object" && typeof g.uid === "string" && g.uid.trim()).slice(0, GAMES_MAX);
}

function text(v: unknown, max: number) {
  if (typeof v !== "string") return null;
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return s ? s.slice(0, max) : null;
}

/** Validate what the form sent. Entries without an ID are dropped; unknown games become "Other". */
export function cleanGames(items: unknown): GameId[] {
  if (!Array.isArray(items)) throw new Error("Your game IDs couldn't be read. Reload the page and try again.");
  if (items.length > GAMES_MAX) throw new Error(`You can list up to ${GAMES_MAX} games.`);
  const out: GameId[] = [];
  for (const raw of items as Record<string, unknown>[]) {
    const uid = text(raw?.uid, 40);
    if (!uid) continue;
    const info = gameOf(typeof raw.game === "string" ? raw.game : null);
    out.push({
      game: info.key,
      title: info.key === "other" ? text(raw.title, 40) : null,
      ign: text(raw.ign, 40),
      uid,
      server: info.serverLabel ? text(raw.server, 20) : null,
    });
  }
  return out;
}
