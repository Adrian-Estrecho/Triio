export function LogoMark({ size = 28, color = "#38BDF8" }: { size?: number; color?: string }) {
  // Three dots joined by a tap arc — "trio" + "tap".
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="7" cy="22" r="4" fill={color} />
      <circle cx="16" cy="13" r="4" fill={color} opacity="0.8" />
      <circle cx="25" cy="22" r="4" fill={color} opacity="0.6" />
      <path d="M7 22 L16 13 L25 22" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark />
      <span className={`text-xl font-bold tracking-tight ${dark ? "text-navy" : "text-white"}`}>triio</span>
    </span>
  );
}
