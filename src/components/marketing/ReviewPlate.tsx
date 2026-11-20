import { STANDARD_HEADLINE } from "@/lib/shop";

const STAR = "m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9L12 2.8Z";

export function GoogleG({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  );
}

/** Contactless waves + a card in hand, inside an oval: the tap mark on the plate. */
function TapMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 56" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="60" cy="28" rx="57" ry="25" strokeWidth="2.6" />
      <g strokeWidth="3.4">
        <path d="M34 22a8 8 0 0 1 0 12" />
        <path d="M41 17a15 15 0 0 1 0 22" />
        <path d="M48 12a22 22 0 0 1 0 32" />
      </g>
      {/* card */}
      <rect x="66" y="13" width="26" height="18" rx="3" strokeWidth="2.4" transform="rotate(-14 79 22)" />
      {/* hand holding it */}
      <path d="M70 46c3-6 6-9 10-11l8-4c2.5-1.2 4.6 1.6 2.6 3.6l-5 4.4h9c3 0 5 2 5 4.4 0 0 .6 6.6-6.6 6.6H78" strokeWidth="2.4" />
    </svg>
  );
}

export type PlateDesign = {
  /** Band color (hex). */
  color?: string;
  headline?: string | null;
  /** Shown as a logo badge in the band when set. */
  business?: string | null;
  initials?: string | null;
};

/**
 * The Triio review plate, drawn in CSS: square, with a colored band, stars, a headline,
 * the Google mark and the tap mark. Every size inside is relative to the plate's own width,
 * so it works from a 48px thumbnail to the hero.
 */
export function ReviewPlate({ color = "#1d4fc4", headline, business, initials, className = "" }: PlateDesign & { className?: string }) {
  const text = (headline?.trim() || STANDARD_HEADLINE).slice(0, 80);
  const long = text.length > 44;
  return (
    <div
      className={`review-plate ${className}`}
      style={{ "--band": color } as React.CSSProperties}
      role="img"
      aria-label={`Triio review card${business ? ` for ${business}` : ""}: "${text}" Tap to rate your experience.`}
    >
      {/* Colored band */}
      <div className="absolute inset-x-0 top-0 flex h-[52%] flex-col items-center px-[7cqw] pt-[5.5cqw] text-center text-white" style={{ background: "var(--band)" }}>
        {business ? (
          <span className="mb-[2.2cqw] inline-flex max-w-full items-center gap-[1.6cqw] rounded-full bg-white/15 py-[0.9cqw] pr-[3cqw] pl-[1cqw] text-[3.4cqw] font-semibold">
            <span className="grid h-[5.2cqw] w-[5.2cqw] shrink-0 place-items-center rounded-full bg-white text-[2.4cqw] font-bold" style={{ color: "var(--band)" }}>
              {initials || business.slice(0, 1).toUpperCase()}
            </span>
            <span className="truncate">{business}</span>
          </span>
        ) : null}
        <span className="flex gap-[1.2cqw] text-gold">
          {[0, 1, 2, 3, 4].map((i) => (
            <svg key={i} viewBox="0 0 24 24" className="h-[5.4cqw] w-[5.4cqw]" fill="currentColor" aria-hidden="true"><path d={STAR} /></svg>
          ))}
        </span>
        <span
          className={`mt-[2.2cqw] font-display leading-[1.06] font-extrabold tracking-[-0.01em] uppercase [font-stretch:100%] [text-wrap:balance] ${
            long ? "text-[5.4cqw]" : business ? "text-[5.9cqw]" : "text-[6.6cqw]"
          }`}
        >
          {text}
        </span>
      </div>

      {/* Wave where the band meets the white */}
      <svg viewBox="0 0 100 22" preserveAspectRatio="none" className="absolute inset-x-0 top-[41%] h-[13%] w-full" aria-hidden="true">
        <path d="M0 9C28 1 58 17 100 5V22H0Z" fill="#fff" opacity="0.35" />
        <path d="M0 13C30 5 60 21 100 10V22H0Z" fill="#fff" />
      </svg>

      {/* Google mark */}
      <span className="absolute top-[42%] left-1/2 grid h-[17cqw] w-[17cqw] -translate-x-1/2 place-items-center rounded-full bg-white shadow-[0_0.8cqw_2.4cqw_rgba(17,24,39,0.22)]">
        <GoogleG className="h-[10.5cqw] w-[10.5cqw]" />
      </span>

      {/* Tap mark + call to action */}
      <TapMark className="absolute top-[63%] left-1/2 w-[44cqw] -translate-x-1/2 text-[#111]" />
      <span className="absolute inset-x-0 bottom-[6.5cqw] text-center text-[5cqw] font-bold tracking-[-0.01em] text-[#111]">Tap to rate your experience</span>
    </div>
  );
}
