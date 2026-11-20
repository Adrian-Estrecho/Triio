import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, check } from "@/lib/admin";
import { CARD_STATUSES, LEAD_AREAS, ORDER_STATUSES, PRODUCTS, labelOf } from "@/lib/constants";
import type { Card, Customer, Order, Profile } from "@/lib/types";
import { peso } from "@/lib/utils";
import { Badge, Empty, Field, PageHeader, Select, TextArea } from "@/components/admin/fields";
import { SubmitButton } from "@/components/admin/ui";
import { createOrder, createProfile, deleteCustomer, updateCustomer } from "../../actions";
import { sendWelcomeNow } from "../../automations/actions";
import { Flash } from "@/components/admin/flash";
import { EMAIL_KINDS } from "@/lib/constants";
import type { EmailLog } from "@/lib/types";

export default async function CustomerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; err?: string }> }) {
  const { id } = await params;
  const { msg, err } = await searchParams;
  const { supabase: db } = await requireAdmin();
  const { data: c } = await db.from("customers").select("*").eq("id", id).maybeSingle<Customer>();
  if (!c) notFound();

  const [profiles, cards, orders, mail] = await Promise.all([
    db.from("profiles").select("id, display_name, slug, is_active").eq("customer_id", id),
    db.from("nfc_cards").select("id, card_code, card_type, label, status").eq("customer_id", id).order("created_at"),
    db.from("orders").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    c.email
      ? db.from("email_log").select("*").eq("to_email", c.email).order("created_at", { ascending: false }).limit(10)
      : Promise.resolve({ data: [] }),
  ]);
  const emails = (mail.data ?? []) as EmailLog[];
  const shortDate = (ts: string) => new Date(ts).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });
  const p = check(profiles, "Profiles") as Pick<Profile, "id" | "display_name" | "slug" | "is_active">[];
  const k = check(cards, "Cards") as Pick<Card, "id" | "card_code" | "card_type" | "label" | "status">[];
  const o = check(orders, "Orders") as Order[];

  return (
    <div className="space-y-6">
      <PageHeader title={c.business_name} subtitle={[c.contact_person, c.phone, c.area].filter(Boolean).join(" · ") || undefined}>
        <Link href="/admin/customers" className="btn btn-ghost">← Customers</Link>
        <Link href={`/admin/cards?customer=${c.id}&new=1`} className="btn btn-ghost">+ Card</Link>
      </PageHeader>

      <Flash msg={msg} err={err} />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Orders</h2>
            </div>
            {o.length ? (
              <table className="table">
                <tbody>
                  {o.map((x) => (
                    <tr key={x.id}>
                      <td><Link href={`/admin/orders/${x.id}`} className="font-medium hover:underline">#{x.order_no}</Link></td>
                      <td>{labelOf(PRODUCTS, x.product)} × {x.quantity}</td>
                      <td>{peso(x.total)}</td>
                      <td><Badge value={x.status} label={labelOf(ORDER_STATUSES, x.status)} /></td>
                      <td><Badge value={x.payment_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Empty>No orders yet.</Empty>
            )}
            <form action={createOrder} className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
              <input type="hidden" name="customer_id" value={c.id} />
              <Select label="New order" name="product" options={PRODUCTS.map((x) => ({ value: x.value, label: `${x.label} — ${peso(x.price)}` }))} />
              <Field label="Qty" name="quantity" type="number" defaultValue={1} className="w-20" />
              <SubmitButton>Create order</SubmitButton>
            </form>
          </section>

          <section className="card">
            <h2 className="mb-3 font-semibold">Digital profiles</h2>
            {p.length ? (
              <ul className="divide-y divide-line">
                {p.map((x) => (
                  <li key={x.id} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/admin/profiles/${x.id}`} className="font-medium hover:underline">{x.display_name}</Link>
                    <span className="text-ink-weak">/p/{x.slug} {x.is_active ? "" : "· inactive"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No profile yet — only needed for Profile cards.</Empty>
            )}
            <form action={createProfile} className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
              <input type="hidden" name="customer_id" value={c.id} />
              <Field label="New profile name" name="display_name" defaultValue={c.business_name} className="flex-1" />
              <SubmitButton>Create profile</SubmitButton>
            </form>
          </section>

          <section className="card">
            <h2 className="mb-3 font-semibold">NFC cards</h2>
            {k.length ? (
              <table className="table">
                <tbody>
                  {k.map((x) => (
                    <tr key={x.id}>
                      <td><Link href={`/admin/cards/${x.id}`} className="font-mono font-medium hover:underline">{x.card_code}</Link></td>
                      <td className="capitalize">{x.card_type}</td>
                      <td>{x.label ?? "—"}</td>
                      <td><Badge value={x.status} label={labelOf(CARD_STATUSES, x.status)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Empty>No cards yet.</Empty>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <form action={updateCustomer} className="card space-y-4">
            <h2 className="font-semibold">Details</h2>
            <input type="hidden" name="id" value={c.id} />
            <Field label="Business name" name="business_name" defaultValue={c.business_name} required />
            <Field label="Contact person" name="contact_person" defaultValue={c.contact_person} />
            <Field label="Phone" name="phone" defaultValue={c.phone} />
            <Field label="Email" name="email" type="email" defaultValue={c.email} />
            <Select label="Area" name="area" options={LEAD_AREAS} defaultValue={c.area} emptyLabel="—" />
            <Field label="Address" name="address" defaultValue={c.address} />
            <TextArea label="Notes" name="notes" defaultValue={c.notes} />
            <SubmitButton>Save</SubmitButton>
          </form>
          <section className="card space-y-3">
            <h2 className="font-semibold">Emails</h2>
            <p className="text-sm text-ink-weak">
              {c.welcome_sent_at
                ? `Welcome email sent ${shortDate(c.welcome_sent_at)}.`
                : c.email
                  ? "Welcome email not sent yet."
                  : "Add an email above to send welcome and order emails."}
            </p>
            {c.email && (
              <form action={sendWelcomeNow}>
                <input type="hidden" name="id" value={c.id} />
                <SubmitButton className="btn btn-ghost" pendingText="Sending…" confirm={c.welcome_sent_at ? "Send the welcome email again?" : undefined}>
                  {c.welcome_sent_at ? "Resend welcome email" : "Send welcome email"}
                </SubmitButton>
              </form>
            )}
            {emails.length > 0 && (
              <ul className="divide-y divide-line border-t border-line pt-1 text-xs">
                {emails.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 py-2">
                    <span className="truncate">{EMAIL_KINDS[e.kind] ?? e.kind}</span>
                    <span className={e.status === "sent" ? "text-ink-faint" : "text-red-600"}>{e.status === "sent" ? shortDate(e.created_at) : e.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <form action={deleteCustomer}>
            <input type="hidden" name="id" value={c.id} />
            <SubmitButton className="btn btn-danger" confirm="Delete this customer? Their orders, cards and profiles stay but are unlinked.">Delete customer</SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
