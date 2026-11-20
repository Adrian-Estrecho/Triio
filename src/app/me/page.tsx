import { redirect } from "next/navigation";
import { LogoMark } from "@/components/Logo";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { ownerSignOut } from "./actions";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit profile", robots: { index: false } };

/** The card owner's settings: everything on their personal profile. Only the owner can see or save it. */
export default async function MySettingsPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/me/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle<Profile>();

  if (!profile) {
    return (
      <main className="ios ios-dark flex min-h-dvh items-center justify-center px-6" style={{ background: "var(--ios-bg)", color: "var(--ios-label)" }}>
        <div className="max-w-sm text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[18px]" style={{ background: "var(--ios-cell)" }}>
            <LogoMark size={34} />
          </span>
          <h1 className="mt-5 text-[26px] font-bold" style={{ letterSpacing: "-0.02em" }}>
            No card yet
          </h1>
          <p className="mt-2 text-[17px] leading-snug" style={{ color: "var(--ios-secondary)" }}>
            You&apos;re logged in as {user.email}, but no card is linked to this account. Tap your new Triio card with your phone to set it up.
          </p>
          <form action={ownerSignOut} className="mt-8">
            <button className="cursor-pointer text-[17px]" style={{ color: "#FF453A" }}>
              Log Out
            </button>
          </form>
        </div>
      </main>
    );
  }

  const { welcome } = await searchParams;
  return <SettingsForm profile={profile} email={user.email ?? ""} welcome={welcome === "1"} shareUrl={`${siteUrl()}/p/${profile.slug}`} />;
}
