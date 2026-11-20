"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/admin/icons";

type Item = { href: string; label: string; icon: IconName };

const top: Item[] = [{ href: "/admin", label: "Dashboard", icon: "home" }];

const groups: { title: string; items: Item[] }[] = [
  {
    title: "Sales",
    items: [
      { href: "/admin/leads", label: "Leads & outreach", icon: "leads" },
      { href: "/admin/customers", label: "Customers", icon: "customers" },
      { href: "/admin/concerns", label: "Concerns", icon: "inbox" },
      { href: "/admin/orders", label: "Orders", icon: "orders" },
    ],
  },
  {
    title: "Cards",
    items: [
      { href: "/admin/profiles", label: "Profiles", icon: "profiles" },
      { href: "/admin/cards", label: "NFC cards", icon: "cards" },
    ],
  },
  {
    title: "Money",
    items: [{ href: "/admin/costs", label: "Costs", icon: "costs" }],
  },
  {
    title: "Automation",
    items: [{ href: "/admin/automations", label: "Automations", icon: "bolt" }],
  },
];

function NavLink({ item, onNavigate }: { item: Item; onNavigate?: () => void }) {
  const path = usePathname();
  const active = item.href === "/admin" ? path === "/admin" : path.startsWith(item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex h-10 items-center gap-3 rounded-lg px-4 text-sm transition-colors ${
        active ? "bg-surface-3 font-semibold text-ink" : "text-ink hover:bg-surface-2"
      }`}
    >
      <Icon name={item.icon} className={`h-5 w-5 shrink-0 ${active ? "text-ink" : "text-ink-weak"}`} />
      {item.label}
    </Link>
  );
}

/** Reddit-style left rail: top links, then collapsible sections divided by hairlines. */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col px-4 py-3" aria-label="Admin">
      {top.map((i) => (
        <NavLink key={i.href} item={i} onNavigate={onNavigate} />
      ))}
      {groups.map((g) => (
        <details key={g.title} open className="group border-t border-line py-3 first-of-type:mt-3">
          <summary className="flex h-10 cursor-pointer list-none items-center justify-between rounded-lg px-4 text-xs font-medium tracking-[0.08em] text-ink-weak uppercase hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
            {g.title}
            <Icon name="chevron" className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-1 space-y-0.5">
            {g.items.map((i) => (
              <NavLink key={i.href} item={i} onNavigate={onNavigate} />
            ))}
          </div>
        </details>
      ))}
    </nav>
  );
}

/** Hamburger + slide-in drawer for phones and tablets. Enters and exits from the left. */
export function MobileMenu({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  useEffect(() => setOpen(false), [path]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-surface-3 lg:hidden"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Icon name="menu" />
      </button>

      <div className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/40 transition-opacity duration-200 motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          inert={!open}
          className={`absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col overflow-y-auto bg-white shadow-xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-14 items-center justify-between border-b border-line px-4">
            {children}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-3"
              aria-label="Close menu"
            >
              <Icon name="close" />
            </button>
          </div>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </aside>
      </div>
    </>
  );
}
