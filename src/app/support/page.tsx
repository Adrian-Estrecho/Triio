import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SupportForm } from "./form";

export const metadata = { title: "Support · Triio", description: "Questions about your Triio card or order? Send us a message." };

type SP = Promise<{ card?: string; topic?: string }>;

export default async function SupportPage({ searchParams }: { searchParams: SP }) {
  const { card, topic } = await searchParams;
  const cardCode = card?.replace(/[^a-z0-9]/gi, "").slice(0, 12).toUpperCase() || undefined;

  return (
    <main className="flex min-h-dvh flex-col bg-navy text-white">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/"><Logo /></Link>
      </header>

      <section className="mx-auto w-full max-w-3xl flex-1 px-6 pb-20">
        <p className="mb-3 text-sm font-semibold tracking-[0.2em] text-sky uppercase">Support</p>
        <h1 className="text-3xl leading-tight font-bold sm:text-4xl">How can we help?</h1>
        <p className="mt-3 mb-10 max-w-xl text-slate-300">
          A question about your order, a card that isn&apos;t opening, or anything else. Send it here and we&apos;ll reply by email within one business day.
        </p>
        <SupportForm cardCode={cardCode} topic={card ? "card_problem" : topic} />
      </section>

      <footer className="px-6 py-6 text-center text-xs text-slate-500">© {new Date().getFullYear()} Triio</footer>
    </main>
  );
}
