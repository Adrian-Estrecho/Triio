import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, check } from "@/lib/admin";
import { LEAD_AREAS, LEAD_CATEGORIES, LEAD_STATUSES, OUTREACH_CHANNELS, OUTREACH_OUTCOMES, labelOf } from "@/lib/constants";
import type { Lead, Outreach } from "@/lib/types";
import { fmtDate, todayISO } from "@/lib/utils";
import { Badge, Empty, Field, PageHeader, Select, TextArea } from "@/components/admin/fields";
import { SubmitButton } from "@/components/admin/ui";
import { convertLead, createOutreach, deleteLead, deleteOutreach, updateLead } from "../../actions";

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase: db } = await requireAdmin();
  const { data: lead } = await db.from("leads").select("*").eq("id", id).maybeSingle<Lead>();
  if (!lead) notFound();
  const history = check(
    await db.from("outreach").select("*").eq("lead_id", id).order("contacted_on", { ascending: false }).order("created_at", { ascending: false }),
    "Outreach"
  ) as Outreach[];

  return (
    <div className="space-y-6">
      <PageHeader title={lead.business_name} subtitle={[lead.category, lead.area].filter(Boolean).join(" · ") || undefined}>
        <Link href="/admin/leads" className="btn btn-ghost">← Leads</Link>
        {lead.customer_id ? (
          <Link href={`/admin/customers/${lead.customer_id}`} className="btn btn-accent">Open customer</Link>
        ) : (
          <form action={convertLead}>
            <input type="hidden" name="id" value={lead.id} />
            <SubmitButton className="btn btn-accent">Won → make customer</SubmitButton>
          </form>
        )}
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-2">
          <form action={createOutreach} className="card space-y-4">
            <h2 className="font-semibold">Log a contact</h2>
            <input type="hidden" name="lead_id" value={lead.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date" name="contacted_on" type="date" defaultValue={todayISO()} />
              <Select label="Channel" name="channel" options={OUTREACH_CHANNELS} defaultValue="visit" />
              <Select label="Outcome" name="outcome" options={OUTREACH_OUTCOMES} emptyLabel="—" />
              <Field label="Next follow-up" name="next_follow_up" type="date" />
              <TextArea label="What happened?" name="summary" className="sm:col-span-2" placeholder="Talked to the owner, showed sample, wants price for 3 cards…" />
            </div>
            <SubmitButton>Save contact</SubmitButton>
          </form>

          <section className="card">
            <h2 className="mb-4 font-semibold">History</h2>
            {history.length ? (
              <ol className="space-y-4">
                {history.map((h) => (
                  <li key={h.id} className="border-l-2 border-sky pl-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{fmtDate(h.contacted_on)}</span>
                      <span className="text-ink-weak">· {labelOf(OUTREACH_CHANNELS, h.channel)}</span>
                      {h.outcome && <Badge value={h.outcome} label={labelOf(OUTREACH_OUTCOMES, h.outcome)} />}
                      <form action={deleteOutreach} className="ml-auto">
                        <input type="hidden" name="id" value={h.id} />
                        <input type="hidden" name="lead_id" value={lead.id} />
                        <SubmitButton className="text-xs text-ink-faint hover:text-red-600" pendingText="…" confirm="Delete this entry?">Delete</SubmitButton>
                      </form>
                    </div>
                    {h.summary && <p className="mt-1 whitespace-pre-line text-sm text-ink-weak">{h.summary}</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <Empty>No contact logged yet.</Empty>
            )}
          </section>
        </div>

        <form action={updateLead} className="card space-y-4 xl:col-span-3">
          {lead.source && lead.source !== "manual" && (
            <p className="rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-900">
              Found automatically on {lead.source === "google" ? "Google Maps" : "OpenStreetMap"}
              {lead.review_count != null && <> · <b>{lead.review_count}</b> Google reviews{lead.rating ? ` · ${lead.rating}★` : ""}</>}
            </p>
          )}
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Details</h2>
            <Badge value={lead.status} label={labelOf(LEAD_STATUSES, lead.status)} />
          </div>
          <input type="hidden" name="id" value={lead.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name" name="business_name" defaultValue={lead.business_name} required className="sm:col-span-2" />
            <Select label="Status" name="status" options={LEAD_STATUSES} defaultValue={lead.status} />
            <Select label="Tier" name="tier" options={["A", "B", "C"]} defaultValue={lead.tier} emptyLabel="—" />
            <Select label="Category" name="category" options={LEAD_CATEGORIES} defaultValue={lead.category} emptyLabel="—" />
            <Select label="Area" name="area" options={LEAD_AREAS} defaultValue={lead.area} emptyLabel="—" />
            <Field label="Contact person" name="contact_person" defaultValue={lead.contact_person} />
            <Field label="Phone" name="phone" defaultValue={lead.phone} />
            {"email" in lead && <Field label="Email" name="email" type="email" defaultValue={lead.email} hint="Copied to the customer when won, so they get the welcome email." />}
            {"website" in lead && <Field label="Website" name="website" defaultValue={lead.website} />}
            <Field label="Facebook page" name="facebook" defaultValue={lead.facebook} />
            <Field label="Google Maps link" name="maps_url" defaultValue={lead.maps_url} />
            <Field label="Address" name="address" defaultValue={lead.address} className="sm:col-span-2" />
            <Field label="Next follow-up" name="next_follow_up" type="date" defaultValue={lead.next_follow_up} />
            <TextArea label="Notes" name="notes" defaultValue={lead.notes} className="sm:col-span-2" rows={4} />
          </div>
          <div className="flex flex-wrap gap-2">
            <SubmitButton>Save</SubmitButton>
            {lead.maps_url && <a href={lead.maps_url} target="_blank" rel="noreferrer" className="btn btn-ghost">Open in Maps</a>}
            {lead.facebook && <a href={lead.facebook} target="_blank" rel="noreferrer" className="btn btn-ghost">Open Facebook</a>}
            {lead.website && <a href={lead.website} target="_blank" rel="noreferrer" className="btn btn-ghost">Open website</a>}
          </div>
        </form>
      </div>

      <form action={deleteLead}>
        <input type="hidden" name="id" value={lead.id} />
        <SubmitButton className="btn btn-danger" confirm="Delete this lead and its history?">Delete lead</SubmitButton>
      </form>
    </div>
  );
}
