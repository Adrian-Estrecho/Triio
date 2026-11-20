import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="ios ios-light flex min-h-dvh flex-col items-center justify-center px-8 text-center" style={{ background: "var(--ios-bg)", color: "var(--ios-label)" }}>
      <div className="flex h-20 w-20 items-center justify-center rounded-[22px] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
        <LogoMark size={40} />
      </div>
      <h1 className="mt-6 text-[22px] font-bold" style={{ letterSpacing: "-0.02em" }}>
        This card isn&apos;t active
      </h1>
      <p className="mt-2 max-w-xs text-[15px] leading-relaxed" style={{ color: "var(--ios-secondary)" }}>
        The page you tapped isn&apos;t set up yet or has been turned off. Please ask the business for help.
      </p>
    </main>
  );
}
