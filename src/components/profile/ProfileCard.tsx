import { ShareButton } from "../ShareButton";
import { Glyph, SocialIcons, external, press, type ProfileData } from "./shared";

/**
 * The personal header, straight on the page (no card behind it): the cover as a rounded
 * banner, the round photo overlapping it with the socials beside it, the name, headline and
 * place, the quick actions as one segmented bar, then Save Contact with Share beside it.
 */
export function ProfileCard({
  d,
  edit,
  className = "",
  style,
}: {
  d: ProfileData;
  /** The owner menu button, for the banner's top-right corner. */
  edit?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const p = d.profile;
  const quick = d.contact.filter((c) => c.href).slice(0, 4);

  return (
    <section className={`relative ${className}`} style={style}>
      {/* Banner. Keep it the first child: MorphHero lands its big photo on it. */}
      <div className="relative h-[184px] overflow-hidden rounded-[23px]">
        {d.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.cover} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "50% 30%" }} />
        ) : (
          <div className="pf-banner-mesh" aria-hidden="true" />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3" style={{ background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.28))" }} aria-hidden="true" />
        {edit && <div className="absolute top-2.5 right-2.5">{edit}</div>}
      </div>

      {/* Photo, with the socials beside it. Keep the pc-avatar class: MorphHero lands its round photo on it. */}
      <div className="-mt-[54px] flex items-end justify-between gap-3 px-1">
        <span
          className="pc-avatar relative flex h-[108px] w-[108px] shrink-0 items-center justify-center overflow-hidden rounded-full text-[42px] font-bold"
          style={{
            background: d.logo ? "var(--pf-bg)" : `linear-gradient(150deg, color-mix(in srgb, ${d.accent} 80%, #fff), ${d.accent} 45%, color-mix(in srgb, ${d.accent} 65%, #000))`,
            color: d.onAccent,
          }}
        >
          {d.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.logo} alt={p.display_name} className="h-full w-full object-cover" />
          ) : (
            p.display_name.slice(0, 1).toUpperCase()
          )}
        </span>
        <div className="flex min-w-0 justify-end pb-1.5">
          <SocialIcons socials={d.socials} className="flex-wrap justify-end" />
        </div>
      </div>

      {/* Name */}
      <div className="px-1">
        <h1 className="font-display mt-5 text-[32px] leading-[1.02] font-bold text-balance" style={{ fontStretch: "112%", letterSpacing: "-0.035em" }}>
          {p.display_name}
        </h1>
        {p.tagline && (
          <p className="mt-2 text-[16px] leading-snug" style={{ color: "var(--ios-secondary)" }}>
            {p.tagline}
          </p>
        )}
        {d.place && (
          <p className="mt-3 flex items-center gap-1.5 text-[13px] font-medium" style={{ color: "var(--ios-secondary)" }}>
            <span style={{ color: d.tint }}>
              <Glyph name="map" className="h-3.5 w-3.5" />
            </span>
            <span className="truncate">{d.place}</span>
          </p>
        )}
      </div>

      {/* Quick actions: one segmented bar */}
      {quick.length > 0 && (
        <nav className="pf-seg ios-card mt-6 grid" style={{ gridTemplateColumns: `repeat(${quick.length}, minmax(0, 1fr))` }} aria-label="Quick actions">
          {quick.map((c) => (
            <a key={c.key} href={c.href} {...external(c.href!)} className="flex h-[72px] flex-col items-center justify-center gap-1.5 transition-colors duration-100">
              <span style={{ color: d.tint }}>
                <Glyph name={c.glyph} className="h-[21px] w-[21px]" />
              </span>
              <span className="text-[12px] font-medium">{c.action}</span>
            </a>
          ))}
        </nav>
      )}

      {/* Primary action + share */}
      <div className="mt-3 flex gap-2">
        <a
          href={d.vcardHref}
          className={`flex h-[54px] flex-1 items-center justify-center gap-2 rounded-[16px] text-[16px] font-semibold ${press}`}
          style={{
            background: d.accent,
            color: d.onAccent,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), 0 10px 28px -12px color-mix(in srgb, ${d.accent} 80%, transparent)`,
          }}
        >
          <Glyph name="person" className="h-[18px] w-[18px]" />
          Save Contact
        </a>
        <ShareButton
          title={p.display_name}
          className={`ios-card flex h-[54px] w-[54px] shrink-0 cursor-pointer items-center justify-center ${press}`}
          style={{ color: "var(--ios-label)" }}
        />
      </div>
    </section>
  );
}
