import type { PublicProfile } from "@/lib/types";
import { archivo, profileFont } from "@/app/fonts";
import { ShareButton } from "./ShareButton";
import { onColor, readableTint, safeColor } from "@/lib/color";
import { isSafeHttpUrl } from "@/lib/utils";
import { LogoMark } from "./Logo";
import { NameIntro } from "./personal/NameIntro";
import { OwnerEditSheet } from "./personal/OwnerEditSheet";
import { introTimeline } from "./personal/introTimeline";

/* SF Symbols–like glyphs (24px grid). `fill` glyphs are solid, the rest are stroked. */
const glyphs = {
  phone: { d: "M6.6 3h2.2c.4 0 .8.3.9.7l1 3.6c.1.4 0 .8-.3 1l-1.7 1.5a13 13 0 0 0 5.5 5.5l1.5-1.7c.3-.3.7-.4 1-.3l3.6 1c.4.1.7.5.7.9v2.2c0 1.4-1.2 2.6-2.6 2.6C10.3 20 4 13.7 4 5.6 4 4.2 5.2 3 6.6 3Z", fill: true },
  mail: { d: "M4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-11A1.5 1.5 0 0 1 4.5 5Zm-.8 1.3L12 12.5l8.3-6.2", fill: false },
  map: { d: "M12 2.5a7 7 0 0 0-7 7c0 5.2 7 12 7 12s7-6.8 7-12a7 7 0 0 0-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z", fill: true },
  globe: { d: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-9-9h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z", fill: false },
  star: { d: "m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9L12 2.8Z", fill: true },
  link: { d: "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 1 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 1 0 5.66 5.66l1-1", fill: false },
  person: { d: "M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm-8 9c0-4 3.6-7 8-7s8 3 8 7H4Z", fill: true },
  chat: { d: "M12 3.5c-4.97 0-9 3.5-9 7.8 0 2.4 1.25 4.5 3.2 6L5.5 21l4-2c.8.2 1.65.3 2.5.3 4.97 0 9-3.5 9-7.8s-4.03-8-9-8Z", fill: true },
  camera: { d: "M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5Zm4 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm5.2-1.8v.01", fill: false },
  note: { d: "M13 3v11.5a3.5 3.5 0 1 1-3.5-3.5M13 3c.7 2.7 2.8 4.6 5.5 4.8", fill: false },
  f: { d: "M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.3H7.8v3h2.6V21h3.1Z", fill: true },
} as const;

type GlyphName = keyof typeof glyphs;

function Glyph({ name, className = "h-5 w-5" }: { name: GlyphName; className?: string }) {
  const g = glyphs[name];
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={g.fill ? "currentColor" : "none"}
      stroke={g.fill ? "none" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={g.d} />
    </svg>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 8 14" className="h-3 w-[7px] shrink-0" fill="none" stroke="var(--ios-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m1 1 6 6-6 6" />
    </svg>
  );
}

/** Soft tile in the brand color, for contact rows and links. */
function SoftTile({ glyph, tint }: { glyph: GlyphName; tint: string }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
      style={{ background: `color-mix(in srgb, ${tint} 14%, transparent)`, color: tint }}
    >
      <Glyph name={glyph} className="h-[18px] w-[18px]" />
    </span>
  );
}

function telHref(phone: string) {
  return "tel:" + phone.replace(/[^\d+]/g, "");
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const press = "transition-[transform,background-color] duration-100 ease-out active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100";

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="mt-7 px-4">
      {title && (
        <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase" style={{ color: "var(--ios-secondary)", letterSpacing: "0.08em" }}>
          {title}
        </h2>
      )}
      <div className="ios-card">{children}</div>
    </section>
  );
}

function Row({
  href,
  icon,
  children,
  chevron = true,
  label,
}: {
  href?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  chevron?: boolean;
  label?: string;
}) {
  const body = (
    <>
      {icon}
      <span className="ios-row-body">
        <span className="min-w-0 flex-1">{children}</span>
        {href && chevron && <Chevron />}
      </span>
    </>
  );
  if (!href) return <div className="ios-row">{body}</div>;
  const external = href.startsWith("http");
  return (
    <a href={href} className="ios-row" aria-label={label} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
      {body}
    </a>
  );
}

