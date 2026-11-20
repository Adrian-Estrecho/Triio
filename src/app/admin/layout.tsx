import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoMark } from "@/components/Logo";
import { Icon } from "@/components/admin/icons";
import { requireAdmin } from "@/lib/admin";
import { signOut } from "@/app/login/actions";
import { MobileMenu, SidebarNav } from "./nav";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Admin", template: "%s · Triio Admin" } };

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-2 text-[22px] font-extrabold tracking-tight text-ink">
      <LogoMark size={30} /> triio
    </Link>
  );
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, isAdmin } = await requireAdmin();

  if (!isAdmin) {
    // Card owners log in too. Send them to their own settings instead.
    const { data: owned } = await supabase.from("profiles").select("id").eq("owner_id", user.id).limit(1);
    if (owned?.length) redirect("/me");

    return (
      <main className="mx-auto max-w-xl p-8">
        <div className="card space-y-3">
          <h1 className="text-lg font-bold">Almost there — make yourself an admin</h1>
          <p className="text-sm text-ink-weak">
            You are logged in as <b className="text-ink">{user.email}</b>, but this account is not in the <code>admin_users</code> table yet.
            Open Supabase → SQL Editor and run:
          </p>
          <pre className="overflow-x-auto rounded-xl bg-navy p-4 text-xs text-sky-200">
{`insert into admin_users (user_id)
select id from auth.users where email = '${user.email}';`}
          </pre>
          <p className="text-sm text-ink-weak">Then refresh this page.</p>
          <form action={signOut}>
            <button className="btn btn-ghost">Log out</button>
          </form>
        </div>
      </main>
    );
  }

  const initial = (user.email ?? "?").slice(0, 1).toUpperCase();

  return (
    <div className="min-h-dvh bg-surface">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-line bg-white">
        <div className="flex h-14 items-center gap-3 px-4">
          <div className="flex shrink-0 items-center gap-1 lg:w-[240px]">
            <MobileMenu>
              <Brand />
            </MobileMenu>
            <Brand />
          </div>

          <form action="/admin/leads" method="get" role="search" className="mx-auto hidden w-full max-w-[560px] sm:block">
            <label className="flex h-10 items-center gap-2.5 rounded-full bg-surface-3 px-4 text-ink-weak transition-colors hover:bg-surface-4 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-300">
              <Icon name="search" className="h-[18px] w-[18px] shrink-0" />
              <input
                name="q"
                placeholder="Search leads"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-weak"
                aria-label="Search leads"
              />
            </label>
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0">
            <Link href="/admin/leads" className="flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-surface-3 sm:hidden" aria-label="Search leads">
              <Icon name="search" />
            </Link>
            <Link href="/admin/orders" className="flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink hover:bg-surface-3">
              <Icon name="plus" className="h-5 w-5" />
              <span className="hidden sm:inline">Create</span>
            </Link>

            <details className="relative">
              <summary
                className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full hover:bg-surface-3 [&::-webkit-details-marker]:hidden"
                aria-label="Account menu"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky text-sm font-bold text-navy">{initial}</span>
              </summary>
              <div className="absolute right-0 mt-2 w-64 origin-top-right overflow-hidden rounded-2xl bg-white py-2 shadow-[0_4px_24px_rgba(0,0,0,0.12)] ring-1 ring-black/5">
                <div className="px-4 py-2">
                  <p className="text-xs text-ink-weak">Signed in as</p>
                  <p className="truncate text-sm font-semibold text-ink">{user.email}</p>
                </div>
                <div className="my-1 border-t border-line" />
                <a href="/" target="_blank" rel="noreferrer" className="flex h-11 items-center gap-3 px-4 text-sm text-ink hover:bg-surface-2">
                  <Icon name="external" className="h-5 w-5 text-ink-weak" /> View public site
                </a>
                <form action={signOut}>
                  <button className="flex h-11 w-full cursor-pointer items-center gap-3 px-4 text-left text-sm text-ink hover:bg-surface-2">
                    <Icon name="logout" className="h-5 w-5 text-ink-weak" /> Log out
                  </button>
                </form>
              </div>
            </details>
          </div>
        </div>
      </header>

      <div className="lg:flex">
        {/* Left rail */}
        <aside className="hidden border-r border-line bg-white lg:sticky lg:top-14 lg:block lg:h-[calc(100dvh-3.5rem)] lg:w-[272px] lg:shrink-0 lg:overflow-y-auto">
          <SidebarNav />
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-5 sm:px-6 sm:py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
