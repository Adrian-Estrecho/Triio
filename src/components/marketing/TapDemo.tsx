import { ReviewPlate } from "./ReviewPlate";

const STAR = "m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9L12 2.8Z";

/**
 * The hero: a phone moves over a Triio card on a counter, the NFC field pulses, and the
 * review page opens with five stars. Pure CSS (globals.css → "Hero: the tap"), so it plays
 * before any JavaScript loads and holds the finished frame when reduced motion is on.
 * Sizes are in cqw of the stage.
 */
export function TapDemo() {
  return (
    <div className="tap-stage" role="img" aria-label="A phone taps a Triio card on a counter and the business's review page opens with five stars.">
      <div className="tap-counter" />

      <div className="tap-plane">
        <span className="tap-ring" />
        <span className="tap-ring" />
        <span className="tap-ring" />
        <ReviewPlate />
      </div>

      <div className="tap-toast">
        <span className="inline-flex items-center gap-[1.2cqw] rounded-full bg-white px-[3cqw] py-[1.6cqw] text-[3cqw] font-semibold text-navy shadow-[0_12px_30px_-10px_rgba(17,24,39,0.45)] ring-1 ring-black/5">
          <svg viewBox="0 0 24 24" className="h-[3.4cqw] w-[3.4cqw] text-gold" fill="currentColor" aria-hidden="true"><path d={STAR} /></svg>
          +1 review
        </span>
      </div>

      <div className="tap-phone">
        <div className="tap-screen">
          {/* Before the tap */}
          <div className="tap-screen-lock">
            <span className="text-[2.2cqw] font-medium opacity-70">Friday, Nov 20</span>
            <span className="mt-[0.6cqw] text-[9cqw] leading-none font-semibold tracking-tight">4:12</span>
            <span className="mt-auto mb-[6cqw] rounded-full bg-white/12 px-[2.6cqw] py-[1.2cqw] text-[2cqw] font-medium backdrop-blur">
              Hold near the card
            </span>
          </div>

          {/* After the tap */}
          <div className="tap-screen-review flex flex-col px-[2.6cqw] pt-[5cqw] text-navy">
            <div className="flex items-center gap-[1.6cqw]">
              <span className="grid h-[5.6cqw] w-[5.6cqw] shrink-0 place-items-center rounded-full bg-navy text-[2.2cqw] font-bold text-white">YC</span>
              <span className="leading-tight">
                <span className="block text-[2.6cqw] font-bold">Your Café</span>
                <span className="block text-[1.9cqw] text-slate-500">Marikina City</span>
              </span>
            </div>
            <span className="mt-[4cqw] text-[2.3cqw] font-semibold">Rate your visit</span>
            <span className="mt-[1.4cqw] flex gap-[0.8cqw]">
              {[0, 1, 2, 3, 4].map((i) => (
                <svg key={i} viewBox="0 0 24 24" className="tap-star h-[4.6cqw] w-[4.6cqw]" style={{ "--i": i } as React.CSSProperties} fill="currentColor" aria-hidden="true">
                  <path d={STAR} />
                </svg>
              ))}
            </span>
            <span className="mt-[3cqw] rounded-[1.6cqw] bg-white p-[2cqw] text-[2cqw] leading-snug text-slate-600 ring-1 ring-black/5">
              Great coffee and the staff were so friendly. Babalik kami!
            </span>
            <span className="mt-[2.4cqw] self-end rounded-full bg-[#1a73e8] px-[3cqw] py-[1.2cqw] text-[2cqw] font-semibold text-white">Post</span>
          </div>
        </div>
      </div>
    </div>
  );
}
