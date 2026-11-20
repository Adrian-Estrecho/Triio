import { LogoMark } from "@/components/Logo";

/** The packaging insert itself: 95 × 140 mm, black on white so it prints well on any printer. */
export function CardInsert({ name, code, qrSvg }: { name: string | null; code: string | null; qrSvg: string }) {
  const first = name?.trim().split(/\s+/)[0];
  return (
    <article
      className="relative flex h-[140mm] w-[95mm] flex-col overflow-hidden rounded-[4mm] bg-white px-[7mm] py-[7mm] text-ink shadow-[0_8px_40px_rgba(0,0,0,0.08)] print:rounded-none print:shadow-none print:outline-dashed print:outline-1 print:outline-line-strong"
      style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
    >
      <header className="flex items-center gap-[2mm]">
        <LogoMark size={20} />
        <span className="text-[13pt] font-extrabold tracking-tight">triio</span>
      </header>

      <h1 className="mt-[6mm] text-[20pt] leading-[1.1] font-extrabold tracking-tight">{first ? `Hi ${first}!` : "Hi there!"}</h1>
      <p className="mt-[2mm] text-[10pt] leading-snug text-ink-weak">Your Triio card is ready. Set it up in under a minute:</p>

      <ol className="mt-[5mm] space-y-[3.5mm] text-[9.5pt] leading-snug">
        {[
          ["Tap the card on your phone", "iPhone: hold it near the top edge. Android: turn on NFC. Or scan the QR code below."],
          ["Enter your setup code and email", "Then create a password. Your name is already filled in."],
          ["You’re live!", "To edit your profile later, tap your card and tap your photo."],
        ].map(([title, body], i) => (
          <li key={i} className="flex gap-[3mm]">
            <span className="flex h-[6mm] w-[6mm] shrink-0 items-center justify-center rounded-full bg-navy text-[8.5pt] font-bold text-white">{i + 1}</span>
            <span>
              <b className="block">{title}</b>
              <span className="text-ink-weak">{body}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-auto flex items-end gap-[4mm]">
        <div className="min-w-0 flex-1">
          <p className="text-[7.5pt] font-bold tracking-[0.12em] text-ink-weak uppercase">Your setup code</p>
          <p className="mt-[1.5mm] rounded-[2.5mm] border-[0.4mm] border-navy px-[3mm] py-[2mm] text-center font-mono text-[19pt] font-bold tracking-[0.22em]">
            {code ?? "——————"}
          </p>
          <p className="mt-[1.5mm] text-[7pt] leading-snug text-ink-faint">Keep this code private until your card is set up.</p>
        </div>
        <div className="w-[24mm] shrink-0 text-center">
          <div className="h-[24mm] w-[24mm] [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <p className="mt-[1mm] text-[6pt] text-ink-faint">Can’t tap? Scan</p>
        </div>
      </div>
    </article>
  );
}
