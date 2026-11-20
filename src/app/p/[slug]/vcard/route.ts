import { getPublicProfile } from "@/lib/supabase/public";
import { siteUrl } from "@/lib/env";
import { buildVCard } from "@/lib/vcard";

export const dynamic = "force-dynamic";

/** Save Contact: downloads a .vcf that iPhone and Android open as a new contact. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await getPublicProfile(slug);
  if (!profile) return new Response("Not found", { status: 404 });

  const body = buildVCard(profile, `${siteUrl()}/p/${profile.slug}`);
  return new Response(body, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${profile.slug}.vcf"`,
      "Cache-Control": "no-store",
    },
  });
}
