import type { GameId, Offering, ProfileLink, PublicProfile } from "@/lib/types";
import { onColor, readableTint, safeColor } from "@/lib/color";
import { isImageSrc, isSafeHttpUrl } from "@/lib/utils";
import { visibleGames } from "@/lib/games";
import { OFFERINGS_TITLE, visibleOfferings } from "@/lib/offerings";

/* SF Symbols–like glyphs (24px grid). `fill` glyphs are solid, the rest are stroked. */
export const glyphs = {
  phone: { d: "M6.6 3h2.2c.4 0 .8.3.9.7l1 3.6c.1.4 0 .8-.3 1l-1.7 1.5a13 13 0 0 0 5.5 5.5l1.5-1.7c.3-.3.7-.4 1-.3l3.6 1c.4.1.7.5.7.9v2.2c0 1.4-1.2 2.6-2.6 2.6C10.3 20 4 13.7 4 5.6 4 4.2 5.2 3 6.6 3Z", fill: true },
  mail: { d: "M4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-11A1.5 1.5 0 0 1 4.5 5Zm-.8 1.3L12 12.5l8.3-6.2", fill: false },
  map: { d: "M12 2.5a7 7 0 0 0-7 7c0 5.2 7 12 7 12s7-6.8 7-12a7 7 0 0 0-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z", fill: true },
  globe: { d: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-9-9h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z", fill: false },
  star: { d: "m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9L12 2.8Z", fill: true },
  link: { d: "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 1 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 1 0 5.66 5.66l1-1", fill: false },
  person: { d: "M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm-8 9c0-4 3.6-7 8-7s8 3 8 7H4Z", fill: true },
  personAdd: { d: "M10 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8.5c0-3.6 3.1-6.5 7-6.5 1.3 0 2.5.3 3.5.9M18.5 14v6M15.5 17h6", fill: false },
  chat: { d: "M12 3.5c-4.97 0-9 3.5-9 7.8 0 2.4 1.25 4.5 3.2 6L5.5 21l4-2c.8.2 1.65.3 2.5.3 4.97 0 9-3.5 9-7.8s-4.03-8-9-8Z", fill: true },
  camera: { d: "M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5Zm4 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm5.2-1.8v.01", fill: false },
  note: { d: "M13 3v11.5a3.5 3.5 0 1 1-3.5-3.5M13 3c.7 2.7 2.8 4.6 5.5 4.8", fill: false },
  f: { d: "M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.3H7.8v3h2.6V21h3.1Z", fill: true },
  play: { d: "M8 5.5v13l11-6.5-11-6.5Z", fill: true },
  in: { d: "M5 9h3v10H5V9Zm1.5-5a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5ZM10.5 9h2.9v1.4c.5-.9 1.7-1.7 3.4-1.7 3 0 3.7 1.9 3.7 4.5V19h-3v-5.2c0-1.3-.3-2.4-1.7-2.4s-2.3 1-2.3 2.5V19h-3V9Z", fill: true },
  dots: { d: "M6 12h.01M12 12h.01M18 12h.01", fill: false },
  plus: { d: "M12 5v14M5 12h14", fill: false },
  arrow: { d: "M7 17 17 7M8.5 7H17v8.5", fill: false },
  pad: { d: "M7 4h10a1 1 0 0 1 1 1v15H6V5a1 1 0 0 1 1-1Zm2 5h6M9 13h6M9 17h3", fill: false },
} as const;

export type GlyphName = keyof typeof glyphs;

export function Glyph({ name, className = "h-5 w-5", strokeWidth = 2 }: { name: GlyphName; className?: string; strokeWidth?: number }) {
  const g = glyphs[name];
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={g.fill ? "currentColor" : "none"}
      stroke={g.fill ? "none" : "currentColor"}
      strokeWidth={name === "dots" ? 3.2 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={g.d} />
    </svg>
  );
}

export function Chevron({ color = "var(--ios-tertiary)" }: { color?: string }) {
  return (
    <svg viewBox="0 0 8 14" className="h-3 w-[7px] shrink-0" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m1 1 6 6-6 6" />
    </svg>
  );
}

export const socialStyle: Record<string, { glyph: GlyphName; bg: string }> = {
  Facebook: { glyph: "f", bg: "#1877F2" },
  Instagram: { glyph: "camera", bg: "linear-gradient(45deg, #F9A23C 0%, #E1306C 50%, #8A3AB9 100%)" },
  TikTok: { glyph: "note", bg: "#111111" },
  YouTube: { glyph: "play", bg: "#FF0000" },
  LinkedIn: { glyph: "in", bg: "#0A66C2" },
};

export const press = "transition-[transform,background-color] duration-100 ease-out active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100";

export function telHref(phone: string) {
  return "tel:" + phone.replace(/[^\d+]/g, "");
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export const external = (href: string) => (href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {});

export type ContactItem = { key: "phone" | "email" | "website" | "address"; label: string; action: string; glyph: GlyphName; href?: string; value: string };

/** Everything both profile layouts need, worked out once. */
export type ProfileData = {
  profile: PublicProfile;
  personal: boolean;
  accent: string;
  onAccent: string;
  dark: boolean;
  /** The brand color, adjusted to be readable as text on this theme. */
  tint: string;
  cover: string | null;
  logo: string | null;
  review: string | null;
  /** First line of the address, e.g. "J.P. Rizal St, Marikina City". */
  place: string | null;
  socials: { label: string; url: string }[];
  contact: ContactItem[];
  links: ProfileLink[];
  games: GameId[];
  offerings: Offering[];
  offeringsTitle: string;
  vcardHref: string;
  /** A way to ask about a product: Messenger, WhatsApp, Viber, then a call. */
  inquire: { label: string; href: string } | null;
};

export function profileData(profile: PublicProfile, vcardHref: string): ProfileData {
  const accent = safeColor(profile.accent_color);
  const dark = profile.theme !== "light";
  const maps = isSafeHttpUrl(profile.maps_url) ? profile.maps_url : null;
  const website = isSafeHttpUrl(profile.website) ? profile.website : null;

  const socials = [
    { label: "Facebook", url: profile.facebook },
    { label: "Instagram", url: profile.instagram },
    { label: "TikTok", url: profile.tiktok },
    { label: "YouTube", url: profile.youtube },
    { label: "LinkedIn", url: profile.linkedin },
  ].filter((s) => isSafeHttpUrl(s.url)) as { label: string; url: string }[];

  const contact = [
    profile.phone && { key: "phone", label: "Phone", action: "Call", glyph: "phone", href: telHref(profile.phone), value: profile.phone },
    profile.email && { key: "email", label: "Email", action: "Email", glyph: "mail", href: `mailto:${profile.email}`, value: profile.email },
    website && { key: "website", label: "Website", action: "Website", glyph: "globe", href: website, value: hostOf(website) },
    profile.address && { key: "address", label: "Address", action: "Directions", glyph: "map", href: maps ?? undefined, value: profile.address },
  ].filter(Boolean) as ContactItem[];

  // Chat apps aren't in the social bar; business pages still use them for "Ask about this".
  const chat = [
    { label: "Messenger", url: profile.messenger },
    { label: "WhatsApp", url: profile.whatsapp },
    { label: "Viber", url: profile.viber },
  ].find((c) => isSafeHttpUrl(c.url)) as { label: string; url: string } | undefined;

  return {
    profile,
    personal: profile.kind === "personal",
    accent,
    onAccent: onColor(accent),
    dark,
    tint: readableTint(accent, dark),
    cover: isImageSrc(profile.cover_url) ? profile.cover_url : null,
    logo: isImageSrc(profile.logo_url) ? profile.logo_url : null,
    review: isSafeHttpUrl(profile.review_url) ? profile.review_url : null,
    place: profile.address?.split("\n")[0]?.trim() || null,
    socials,
    contact,
    links: (profile.links ?? []).filter((l) => isSafeHttpUrl(l.url)),
    games: visibleGames(profile.games),
    offerings: visibleOfferings(profile.offerings),
    offeringsTitle: profile.offerings_title?.trim() || OFFERINGS_TITLE,
    vcardHref,
    inquire: chat ? { label: `Ask on ${chat.label}`, href: chat.url } : profile.phone ? { label: "Call to ask", href: telHref(profile.phone) } : null,
  };
}

/** Socials in one line: equal slots in a single pill, one brand dot per slot. */
/** Just the brand dots in a row, no bar behind them (sits next to the name on the personal photo). */
export function SocialIcons({ socials, className = "" }: { socials: { label: string; url: string }[]; className?: string }) {
  if (!socials.length) return null;
  return (
    <nav className={`pf-social-icons ${className}`} aria-label="Social profiles">
      {socials.map((s) => (
        <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label} className="pf-socials-dot" style={{ background: socialStyle[s.label].bg }}>
          <Glyph name={socialStyle[s.label].glyph} className="h-4 w-4" />
        </a>
      ))}
    </nav>
  );
}

export function SocialBar({ socials, className = "" }: { socials: { label: string; url: string }[]; className?: string }) {
  if (!socials.length) return null;
  return (
    <nav className={`pf-socials ${className}`} aria-label="Social profiles">
      {socials.map((s) => (
        <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label} className="pf-socials-item">
          <span className="pf-socials-dot" style={{ background: socialStyle[s.label].bg }}>
            <Glyph name={socialStyle[s.label].glyph} className="h-[17px] w-[17px]" />
          </span>
        </a>
      ))}
    </nav>
  );
}
