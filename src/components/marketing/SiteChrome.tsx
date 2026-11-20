import Link from "next/link";
import { Logo } from "@/components/Logo";

export function SiteHeader({ minimal = false }: { minimal?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-navy/[0.06] bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link href="/" className="mk-focus rounded-md" aria-label="Triio home">
          <Logo dark />
        </Link>
        {!minimal && (
          <nav className="hidden items-center gap-7 text-[15px] font-medium text-slate-ink md:flex" aria-label="Main">
            <a href="/#cards" className="transition-colors hover:text-navy">Cards & prices</a>
            <a href="/#how" className="transition-colors hover:text-navy">How ordering works</a>
            <a href="/#faq" className="transition-colors hover:text-navy">Questions</a>
          </nav>
        )}
        {minimal ? (
          <Link href="/support" className="text-sm font-medium text-slate-ink hover:text-navy">Need help?</Link>
        ) : (
          <Link
            href="/order"
            className="inline-flex h-10 items-center rounded-full bg-navy px-5 text-sm font-semibold text-white transition-[background-color,transform] duration-100 hover:bg-[#25314a] active:scale-[0.97]"
          >
            Order a card
          </Link>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-navy text-slate-400">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Tap-to-review and tap-to-connect NFC cards, made for local businesses in Marikina, Antipolo and Cubao.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Shop</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/order" className="hover:text-white">Order a card</Link></li>
            <li><Link href="/#cards" className="hover:text-white">Cards & prices</Link></li>
            <li><Link href="/c/DEMO01" className="hover:text-white">See a demo profile</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Help</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/support" className="hover:text-white">Support</Link></li>
            <li><Link href="/me/login" className="hover:text-white">Edit my card</Link></li>
            <li><Link href="/admin" className="hover:text-white">Admin</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/[0.06]">
        <p className="mx-auto w-full max-w-6xl px-4 py-5 text-xs text-slate-500 sm:px-6">© {new Date().getFullYear()} Triio</p>
      </div>
    </footer>
  );
}
