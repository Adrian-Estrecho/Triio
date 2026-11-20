"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "./icons";

/**
 * Search box for admin lists. Updates ?q= in the URL as you type (short delay),
 * keeping the current tab and filters, so results can be refreshed and shared.
 */
export function SearchBox({ placeholder = "Search", className = "" }: { placeholder?: string; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the box in sync when the URL changes some other way (e.g. back button, Clear filters).
  const urlQ = params.get("q") ?? "";
  useEffect(() => setValue(urlQ), [urlQ]);

  const go = (q: string) => {
    const next = new URLSearchParams(params.toString());
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    next.delete("new"); // never re-open a "create" dialog while searching
    const s = next.toString();
    startTransition(() => router.replace(`${pathname}${s ? `?${s}` : ""}`, { scroll: false }));
  };

  const onChange = (q: string) => {
    setValue(q);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => go(q), 250);
  };

  return (
    <form
      role="search"
      className={`relative ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        go(value);
      }}
    >
      <label className="flex h-10 items-center gap-2.5 rounded-full bg-surface-3 px-4 text-ink-weak transition-colors focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-300 hover:bg-surface-4">
        <Icon name="search" className={`h-[18px] w-[18px] shrink-0 ${pending ? "animate-pulse" : ""}`} />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-weak [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              if (timer.current) clearTimeout(timer.current);
              setValue("");
              go("");
            }}
            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-weak hover:bg-surface-4 hover:text-ink"
            aria-label="Clear search"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        )}
      </label>
    </form>
  );
}

