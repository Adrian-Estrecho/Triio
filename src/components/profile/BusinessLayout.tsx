import { LogoMark } from "../Logo";
import { ShareButton } from "../ShareButton";
import { OfferingsGrid } from "./OfferingsGrid";
import { Chevron, Glyph, SocialBar, external, hostOf, press, type ProfileData } from "./shared";

/**
 * Business: an editorial hero with the brand name in serif caps, a white "sheet" card
 * overlapping it with the one big action, then the products & services grid.
 */
export function BusinessLayout({ d }: { d: ProfileData }) {
  const p = d.profile;
  const photo = d.cover ?? d.logo;
  const thumb = d.logo ?? d.cover;
  const city = d.place?.split(",").pop()?.trim() || null;
  const phone = d.contact.find((c) => c.key === "phone");
  const address = d.contact.find((c) => c.key === "address");
  const quick = d.contact.filter((c) => c.href);

  return (
    <div className="bz relative mx-auto w-full max-w-md overflow-x-clip pb-[calc(env(safe-area-inset-bottom)+40px)]">
      <section className="bz-hero">
        <div className="absolute inset-0" aria-hidden="true">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              <div className="pf-banner-mesh" />
              <div className="pf-grain" />
            </>
          )}
          <div className="bz-hero-scrim" />
        </div>
        <div className="pp-topbar justify-end">
          <ShareButton title={p.display_name} className={`pp-glass pp-round ${press}`} />
        </div>
        <div className="bz-hero-title">
          <h1 className="bz-brand">{p.display_name}</h1>
          {(city || p.tagline) && <p className="bz-kicker">{city ?? p.tagline}</p>}
        </div>
      </section>

      {/* The sheet: who they are, the essentials, one big button */}
      <div className="bz-sheet">
        <div className="flex gap-3.5">
          <span className="bz-thumb">
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt={`${p.display_name} logo`} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[34px] font-semibold" style={{ background: d.accent, color: d.onAccent, fontFamily: "var(--font-brand)" }}>
                {p.display_name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1 py-1">
            {city && <span className="bz-tag">{city}</span>}
            <p className="mt-1.5 text-[19px] leading-tight font-semibold" style={{ letterSpacing: "-0.02em" }}>
              {p.display_name}
            </p>
            {p.tagline && (
              <p className="mt-1 line-clamp-2 text-[13.5px] leading-snug" style={{ color: "var(--ios-secondary)" }}>
                {p.tagline}
              </p>
            )}
          </div>
        </div>

        {(address || phone) && (
          <div className="bz-facts">
            {address && (
              <a href={address.href ?? undefined} {...(address.href ? external(address.href) : {})} className="min-w-0">
                <span className="bz-fact-label">Visit us</span>
                <span className="bz-fact-value">{d.place}</span>
              </a>
            )}
            {phone && (
              <a href={phone.href} className="min-w-0">
                <span className="bz-fact-label">Call us</span>
                <span className="bz-fact-value">{phone.value}</span>
              </a>
            )}
          </div>
        )}

        <a href={d.vcardHref} className={`bz-primary mt-3 ${press}`}>
          <Glyph name="personAdd" className="h-[18px] w-[18px]" />
          Save Contact
        </a>

        {quick.length > 0 && (
          <nav className="bz-quick" style={{ gridTemplateColumns: `repeat(${quick.length}, minmax(0, 1fr))` }} aria-label="Quick actions">
            {quick.map((c) => (
              <a key={c.key} href={c.href} {...external(c.href!)} className={`bz-quick-item ${press}`}>
                <Glyph name={c.glyph} className="h-[18px] w-[18px]" />
                {c.action}
              </a>
            ))}
          </nav>
        )}
      </div>

      <SocialBar socials={d.socials} className="mx-3 mt-3" />

      {d.review && (
        <section className="mt-3 px-3">
          <a href={d.review} target="_blank" rel="noopener noreferrer" className={`pf-ticket ${press}`}>
            <span className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(90% 120% at 100% 0%, rgba(255,159,10,0.2), transparent 60%)" }} aria-hidden="true" />
            <span className="relative flex items-center justify-between gap-3">
              <span>
                <span className="block text-[20px] font-semibold" style={{ letterSpacing: "-0.02em" }}>
                  Enjoyed your visit?
                </span>
                <span className="mt-0.5 block text-[13px]" style={{ color: "var(--ios-secondary)" }}>
                  Leave a quick review on Google
                </span>
              </span>
              <Chevron />
            </span>
            <span className="relative mt-4 flex gap-1.5 text-[#FF9F0A]" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className="pf-star" style={{ "--i": i } as React.CSSProperties}>
                  <Glyph name="star" className="h-7 w-7" />
                </span>
              ))}
            </span>
          </a>
        </section>
      )}

      {d.offerings.length > 0 && <OfferingsGrid items={d.offerings} title={d.offeringsTitle} tint={d.tint} inquire={d.inquire} />}

      {p.description && (
        <section className="bz-card mx-3 mt-10 px-5 py-5">
          <h2 className="bz-card-title">About us</h2>
          <p className="mt-2 text-[15.5px] leading-relaxed whitespace-pre-line" style={{ color: "color-mix(in srgb, var(--ios-label) 85%, transparent)" }}>
            {p.description}
          </p>
        </section>
      )}

      {d.contact.length > 0 && (
        <section className="bz-card mx-3 mt-3 overflow-hidden">
          <h2 className="bz-card-title px-5 pt-5 pb-1">Details</h2>
          {d.contact.map((c) => {
            const body = (
              <>
                <span className="bz-row-icon">
                  <Glyph name={c.glyph} className="h-[17px] w-[17px]" />
                </span>
                <span className="ios-row-body">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px]" style={{ color: "var(--ios-secondary)" }}>
                      {c.label}
                    </span>
                    <span className={`mt-0.5 block text-[16px] leading-snug ${c.key === "address" ? "whitespace-pre-line" : "truncate"}`}>{c.value}</span>
                  </span>
                  {c.href && <Chevron />}
                </span>
              </>
            );
            return c.href ? (
              <a key={c.key} href={c.href} {...external(c.href)} className="ios-row">
                {body}
              </a>
            ) : (
              <div key={c.key} className="ios-row">
                {body}
              </div>
            );
          })}
        </section>
      )}

      {d.links.length > 0 && (
        <section className="bz-card mx-3 mt-3 overflow-hidden">
          <h2 className="bz-card-title px-5 pt-5 pb-1">Links</h2>
          {d.links.map((l, i) => (
            <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="ios-row">
              <span className="bz-row-icon">
                <Glyph name="link" className="h-[17px] w-[17px]" />
              </span>
              <span className="ios-row-body">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-medium">{l.label}</span>
                  <span className="mt-0.5 block truncate text-[13px]" style={{ color: "var(--ios-secondary)" }}>
                    {hostOf(l.url)}
                  </span>
                </span>
                <Chevron />
              </span>
            </a>
          ))}
        </section>
      )}

      <a href="/" className="mx-auto mt-10 flex w-fit items-center gap-1.5 text-[12px] font-medium" style={{ color: "var(--ios-tertiary)" }}>
        <LogoMark size={13} color={d.accent} /> Powered by Triio
      </a>
    </div>
  );
}
