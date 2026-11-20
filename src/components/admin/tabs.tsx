import Link from "next/link";

export type TabItem = { href: string; label: string; count?: number; active: boolean };

/** Pill tabs that switch via the URL (e.g. ?tab=users), so each tab can be linked to and refreshed. */
export function PillTabs({ tabs, label }: { tabs: TabItem[]; label: string }) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label={label}>
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={`flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${
            t.active ? "bg-navy text-white" : "bg-surface-3 text-ink hover:bg-surface-4"
          }`}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${t.active ? "bg-white/15" : "bg-white text-ink-weak"}`}>{t.count}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
