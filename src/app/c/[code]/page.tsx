import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ProfileView } from "@/components/ProfileView";
import { CardSetup } from "@/components/personal/CardSetup";
import { getUserEmail, getViewer } from "@/lib/owner";
import { resolveCard } from "@/lib/supabase/public";
import { isSafeHttpUrl } from "@/lib/utils";

// Every tap must reach the database (to log it and get the latest destination).
export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * This is the URL written on every NFC chip and QR code:  /c/{CARD_CODE}
 * Review / link cards redirect; profile cards show the profile;
 * a personal card that nobody has set up yet shows the setup screen.
 */
export default async function CardPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { code } = await params;
  if (!/^[A-Za-z0-9]{4,16}$/.test(code)) notFound();

  const result = await resolveCard(code);
  if (!result) notFound();

  if (result.type === "setup") {
    const { notice } = await searchParams;
    return <CardSetup code={code.toUpperCase()} buyerName={result.name ?? null} email={await getUserEmail()} notice={notice === "confirm-email"} />;
  }

  if (result.type === "profile") {
    const viewer = result.profile.kind === "personal" ? await getViewer(result.profile.slug) : undefined;
    return <ProfileView profile={result.profile} vcardHref={`/p/${result.profile.slug}/vcard`} viewer={viewer} />;
  }

  if (!isSafeHttpUrl(result.url)) notFound();
  redirect(result.url);
}