const socialStyle: Record<string, { glyph: GlyphName; bg: string }> = {
  Facebook: { glyph: "f", bg: "#1877F2" },
  Instagram: { glyph: "camera", bg: "linear-gradient(45deg, #F9A23C 0%, #E1306C 50%, #8A3AB9 100%)" },
  TikTok: { glyph: "note", bg: "#111111" },
  Messenger: { glyph: "chat", bg: "linear-gradient(45deg, #0A7CFF 0%, #A033FF 70%, #FF5280 100%)" },
  WhatsApp: { glyph: "chat", bg: "#25D366" },
  Viber: { glyph: "chat", bg: "#7360F2" },
};

/** Who is looking at a personal profile (only used for personal cards). */
export type Viewer = { loggedIn: boolean; isOwner: boolean };

export function ProfileView({
  profile,
  vcardHref,
  viewer = { loggedIn: false, isOwner: false },
  intro = true,
}: {
  profile: PublicProfile;
  vcardHref: string;
  viewer?: Viewer;
  /** Set false to skip the name intro (e.g. right after the owner saves). */
  intro?: boolean;
}) {
  const personal = profile.kind === "personal";
  const accent = safeColor(profile.accent_color);
  const onAccent = onColor(accent);
  const dark = profile.theme !== "light";
  const tint = readableTint(accent, dark);
  const cover = profile.cover_url && isSafeHttpUrl(profile.cover_url) ? profile.cover_url : null;
  const logo = profile.logo_url && isSafeHttpUrl(profile.logo_url) ? profile.logo_url : null;
  const maps = profile.maps_url && isSafeHttpUrl(profile.maps_url) ? profile.maps_url : null;
  const website = profile.website && isSafeHttpUrl(profile.website) ? profile.website : null;
  const review = profile.review_url && isSafeHttpUrl(profile.review_url) ? profile.review_url : null;

  const quick = [
    profile.phone && { label: "Call", href: telHref(profile.phone), glyph: "phone" as const },
    profile.email && { label: "Email", href: `mailto:${profile.email}`, glyph: "mail" as const },
    maps && { label: "Directions", href: maps, glyph: "map" as const },
    website && { label: "Website", href: website, glyph: "globe" as const },
  ].filter(Boolean) as { label: string; href: string; glyph: GlyphName }[];

  const socials = [
    { label: "Facebook", url: profile.facebook },
    { label: "Instagram", url: profile.instagram },
    { label: "TikTok", url: profile.tiktok },
    { label: "Messenger", url: profile.messenger },
    { label: "WhatsApp", url: profile.whatsapp },
    { label: "Viber", url: profile.viber },
  ].filter((s) => isSafeHttpUrl(s.url)) as { label: string; url: string }[];

  const links = (profile.links ?? []).filter((l) => isSafeHttpUrl(l.url));
  const hasInfo = profile.phone || profile.email || website || profile.address;

  const showIntro = personal && intro && profile.intro_enabled !== false;
  const { reveal } = introTimeline(profile.display_name);
  // Personal profiles rise in as the intro leaves (or straight away without an intro).
  const rv = (r: number) => (personal ? { className: "reveal", style: { "--r": r } as React.CSSProperties } : {});
  const rvClass = (r: number, base = "") => ({ ...rv(r), className: [base, rv(r).className].filter(Boolean).join(" ") });

  const avatar = (
    <div
      className="flex h-[92px] w-[92px] items-center justify-center overflow-hidden rounded-[26px]"
      style={{
        background: logo ? "#fff" : `linear-gradient(150deg, color-mix(in srgb, ${accent} 80%, #fff) 0%, ${accent} 45%, color-mix(in srgb, ${accent} 65%, #000) 100%)`,
        boxShadow: `0 0 0 4px var(--ios-bg), 0 14px 30px -10px rgba(0,0,0,${dark ? 0.7 : 0.3})`,
      }}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt={personal ? profile.display_name : `${profile.display_name} logo`} className="h-full w-full object-cover" />
      ) : (
        <span className="font-display text-[40px] font-bold" style={{ color: onAccent, fontStretch: "112%", letterSpacing: "-0.04em" }}>
          {profile.display_name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );

  // The first line of the address, shown under the name (e.g. "J.P. Rizal St, Marikina City").
  const place = profile.address?.split("\n")[0]?.trim();

  return (
    <main
      className={`ios ${profileFont.variable} ${archivo.variable} ${dark ? "ios-dark" : "ios-light"} min-h-dvh`}
      style={{ background: "var(--ios-bg)", color: "var(--ios-label)", ...(showIntro ? { "--reveal-delay": `${reveal}ms` } : {}) } as React.CSSProperties}
      data-reveal-root=""
    >
      {showIntro && (
        <NameIntro
          name={profile.display_name}
          greeting={profile.intro_greeting?.trim() || "Hi, I’m"}
          tagline={profile.tagline}
          photo={logo}
          accent={accent}
          onAccent={onAccent}
        />
      )}
      <div className="relative mx-auto w-full max-w-md overflow-hidden pb-[calc(env(safe-area-inset-bottom)+40px)]">
        {/* Banner: the cover photo, or one generated from the brand color */}
        <div className="relative px-3 pt-3">
          <div {...rvClass(0, "pf-banner h-[184px]")} style={{ "--accent": accent, ...rv(0).style } as React.CSSProperties} aria-hidden="true">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <>
                <div className="pf-banner-mesh" />
                <div className="pf-rings">
                  {[0.22, 0.4, 0.58, 0.76, 0.94].map((s) => (
                    <span key={s} className="pf-ring" style={{ "--s": s } as React.CSSProperties} />
                  ))}
                  <span className="pf-ring pf-ring-pulse" />
                </div>
                <div className="pf-grain" />
              </>
            )}
            <div className="absolute inset-x-0 bottom-0 h-2/3" style={{ background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.28))" }} />
          </div>
        </div>

        {/* Identity: logo overlapping the banner, socials beside it, then the name */}
        <header className="relative px-5">
          <div className="-mt-12 flex items-end justify-between gap-3 pl-1">
            <div {...rv(1)}>
              {personal ? (
                <OwnerEditSheet isOwner={viewer.isOwner} loggedIn={viewer.loggedIn} name={profile.display_name} accent={tint}>
                  {avatar}
                </OwnerEditSheet>
              ) : (
                avatar
              )}
            </div>
            {socials.length > 0 && (
              <nav {...rvClass(1, "flex flex-wrap justify-end gap-2")} aria-label="Social profiles">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-white ${press}`}
                    style={{ background: socialStyle[s.label].bg, boxShadow: "0 0 0 1px var(--ios-hairline)" }}
                  >
                    <Glyph name={socialStyle[s.label].glyph} className="h-[18px] w-[18px]" />
                  </a>
                ))}
              </nav>
            )}
          </div>

          <h1
            {...rvClass(2, "font-display mt-5 text-[32px] leading-[1.02] font-bold text-balance")}
            style={{ fontStretch: "112%", letterSpacing: "-0.035em", ...rv(2).style }}
          >
            {profile.display_name}
          </h1>
          {profile.tagline && (
            <p {...rvClass(2, "mt-2 text-[16px] leading-snug")} style={{ color: "var(--ios-secondary)", ...rv(2).style }}>
              {profile.tagline}
            </p>
          )}
          {place && (
            <p {...rvClass(3, "mt-3 flex items-center gap-1.5 text-[13px] font-medium")} style={{ color: "var(--ios-secondary)", ...rv(3).style }}>
              <span style={{ color: tint }}>
                <Glyph name="map" className="h-3.5 w-3.5" />
              </span>
              <span className="truncate">{place}</span>
            </p>
          )}
        </header>

        {/* Quick actions: one segmented bar */}
        {quick.length > 0 && (
          <nav
            {...rvClass(3, "pf-seg ios-card relative mx-4 mt-6 grid")}
            style={{ gridTemplateColumns: `repeat(${quick.length}, minmax(0, 1fr))`, ...rv(3).style }}
            aria-label="Quick actions"
          >
            {quick.map((q) => (
              <a
                key={q.label}
                href={q.href}
                target={q.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="flex h-[72px] flex-col items-center justify-center gap-1.5 transition-colors duration-100"
              >
                <span style={{ color: tint }}>
                  <Glyph name={q.glyph} className="h-[21px] w-[21px]" />
                </span>
                <span className="text-[12px] font-medium" style={{ color: "var(--ios-label)" }}>
                  {q.label}
                </span>
              </a>
            ))}
          </nav>
        )}

        {/* Primary action + share */}
        <div {...rvClass(4, "relative mt-3 flex gap-2 px-4")}>
          <a
            href={vcardHref}
            className={`flex h-[54px] flex-1 items-center justify-center gap-2 rounded-[16px] text-[16px] font-semibold ${press}`}
            style={{
              background: accent,
              color: onAccent,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), 0 10px 28px -12px color-mix(in srgb, ${accent} 80%, transparent)`,
            }}
          >
            <Glyph name="person" className="h-[18px] w-[18px]" />
            Save Contact
          </a>
          <ShareButton
            title={profile.display_name}
            className={`ios-card flex h-[54px] w-[54px] shrink-0 cursor-pointer items-center justify-center ${press}`}
            style={{ color: "var(--ios-label)" }}
          />
        </div>

        <div {...rv(5)}>
          {review && (
            <section className="mt-6 px-4">
              <a href={review} target="_blank" rel="noopener noreferrer" className={`ios-card relative block px-5 pt-4 pb-5 ${press}`}>
                <span
                  className="pointer-events-none absolute inset-0"
                  style={{ background: "radial-gradient(90% 120% at 100% 0%, rgba(255,159,10,0.18), transparent 60%)" }}
                  aria-hidden="true"
                />
                <span className="relative flex items-center justify-between gap-3">
                  <span>
                    <span className="block text-[17px] font-semibold" style={{ letterSpacing: "-0.02em" }}>
                      How did we do?
                    </span>
                    <span className="mt-0.5 block text-[13px]" style={{ color: "var(--ios-secondary)" }}>
                      Leave a quick review on Google
                    </span>
                  </span>
                  <Chevron />
                </span>
                <span className="relative mt-3.5 flex gap-1.5 text-[#FF9F0A]" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span key={i} className="pf-star" style={{ "--i": i } as React.CSSProperties}>
                      <Glyph name="star" className="h-7 w-7" />
                    </span>
                  ))}
                </span>
              </a>
            </section>
          )}

          {profile.description && (
            <Section title="About">
              <p className="px-4 py-3.5 text-[15px] leading-relaxed whitespace-pre-line" style={{ color: "color-mix(in srgb, var(--ios-label) 86%, transparent)" }}>
                {profile.description}
              </p>
            </Section>
          )}

          {hasInfo && (
            <Section title="Contact">
              {profile.phone && (
                <Row href={telHref(profile.phone)} icon={<SoftTile glyph="phone" tint={tint} />}>
                  <Field label="Phone" value={profile.phone} />
                </Row>
              )}
              {profile.email && (
                <Row href={`mailto:${profile.email}`} icon={<SoftTile glyph="mail" tint={tint} />}>
                  <Field label="Email" value={profile.email} />
                </Row>
              )}
              {website && (
                <Row href={website} icon={<SoftTile glyph="globe" tint={tint} />}>
                  <Field label="Website" value={hostOf(website)} />
                </Row>
              )}
              {profile.address && (
                <Row href={maps ?? undefined} icon={<SoftTile glyph="map" tint={tint} />}>
                  <Field label="Address" value={profile.address} multiline />
                </Row>
              )}
            </Section>
          )}

          {links.length > 0 && (
            <Section title="Links">
              {links.map((l, i) => (
                <Row key={i} href={l.url} icon={<SoftTile glyph="link" tint={tint} />}>
                  <span className="block truncate text-[16px] font-medium">{l.label}</span>
                  <span className="mt-0.5 block truncate text-[13px]" style={{ color: "var(--ios-secondary)" }}>
                    {hostOf(l.url)}
                  </span>
                </Row>
              ))}
            </Section>
          )}

          <a href="/" className="relative mx-auto mt-10 flex w-fit items-center justify-center gap-1.5 text-[12px] font-medium" style={{ color: "var(--ios-tertiary)" }}>
            <LogoMark size={13} color={accent} /> Powered by Triio
          </a>
        </div>
      </div>
    </main>
  );
}

/** Contact field: small muted label above the value. */
function Field({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <>
      <span className="block text-[12px] font-medium" style={{ color: "var(--ios-secondary)" }}>
        {label}
      </span>
      <span className={`mt-0.5 block text-[16px] leading-snug ${multiline ? "whitespace-pre-line" : "truncate"}`} style={{ color: "var(--ios-label)" }}>
        {value}
      </span>
    </>
  );
}
