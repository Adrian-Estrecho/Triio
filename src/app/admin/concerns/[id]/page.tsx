import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { CONCERN_STATUSES, CONCERN_TOPICS, labelOf } from "@/lib/constants";
import { emailConfigured } from "@/lib/email/send";
import type { Concern, EmailLog } from "@/lib/types";
import { Badge, Checkbox, PageHeader, Select, TextArea } from "@/components/admin/fields";
import { Flash } from "@/components/admin/flash";
import { SubmitButton } from "@/components/admin/ui";
import { deleteConcern, replyToConcern, saveConcernNotes, setConcernStatus } from "../../automations/actions";

type SP = Promise<{ msg?: string; err?: string }>;

const statusBadge: Record<string, string> = { open: "unpaid", in_progress: "partial", resolved: "paid" };

function when(ts: string) {
  return new Date(ts).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" });
}

export default async function ConcernPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const { id } = await params;
  const { msg, err } = await searchParams;
  const { supabase: db } = await requireAdmin();
  const { data: c } = await db.from("concerns").select("*").eq("id", id).maybeSingle<Concern>();
  if (!c) notFound();

  const [mailQ, customersQ, cardQ] = await Promise.all([
    db.from("email_log").select("*").eq("related_id", id).order("created_at"),
    db.from("customers").select("id, business_name").order("business_name"),
    c.card_code ? db.from("nfc_cards").select("id, card_code, status, card_type").eq("card_code", c.card_code).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const mail = (mailQ.data ?? []) as EmailLog[];
  const customers = (customersQ.data ?? []) as { id: string; business_name: string }[];
  const card = cardQ.data as { id: string; card_code: string; status: string; card_type: string } | null;
  const linked = customers.find((x) => x.id === c.customer_id);

  const nextStatus = c.status === "resolved" ? { value: "open", label: "Reopen" } : { value: "resolved", label: "Mark resolved" };

  return (
    <div className="space-y-6">
      <PageHeader title={`Concern #${c.ticket_no}`} subtitle={`${labelOf(CONCERN_TOPICS, c.topic)} · received ${when(c.created_at)}`}>
        <Link href="/admin/concerns" className="btn btn-ghost">← Concerns</Link>
        <form action={setConcernStatus}>
          <input type="hidden" name="id" value={c.id} />
          <input type="hidden" name="status" value={nextStatus.value} />
          <SubmitButton className={c.status === "resolved" ? "btn btn-ghost" : "btn btn-accent"}>{nextStatus.label}</SubmitButton>
        </form>
      </PageHeader>

      <Flash msg={msg} err={err} />

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-3">
          <section className="card space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">{c.business_name || c.name || c.email} wrote</h2>
              <Badge value={statusBadge[c.status]} label={labelOf(CONCERN_STATUSES, c.status)} />
            </div>
            <p className="whitespace-pre-line rounded-2xl bg-surface-2 p-4 text-sm leading-relaxed text-ink">{c.message}</p>
          </section>

          <section className="card">
            <h2 className="mb-3 font-semibold">Emails</h2>
            {mail.length ? (
              <ol className="space-y-4">
                {mail.map((m) => (
                  <li key={m.id} className="border-l-2 border-sky pl-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{m.kind === "concern_reply" ? "You replied" : m.kind === "concern_autoreply" ? "Automatic reply" : m.kind === "concern_alert" ? "Alert to you" : m.kind}</span>
                      <span className="text-ink-faint">· {when(m.created_at)}</span>
                      {m.status !== "sent" && <Badge value="unpaid" label={m.status} />}
                    </div>
                    {m.body && <p className="mt-1 whitespace-pre-line text-sm text-ink-weak">{m.body}</p>}
                    {m.error && <p className="mt-1 text-xs text-red-600">{m.error}</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-ink-weak">No emails yet.</p>
            )}
          </section>

          <form action={replyToConcern} className="card space-y-4">
            <h2 className="font-semibold">Reply by email</h2>
            <input type="hidden" name="id" value={c.id} />
            <TextArea label={`To ${c.email}`} name="message" rows={6} placeholder={`Hi${c.name ? ` ${c.name}` : ""}, thanks for letting us know…`} />
            <Checkbox name="resolve" label="This answers it: mark as resolved" />
            <div className="flex flex-wrap items-center gap-3">
              <SubmitButton pendingText="Sending…">Send reply</SubmitButton>
              {!emailConfigured() && <span className="text-xs text-red-600">Email isn&apos;t set up yet. Add RESEND_API_KEY.</span>}
              <a href={`mailto:${c.email}?subject=${encodeURIComponent(`Re: your Triio concern (ticket #${c.ticket_no})`)}`} className="text-xs font-semibold text-sky-700 hover:underline">
                or reply from your own email app
              </a>
            </div>
          </form>
        </div>

        <div className="space-y-6 xl:col-span-2">
          <section className="card space-y-2 text-sm">
            <h2 className="mb-2 font-semibold">Contact</h2>
            <p><span className="text-ink-weak">Name:</span> {c.name ?? "—"}</p>
            <p><span className="text-ink-weak">Business:</span> {c.business_name ?? "—"}</p>
            <p><span className="text-ink-weak">Email:</span> <a href={`mailto:${c.email}`} className="text-sky-700 hover:underline">{c.email}</a></p>
            <p><span className="text-ink-weak">Phone:</span> {c.phone ? <a href={`tel:${c.phone}`} className="text-sky-700 hover:underline">{c.phone}</a> : "—"}</p>
            <p>
              <span className="text-ink-weak">Card:</span>{" "}
              {card ? (
                <Link href={`/admin/cards/${card.id}`} className="font-mono text-sky-700 hover:underline">{card.card_code}</Link>
              ) : (
                c.card_code ?? "—"
              )}
              {card && <span className="text-ink-weak"> · {card.card_type}, {card.status}</span>}
              {c.card_code && !card && <span className="text-xs text-amber-700"> (no card with this code)</span>}
            </p>
            <p>
              <span className="text-ink-weak">Customer:</span>{" "}
              {linked ? <Link href={`/admin/customers/${linked.id}`} className="text-sky-700 hover:underline">{linked.business_name}</Link> : "not linked"}
            </p>
          </section>

          <form action={saveConcernNotes} className="card space-y-4">
            <h2 className="font-semibold">Internal</h2>
            <input type="hidden" name="id" value={c.id} />
            <Select label="Linked customer" name="customer_id" options={customers.map((x) => ({ value: x.id, label: x.business_name }))} defaultValue={c.customer_id} emptyLabel="— none —" />
            <TextArea label="Notes (only you see these)" name="admin_notes" defaultValue={c.admin_notes} rows={4} />
            <SubmitButton>Save</SubmitButton>
          </form>

          <form action={deleteConcern}>
            <input type="hidden" name="id" value={c.id} />
            <SubmitButton className="btn btn-danger" confirm="Delete this concern?">Delete concern</SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
