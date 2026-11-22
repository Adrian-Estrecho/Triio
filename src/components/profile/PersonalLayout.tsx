import { LogoMark } from "../Logo";
import { ShareButton } from "../ShareButton";
import { MorphHero } from "./MorphHero";
import { ScreenHeight } from "./ScreenHeight";
import { Chevron, Glyph, SocialIcons, external, hostOf, press, type GlyphName, type ProfileData } from "./shared";

export type Reveal = (r: number, className?: string, style?: React.CSSProperties) => { className: string; style?: React.CSSProperties };

/**
 * Personal brand: after the intro, a big photo in the middle of the screen that turns into
 * the profile card as you scroll. Then the details, which rise in as you scroll to them.
 */
export function PersonalLayout({
  d,
  rv,
  edit,
  bottomPad,
  intro = false,
}: {
  d: ProfileData;
  rv: Reveal;
  edit: React.ReactNode;
  bottomPad: string;
  /** The name intro is playing (its round photo flies into the hero). */
  intro?: boolean;
}) {
  const p = d.profile;
  const photo = d.cover ?? d.logo;
  const first = p.display_name.trim().split(/\s+/)[0];

  return (
    <div className="pp relative mx-auto w-full max-w-md overflow-x-clip" style={{ paddingBottom: bottomPad }}>
      <ScreenHeight />
      {/* The photo, blurred big behind the top of the page */}
      <div className="pp-ambient" aria-hidden="true">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" />
        ) : (
          <div className="pf-banner-mesh" />
        )}
      </div>

      {/* Big photo in the middle of the screen; scrolling turns it into the profile card. */}
      <div className="relative z-[1] px-4">
        <MorphHero
          {...rv(0)}
          d={d}
          photo={photo}
          intro={intro}
          edit={edit}
          socials={d.socials.length > 0 ? <SocialIcons socials={d.socials} className="pp-name-socials" /> : null}
          actions={
            <>
              <ShareButton title={p.display_name} className={`pp-glass pp-round ${press}`} />
              {edit}
            </>
          }
        />
      </div>

      <div className="pp-body">
        {d.review && (
          <a {...rv(1, `ios-card relative block px-5 pt-4 pb-5 ${press}`)} href={d.review} target="_blank" rel="noopener noreferrer">
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
        )}

        {p.description && (
          <section {...rv(1, "pp-section")}>
            <h2 className="pp-section-title">About</h2>
            <p className="ios-card px-4 py-3.5 text-[15px] leading-relaxed whitespace-pre-line" style={{ color: "color-mix(in srgb, var(--ios-label) 86%, transparent)" }}>
              {p.description}
            </p>
          </section>
        )}

        {d.contact.length > 0 && (
          <section {...rv(2, "pp-section")}>
            <h2 className="pp-section-title">Contact</h2>
            <div className="ios-card">
              {d.contact.map((c) => {
                const body = (
                  <>
                    <SoftTile glyph={c.glyph} />
                    <span className="ios-row-body">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] font-medium" style={{ color: "var(--ios-secondary)" }}>
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
            </div>
          </section>
        )}

        {d.links.length > 0 && (
          <section {...rv(3, "pp-section")}>
            <h2 className="pp-section-title">Links</h2>
            <div className="ios-card">
              {d.links.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="ios-row">
                  <SoftTile glyph="link" />
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
            </div>
          </section>
        )}

        <a href="/" className="mx-auto mt-7 flex w-fit items-center justify-center gap-1.5 text-[12px] font-medium" style={{ color: "var(--ios-tertiary)" }}>
          <LogoMark size={13} color={d.accent} /> Powered by Triio
        </a>
      </div>
    </div>
  );
}

/** A soft tile in the brand colour, for contact and link rows. */
function SoftTile({ glyph }: { glyph: GlyphName }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
      style={{ background: "color-mix(in srgb, var(--tint) 14%, transparent)", color: "var(--tint)" }}
    >
      <Glyph name={glyph} className="h-[18px] w-[18px]" />
    </span>
  );
}
