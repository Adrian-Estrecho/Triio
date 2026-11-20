import Link from "next/link";
import { requireAdmin, check } from "@/lib/admin";
import { LEAD_AREAS, LEAD_CATEGORIES, LEAD_STATUSES, labelOf } from "@/lib/constants";
import type { Lead } from "@/lib/types";
import { fmtDate, todayISO } from "@/lib/utils";
import { Badge, Empty, Field, PageHeader, Select, TextArea } from "@/components/admin/fields";
import { AutoSubmitSelect, SubmitButton } from "@/components/admin/ui";
import { bulkCreateLeads, createLead, quickLeadStatus } from "../actions";

export const metadata = { title: "Leads" };

type SP = Promise<{ status?: string; area?: string; tier?: string; q?: string }>;

export default async function LeadsPage({ searchParams }: { searchParams: SP }) {
  const { status, area, tier, q } = await searchParams;
  const { supabase: db } = await requireAdmin();

  let query = db.from("leads").select("*").order("tier", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  if (area) query = query.eq("area", area);
  if (tier) query = query.eq("tier", tier);
  if (q) query = query.ilike("business_name", `%${q}%`);
  const leads = check(await query, "Leads") as Lead[];
  const today = todayISO();

  return (
    <div className="space-y-6">
      <PageHeader title="Leads & outreach" subtitle="Every business you plan to visit or message. Log each contact on the lead's page.">
        <Link href="/admin/automations" className="btn btn-ghost">Find businesses automatically</Link>
      </PageHeader>

      <form className="card flex flex-wrap items-end gap-3" method="get">
        <div className="min-w-48 flex-1">
          <label className="label">Search</label>
          <input className="input" name="q" defaultValue={q} placeholder="Business name" />
        </div>
        <div>
          <label className="label">Status</label>
          <AutoSubmitSelect className="input" name="status" defaultValue={status ?? ""}>
            <option value="">All</option>
            {LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </AutoSubmitSelect>
        </div>
        <div>
          <label className="label">Area</label>
          <AutoSubmitSelect className="input" name="area" defaultValue={area ?? ""}>
            <option value="">All</option>
            {LEAD_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </AutoSubmitSelect>
        </div>
        <div>
          <label className="label">Tier</label>
          <AutoSubmitSelect className="input" name="tier" defaultValue={tier ?? ""}>
            <option value="">All</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </AutoSubmitSelect>
        </div>
        <button className="btn btn-ghost">Filter</button>
        {(status || area || tier || q) && <Link href="/admin/leads" className="btn btn-ghost">Clear</Link>}
      </form>

      <div className="card overflow-x-auto p-0">
        {leads.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Business</th>
                <th>Area</th>
                <th>Tier</th>
                <th>Status</th>
                <th>Follow up</th>
                <th>Quick update</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td>
                    <Link href={`/admin/leads/${l.id}`} className="font-medium text-ink hover:underline">{l.business_name}</Link>
                    <div className="text-xs text-ink-weak">
                      {[l.category, l.review_count != null ? `${l.review_count} reviews${l.rating ? ` · ${l.rating}★` : ""}` : null].filter(Boolean).join(" · ")}
                      {l.source && l.source !== "manual" && <span className="ml-1.5 rounded-full bg-sky-100 px-1.5 py-px text-[10px] font-semibold text-sky-800">auto</span>}
                    </div>
                  </td>
                  <td>{l.area ?? "—"}</td>
                  <td><Badge value={l.tier} /></td>
                  <td><Badge value={l.status} label={labelOf(LEAD_STATUSES, l.status)} /></td>
                  <td className={l.next_follow_up && l.next_follow_up <= today && !["won", "lost"].includes(l.status) ? "font-medium text-red-600" : ""}>
                    {fmtDate(l.next_follow_up)}
                  </td>
                  <td>
                    <form action={quickLeadStatus} className="flex gap-1">
                      <input type="hidden" name="id" value={l.id} />
                      <AutoSubmitSelect name="status" defaultValue={l.status} className="input py-1 text-xs">
                        {LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </AutoSubmitSelect>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-5"><Empty>No leads yet. Add one below or paste a list.</Empty></div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <form action={createLead} className="card space-y-4">
          <h2 className="font-semibold">Add a lead</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name" name="business_name" required className="sm:col-span-2" />
            <Select label="Category" name="category" options={LEAD_CATEGORIES} emptyLabel="—" />
            <Select label="Area" name="area" options={LEAD_AREAS} emptyLabel="—" />
            <Select label="Tier" name="tier" options={[{ value: "A", label: "A — few reviews, start here" }, { value: "B", label: "B" }, { value: "C", label: "C — already many reviews" }]} emptyLabel="—" />
            <Field label="Next follow-up" name="next_follow_up" type="date" />
            <Field label="Contact person" name="contact_person" />
            <Field label="Phone" name="phone" />
            <Field label="Facebook page" name="facebook" placeholder="facebook.com/…" />
            <Field label="Google Maps link" name="maps_url" placeholder="maps.app.goo.gl/…" />
            <Field label="Address" name="address" className="sm:col-span-2" />
            <TextArea label="Notes" name="notes" className="sm:col-span-2" />
          </div>
          <SubmitButton>Add lead</SubmitButton>
        </form>

        <form action={bulkCreateLeads} className="card space-y-4">
          <h2 className="font-semibold">Paste many leads</h2>
          <p className="text-sm text-ink-weak">
            One business per line: <code className="rounded-md bg-surface-3 px-1.5">Name | Area | Category | Tier</code>. Only the name is required.
          </p>
          <TextArea
            label="Leads"
            name="bulk"
            rows={10}
            placeholder={"Sample Barbershop | Marikina | Barbershop | A\nSample Cafe | Cubao / QC | Cafe | B"}
          />
          <SubmitButton>Add all</SubmitButton>
        </form>
      </div>
    </div>
  );
}
