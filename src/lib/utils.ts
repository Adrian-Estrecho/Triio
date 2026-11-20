import { randomInt } from "crypto";

// No 0/O/1/I/L so codes are easy to read aloud and type.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateCardCode(length = 6) {
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function peso(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
}

export function num(value: FormDataEntryValue | null, fallback: number | null = null) {
  if (value === null || String(value).trim() === "") return fallback;
  const n = Number(String(value).replace(/[₱,\s]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

export function str(value: FormDataEntryValue | null) {
  const s = value === null ? "" : String(value).trim();
  return s === "" ? null : s;
}

/** Adds https:// when someone types "facebook.com/x". Returns null for empty input. */
export function normalizeUrl(value: FormDataEntryValue | null) {
  const s = str(value);
  if (!s) return null;
  if (/^(https?:|mailto:|tel:|sms:|viber:)/i.test(s)) return s;
  return "https://" + s;
}

export function isSafeHttpUrl(url: string | null | undefined) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** "Label | https://url" per line → [{label, url}] */
export function parseLinks(text: string | null) {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split("|");
      const url = normalizeUrl(rest.join("|").trim() || label.trim());
      return { label: rest.length ? label.trim() : url ?? "", url: url ?? "" };
    })
    .filter((l) => isSafeHttpUrl(l.url));
}

export function linksToText(links: { label: string; url: string }[] | null | undefined) {
  return (links ?? []).map((l) => `${l.label} | ${l.url}`).join("\n");
}

export function fmtDate(value: string | null | undefined) {
  if (!value) return "—";
  // Date-only values ("2026-11-19") are calendar days; timestamps are shown in Manila time.
  const dateOnly = value.length === 10;
  const d = new Date(dateOnly ? value + "T00:00:00Z" : value);
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: dateOnly ? "UTC" : "Asia/Manila",
  });
}

export function todayISO() {
  // Manila date, so "follow-ups due today" matches the owner's day.
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

/** Approximate NDEF bytes for a URL record (https:// is compressed to 1 byte). */
export function ndefBytes(url: string) {
  const body = url.replace(/^https:\/\/(www\.)?/, "");
  return body.length + 1 /* prefix */ + 4 /* record header */ + 2 /* TLV */;
}

export const NTAG213_BYTES = 137;

/** Admin search: true when every word of the search appears somewhere in the given fields (case-insensitive). */
export function matches(q: string | undefined, ...fields: (string | null | undefined)[]) {
  if (!q?.trim()) return true;
  const hay = fields.filter(Boolean).join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}
