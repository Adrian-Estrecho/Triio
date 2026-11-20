import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileView } from "@/components/ProfileView";
import { getViewer } from "@/lib/owner";
import { getPublicProfile } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ intro?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getPublicProfile(slug);
  if (!profile) return { title: "Not found" };
  return {
    title: profile.display_name,
    description: profile.tagline ?? profile.description ?? undefined,
    openGraph: { title: profile.display_name, description: profile.tagline ?? undefined, images: profile.logo_url ? [profile.logo_url] : undefined },
  };
}

/** Shareable profile link (e.g. for Facebook bio or Messenger). Taps are not counted here. */
export default async function ProfilePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { intro } = await searchParams;
  const profile = await getPublicProfile(slug);
  if (!profile) notFound();
  const viewer = profile.kind === "personal" ? await getViewer(profile.slug) : undefined;
  return <ProfileView profile={profile} vcardHref={`/p/${profile.slug}/vcard`} viewer={viewer} intro={intro !== "0"} />;
}
