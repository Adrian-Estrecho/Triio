import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, check } from "@/lib/admin";
import { siteUrl } from "@/lib/env";
import type { Profile } from "@/lib/types";
import { linksToText } from "@/lib/utils";
import { Checkbox, Field, PageHeader, Select, TextArea } from "@/components/admin/fields";
import { CopyButton, SubmitButton } from "@/components/admin/ui";
import { OfferingsEditor } from "@/components/admin/OfferingsEditor";
import { createCards, deleteProfile, updateProfile } from "../../actions";

export default async function ProfileEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase: db } = await requireAdmin();
  const { data: p } = await db.from("profiles").select("*").eq("id", id).maybeSingle<Profile>();
  if (!p) notFound();

  const [customers, cards] = await Promise.all([
    db.from("customers").select("id, business_name").order("business_name"),
    db.from("nfc_cards").select("id, card_code, label, status").eq("profile_id", id),
  ]);
  const cust = check(customers, "Customers") as { id: string; business_name: string }[];
  const linked = check(cards, "Cards") as { id: string; card_code: string; label: string | null; status: string }[];
  const shareUrl = `${siteUrl()}/p/${p.slug}`;

  return (
    <div className="space-y-6">
      <PageHeader title={p.display_name} subtitle={shareUrl}>
        <Link href="/admin/profiles" className="btn btn-ghost">← Profiles</Link>
        <CopyButton text={shareUrl} label="Copy share link" />
        <a href={`/p/${p.slug}`} target="_blank" rel="noreferrer" className="btn btn-accent">Open live page</a>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <form action={updateProfile} className="space-y-6">
          <input type="hidden" name="id" value={p.id} />

          <section className="card space-y-4">
            <h2 className="font-semibold">Basics</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business / display name" name="display_name" defaultValue={p.display_name} required />
              <Field label="Link name" name="slug" defaultValue={p.slug} hint="Letters, numbers and dashes. Changing it breaks old /p/ links (cards keep working)." />
              <Field label="Tagline" name="tagline" defaultValue={p.tagline} placeholder="Specialty coffee in Marikina" className="sm:col-span-2" />
              <TextArea label="Short description" name="description" defaultValue={p.description} className="sm:col-span-2" />
              <Select label="Customer" name="customer_id" options={cust.map((c) => ({ value: c.id, label: c.business_name }))} defaultValue={p.customer_id} emptyLabel="— none —" />
              <div className="flex items-end pb-2"><Checkbox label="Profile is live" name="is_active" defaultChecked={p.is_active} /></div>
            </div>
          </section>

          <section className="card space-y-4">
            <h2 className="font-semibold">Look</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="accent_color">Brand color</label>
                <input id="accent_color" name="accent_color" type="color" defaultValue={p.accent_color} className="h-10 w-full cursor-pointer rounded-xl border border-line-strong" />
              </div>
              <Select label="Theme" name="theme" options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }]} defaultValue={p.theme} />
              <div>
                <label className="label" htmlFor="logo">Logo (square works best)</label>
                <input id="logo" name="logo" type="file" accept="image/*" className="input" />
                {p.logo_url && (
                  <div className="mt-2 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    <Checkbox label="Remove" name="remove_logo" />
                  </div>
                )}
              </div>
              <div>
                <label className="label" htmlFor="cover">Cover photo (wide)</label>
                <input id="cover" name="cover" type="file" accept="image/*" className="input" />
                {p.cover_url && (
                  <div className="mt-2 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.cover_url} alt="" className="h-10 w-20 rounded-lg object-cover" />
                    <Checkbox label="Remove" name="remove_cover" />
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="card space-y-4">
            <h2 className="font-semibold">Contact & buttons</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone" name="phone" defaultValue={p.phone} placeholder="0917 123 4567" />
              <Field label="Email" name="email" type="email" defaultValue={p.email} />
              <Field label="Website" name="website" defaultValue={p.website} placeholder="example.com" />
              <Field label="Google Maps link (Directions button)" name="maps_url" defaultValue={p.maps_url} placeholder="maps.app.goo.gl/…" />
              <Field label="Address" name="address" defaultValue={p.address} className="sm:col-span-2" />
              <Field
                label="Google review link"
                name="review_url"
                defaultValue={p.review_url}
                className="sm:col-span-2"
                hint="Google Business Profile → Ask for reviews → copy link. Shows a 'Leave us a review' button."
              />
            </div>
          </section>

          <section className="card space-y-4">
            <h2 className="font-semibold">Social & extra links</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Facebook" name="facebook" defaultValue={p.facebook} placeholder="facebook.com/yourpage" />
              <Field label="Instagram" name="instagram" defaultValue={p.instagram} placeholder="instagram.com/yourpage" />
              <Field label="TikTok" name="tiktok" defaultValue={p.tiktok} />
              <Field label="YouTube" name="youtube" defaultValue={p.youtube ?? null} placeholder="youtube.com/@yourchannel" />
              <Field label="LinkedIn" name="linkedin" defaultValue={p.linkedin ?? null} placeholder="linkedin.com/in/… or /company/…" />
              <Field label="Messenger (for “Ask about this” on products)" name="messenger" defaultValue={p.messenger} placeholder="m.me/yourpage" />
              <Field label="WhatsApp (for “Ask about this” on products)" name="whatsapp" defaultValue={p.whatsapp} placeholder="wa.me/63917…" />
              <Field label="Viber (for “Ask about this” on products)" name="viber" defaultValue={p.viber} />
              <TextArea
                label="Custom buttons — one per line: Label | link"
                name="links"
                rows={4}
                defaultValue={linksToText(p.links)}
                placeholder={"View our menu | https://…\nBook an appointment | https://…"}
                className="sm:col-span-2"
              />
            </div>
          </section>

          {p.kind !== "personal" && (
            <section className="card space-y-4">
              <div>
                <h2 className="font-semibold">Products &amp; services</h2>
                <p className="text-sm text-ink-weak">Shown as a photo grid on the business page. Tapping one opens its details with an Order / Ask button.</p>
              </div>
              <OfferingsEditor initial={Array.isArray(p.offerings) ? p.offerings : []} title={p.offerings_title ?? null} ready={"offerings" in p} />
            </section>
          )}

          <div className="sticky bottom-4 z-10 flex justify-end">
            <SubmitButton className="btn btn-primary shadow-lg">Save profile</SubmitButton>
          </div>
        </form>

        <aside className="space-y-6">
          <div className="card p-3">
            <p className="mb-2 px-2 text-xs font-medium text-ink-weak">Live preview (refreshes after saving)</p>
            <div className="mx-auto h-[700px] w-full max-w-[360px] overflow-hidden rounded-[48px] border-[10px] border-[#1c1c1e] shadow-xl">
              <iframe key={p.updated_at} src={`/p/${p.slug}`} className="h-full w-full" title="Profile preview" />
            </div>
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold">Cards that open this profile</h2>
            {linked.length ? (
              <ul className="space-y-1 text-sm">
                {linked.map((c) => (
                  <li key={c.id}>
                    <Link href={`/admin/cards/${c.id}`} className="font-mono hover:underline">{c.card_code}</Link>
                    <span className="text-ink-weak"> · {c.label ?? "no label"} · {c.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-weak">None yet.</p>
            )}
            <form action={createCards} className="flex items-end gap-2 border-t border-line pt-3">
              <input type="hidden" name="card_type" value="profile" />
              <input type="hidden" name="profile_id" value={p.id} />
              <input type="hidden" name="return_to" value={`/admin/profiles/${p.id}`} />
              <Field label="How many" name="count" type="number" defaultValue={1} className="w-24" />
              <SubmitButton className="btn btn-accent">+ Profile card</SubmitButton>
            </form>
          </div>

          <form action={deleteProfile}>
            <input type="hidden" name="id" value={p.id} />
            <SubmitButton className="btn btn-danger" confirm="Delete this profile? Cards that open it will stop working.">Delete profile</SubmitButton>
          </form>
        </aside>
      </div>
    </div>
  );
}
