import { LogoMark } from "@/components/Logo";
import { ReviewPlate, type PlateDesign } from "./ReviewPlate";

/** Contactless symbol: the four arcs printed on tap cards. */
export function Contactless({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M8.5 9.5a4 4 0 0 1 0 5" />
      <path d="M12 7a8 8 0 0 1 0 10" />
      <path d="M15.5 4.5a12 12 0 0 1 0 15" />
      <path d="M5 11.5a1 1 0 0 1 0 1" />
    </svg>
  );
}

export function Stars({ className = "", count = 5 }: { className?: string; count?: number }) {
  return (
    <span className={`inline-flex ${className}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" className="h-[1em] w-[1em]" fill="currentColor">
          <path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9L12 2.8Z" />
        </svg>
      ))}
    </span>
  );
}

/** A decorative QR-like block (the real QR is printed from the admin). Deterministic, so it never shifts. */
function QrMark({ className = "" }: { className?: string }) {
  const n = 9;
  const cells: [number, number][] = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const finder = (x < 3 && y < 3) || (x > 5 && y < 3) || (x < 3 && y > 5);
      if (finder) continue;
      if ((x * 7 + y * 13 + x * y) % 3 === 0) cells.push([x, y]);
    }
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="3" height="3" rx="0.6" fill="none" stroke="currentColor" strokeWidth="0.7" />
      <rect x={x + 1} y={y + 1} width="1" height="1" fill="currentColor" />
    </g>
  );
  return (
    <svg viewBox="-0.5 -0.5 10 10" className={className} aria-hidden="true">
      {finder(0, 0)}
      {finder(6, 0)}
      {finder(0, 6)}
      {cells.map(([x, y]) => (
        <rect key={`${x}.${y}`} x={x + 0.1} y={y + 0.1} width="0.8" height="0.8" rx="0.15" fill="currentColor" />
      ))}
    </svg>
  );
}

export type CardFace = "review" | "profile" | "pack" | "extra";

/**
 * A printed Triio card, drawn in CSS. Every size inside is relative to the card's own width,
 * so the same component works as a hero object, a product thumbnail or an order summary.
 */
export function NfcCard({ face = "review", label, className = "" }: { face?: CardFace; label?: string; className?: string }) {
  const light = face === "extra";
  return (
    <div className={`nfc-card ${className}`} data-tone={light ? "light" : "dark"} role="img" aria-label={cardAlt(face)}>
      {/* Top row: the business and the contactless mark */}
      <div className="absolute top-[7cqw] left-[7cqw] flex items-center gap-[2.6cqw]">
        <span className={`grid h-[11cqw] w-[11cqw] place-items-center rounded-full text-[4.4cqw] font-bold ${light ? "bg-navy text-white" : "bg-white text-navy"}`}>
          {face === "profile" ? "JR" : "YC"}
        </span>
        <span className="leading-[1.1]">
          <span className="block text-[4.6cqw] font-bold tracking-tight">{face === "profile" ? "Jamie Reyes" : "Your Café"}</span>
          <span className={`block text-[3.2cqw] ${light ? "text-slate-500" : "text-slate-300"}`}>
            {face === "profile" ? "Owner · Your Café" : label ?? "Marikina City"}
          </span>
        </span>
      </div>
      <Contactless className={`absolute top-[6.5cqw] right-[6.5cqw] h-[10cqw] w-[10cqw] ${light ? "text-navy" : "text-sky"}`} />

      {/* Bottom row: the ask, and the QR backup */}
      <div className="absolute bottom-[7cqw] left-[7cqw] max-w-[62cqw]">
        {face === "profile" ? (
          <>
            <span className="block text-[6.4cqw] leading-[1.02] font-bold tracking-tight">Tap to save<br />my contact</span>
            <span className="mt-[1.6cqw] block text-[3.2cqw] text-slate-300">Call · Directions · Socials</span>
          </>
        ) : (
          <>
            <Stars className="text-[4.6cqw] text-gold" />
            <span className="mt-[1.4cqw] block text-[6.4cqw] leading-[1.02] font-bold tracking-tight">Loved it here?<br />Tap to review</span>
          </>
        )}
      </div>
      <div className={`absolute right-[6.5cqw] bottom-[6.5cqw] rounded-[1.8cqw] p-[1.4cqw] ${light ? "bg-navy text-white" : "bg-white text-navy"}`}>
        <QrMark className="h-[13cqw] w-[13cqw]" />
      </div>
      <span className={`absolute right-[22cqw] bottom-[6.6cqw] flex items-center gap-[1cqw] text-[2.6cqw] font-semibold tracking-wide ${light ? "text-slate-400" : "text-slate-400"}`}>
        <LogoMark size={10} color="currentColor" /> triio
      </span>
    </div>
  );
}

function cardAlt(face: CardFace) {
  if (face === "profile") return "A Triio profile card that reads: Tap to save my contact.";
  if (face === "extra") return "A light Triio review card.";
  return "A Triio review card with five stars that reads: Loved it here? Tap to review.";
}

/**
 * Product picture. Review products are the square plate (see ReviewPlate); the pack fans
 * three of them out, one per chair. `design` previews a customer's own colors and wording.
 */
export function ProductCardArt({ face, design, size = "md" }: { face: CardFace; design?: PlateDesign; size?: "sm" | "md" }) {
  const shadow = "shadow-[0_22px_34px_-16px_rgba(17,24,39,0.55)]";
  if (face === "profile") {
    return (
      <div className="mx-auto w-[78%] max-w-[16rem] transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-1 group-hover:-rotate-2">
        <NfcCard face="profile" className={shadow} />
      </div>
    );
  }
  if (face === "pack") {
    return (
      <div className={`relative mx-auto aspect-[1.6] w-full ${size === "sm" ? "max-w-[15rem]" : "max-w-[19rem]"}`}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 w-[48%] [transform:translate(-50%,-50%)_translateX(var(--x))_rotate(var(--r))] transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:[transform:translate(-50%,-50%)_translateX(var(--x2))_rotate(var(--r2))]"
            style={
              {
                "--r": `${(i - 1) * 9}deg`,
                "--x": `${(i - 1) * 36}%`,
                "--r2": `${(i - 1) * 13}deg`,
                "--x2": `${(i - 1) * 48}%`,
                zIndex: i === 1 ? 2 : 1,
              } as React.CSSProperties
            }
          >
            <ReviewPlate {...design} className={shadow} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div
      className={`relative mx-auto ${size === "sm" ? "w-[46%] max-w-[9.5rem]" : "w-[56%] max-w-[12rem]"} transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-1 group-hover:-rotate-2`}
    >
      <span className="plate-liner translate-x-[9%] translate-y-[-5%] rotate-[8deg]" aria-hidden="true" />
      <ReviewPlate {...design} className={`relative -rotate-3 ${shadow}`} />
    </div>
  );
}
