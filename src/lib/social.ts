import { isSafeHttpUrl, normalizeUrl } from "./utils";

/**
 * Social accounts on a profile. Owners can type a username ("@maria", "maria.santos")
 * or paste a full link; both end up saved as a link. Shared by the settings form
 * (live preview) and the save action, so they always agree.
 */
export type SocialKey = "facebook" | "instagram" | "tiktok" | "youtube" | "linkedin";

export const SOCIALS: { key: SocialKey; label: string; prefix: string | null; placeholder: string }[] = [
  { key: "facebook", label: "Facebook", prefix: "facebook.com/", placeholder: "username or link" },
  { key: "instagram", label: "Instagram", prefix: "instagram.com/", placeholder: "username" },
  { key: "tiktok", label: "TikTok", prefix: "tiktok.com/@", placeholder: "username" },
  { key: "youtube", label: "YouTube", prefix: "youtube.com/@", placeholder: "@channel or link" },
  { key: "linkedin", label: "LinkedIn", prefix: "linkedin.com/in/", placeholder: "username or link" },
];

/** Columns added by supabase/socials.sql (missing on older databases). */
export const NEW_SOCIALS: SocialKey[] = ["youtube", "linkedin"];

const BASE: Record<SocialKey, string> = {
  facebook: "https://facebook.com/",
  instagram: "https://instagram.com/",
  tiktok: "https://www.tiktok.com/@",
  youtube: "https://www.youtube.com/@",
  linkedin: "https://www.linkedin.com/in/",
};

/** Matches the canonical links we build, so saved links show as a plain username again. */
const CANONICAL: Record<SocialKey, RegExp> = {
  facebook: /^https?:\/\/(?:www\.|m\.)?facebook\.com\/([A-Za-z0-9.]+)\/?$/i,
  instagram: /^https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._]+)\/?$/i,
  tiktok: /^https?:\/\/(?:www\.)?tiktok\.com\/@([A-Za-z0-9._]+)\/?$/i,
  youtube: /^https?:\/\/(?:www\.|m\.)?youtube\.com\/@([A-Za-z0-9._-]+)\/?$/i,
  linkedin: /^https?:\/\/(?:www\.)?linkedin\.com\/in\/([A-Za-z0-9-]+)\/?$/i,
};

/** What the owner typed → the link to save (null = empty). Invalid input returns the text as-is so validation can flag it. */
export function socialUrl(key: SocialKey, raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  const base = BASE[key];
  const looksLikeLink = /^[a-z]+:\/\//i.test(v) || /^[\w-]+(\.[\w-]+)+\//.test(v) || /\.(com|me|ph|net|org)\b/i.test(v);
  if (looksLikeLink) return normalizeUrl(v);
  const handle = v.replace(/^@+/, "");
  return /^[A-Za-z0-9._-]{1,100}$/.test(handle) ? base + handle : normalizeUrl(v);
}

/** A saved link → what to show in the input (the username when it's one of our canonical links). */
export function socialInput(key: SocialKey, url: string | null | undefined): string {
  if (!url) return "";
  const m = CANONICAL[key].exec(url);
  return m ? m[1] : url;
}

export function socialValid(key: SocialKey, raw: string | null | undefined) {
  const u = socialUrl(key, raw);
  return u === null || isSafeHttpUrl(u);
}
