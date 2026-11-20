import { LogoMark } from "@/components/Logo";
import { SubmitButton } from "@/components/admin/ui";
import { signIn } from "./actions";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-2 px-4 py-10">
      <div className="w-full max-w-[400px] rounded-3xl bg-white px-6 py-8 shadow-[0_8px_40px_rgba(0,0,0,0.08)] sm:px-10">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark size={44} />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">Log in to Triio</h1>
          <p className="mt-1 text-sm text-ink-weak">Admin dashboard for cards, orders and leads.</p>
        </div>

        <form action={signIn} className="space-y-3">
          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <input type="hidden" name="next" value={next ?? "/admin"} />
          <label className="block">
            <span className="sr-only">Email</span>
            <input
              className="h-14 w-full rounded-full bg-surface-3 px-5 text-sm text-ink outline-none transition-colors placeholder:text-ink-weak hover:bg-surface-4 focus:bg-white focus:ring-2 focus:ring-sky-300"
              name="email"
              type="email"
              placeholder="Email"
              required
              autoComplete="email"
            />
          </label>
          <label className="block">
            <span className="sr-only">Password</span>
            <input
              className="h-14 w-full rounded-full bg-surface-3 px-5 text-sm text-ink outline-none transition-colors placeholder:text-ink-weak hover:bg-surface-4 focus:bg-white focus:ring-2 focus:ring-sky-300"
              name="password"
              type="password"
              placeholder="Password"
              required
              autoComplete="current-password"
            />
          </label>
          <SubmitButton className="btn btn-primary mt-3 h-12 w-full text-base" pendingText="Logging in…">
            Log in
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
