import Link from "next/link";
import type { Alert } from "@/lib/automation/alerts";

const dot: Record<Alert["level"], string> = {
  urgent: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-sky-500",
};

const label: Record<Alert["level"], string> = { urgent: "Urgent", warning: "Needs attention", info: "FYI" };

/** "Needs attention" list: one row per alert, with up to `maxItems` linked records under it. */
export function AlertList({ alerts, maxItems = 4 }: { alerts: Alert[]; maxItems?: number }) {
  if (!alerts.length) {
    return <p className="rounded-2xl border border-dashed border-line-strong bg-white/60 p-6 text-center text-sm text-ink-weak">All clear. Nothing needs your attention right now.</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {alerts.map((a) => (
        <li key={a.id} className="py-3 first:pt-0 last:pb-0">
          <div className="flex items-start gap-3">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dot[a.level]}`} aria-label={label[a.level]} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                {a.href ? (
                  <Link href={a.href} className="text-sm font-semibold text-ink hover:underline">{a.title}</Link>
                ) : (
                  <p className="text-sm font-semibold text-ink">{a.title}</p>
                )}
                <span className="text-[11px] font-medium tracking-wide text-ink-faint uppercase">{label[a.level]}</span>
              </div>
              {a.detail && <p className="mt-0.5 text-xs text-ink-weak">{a.detail}</p>}
              {a.items && a.items.length > 0 && (
                <ul className="mt-1.5 space-y-0.5">
                  {a.items.slice(0, maxItems).map((i) => (
                    <li key={i.href + i.label} className="truncate text-xs">
                      <Link href={i.href} className="text-ink hover:underline">{i.label}</Link>
                      {i.meta && <span className="text-ink-faint"> · {i.meta}</span>}
                    </li>
                  ))}
                  {a.items.length > maxItems && <li className="text-xs text-ink-faint">…and {a.items.length - maxItems} more</li>}
                </ul>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
