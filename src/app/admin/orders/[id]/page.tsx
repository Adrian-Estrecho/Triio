import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, check } from "@/lib/admin";
import { CARD_STATUSES, ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, PRODUCTS, labelOf } from "@/lib/constants";
import { cardsInOrder, summarizeCosts } from "@/lib/metrics";
import type { Batch, Expense, Order } from "@/lib/types";
import { fmtDate, peso } from "@/lib/utils";
import { Badge, Empty, Field, PageHeader, Select, TextArea } from "@/components/admin/fields";
import { SubmitButton } from "@/components/admin/ui";
import { deleteOrder, setOrderStatus, updateOrder } from "../../actions";

const CHECKLIST = [
  "Business name spelling is correct",
  "Logo and colors match the approved proof",
  "NFC opens the right page on Android",
  "NFC opens the right page on iPhone",
  "QR code scans correctly",
  "Google review link opens the correct business",
  "Card surface and edges are clean",
  "Card code is linked to this order",
];

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase: db } = await requireAdmin();
  const { data: o } = await db.from("orders").select("*, customers(business_name)").eq("id", id).maybeSingle<Order>();
  if (!o) notFound();

  const [customers, cards, expenses, batches, orderExpenses] = await Promise.all([
    db.from("customers").select("id, business_name").order("business_name"),
    db.from("nfc_cards").select("id, card_code, card_type, label, status").eq("order_id", id).order("created_at"),
    db.from("expenses").select("*"),
    db.from("production_batches").select("*"),
    db.from("expenses").select("*").eq("order_id", id),
  ]);
  const cust = check(customers, "Customers") as { id: string; business_name: string }[];
  const linked = check(cards, "Cards") as { id: string; card_code: string; card_type: string; label: string | null; status: string }[];
  const cost = summarizeCosts(check(expenses, "Expenses") as Expense[], check(batches, "Batches") as Batch[]);
  const extra = (check(orderExpenses, "Order expenses") as Expense[]).reduce((s, e) => s + Number(e.amount), 0);

  const nCards = cardsInOrder(o.product, o.quantity);
  const perCard = cost.costPerSellable ?? cost.plannedMaterialCost ?? 0;
  const estCost = o.direct_cost !== null ? Number(o.direct_cost) : nCards * perCard + extra;
  const margin = Number(o.total) - estCost;
  const balance = Number(o.total) - Number(o.amount_paid);
  const idx = ORDER_STATUSES.findIndex((s) => s.value === o.status);
  const next = ORDER_STATUSES[idx + 1];

  return (
    <div className="space-y-6">
      <PageHeader title={`Order #${o.order_no}`} subtitle={`${o.customers?.business_name ?? "No customer"} · created ${fmtDate(o.created_at)}`}>
        <Link href="/admin/orders" className="btn btn-ghost">← Orders</Link>
        {next && next.value !== "cancelled" && (
          <form action={setOrderStatus}>
            <input type="hidden" name="id" value={o.id} />
            <input type="hidden" name="status" value={next.value} />
            <SubmitButton className="btn btn-accent">Move to: {next.label}</SubmitButton>
          </form>
        )}
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        {ORDER_STATUSES.filter((s) => s.value !== "cancelled").map((s, i) => (
          <span key={s.value} className={`rounded-full px-3 py-1 text-xs font-medium ${i <= idx && o.status !== "cancelled" ? "bg-navy text-white" : "bg-surface-3 text-ink-weak"}`}>
            {s.label}
          </span>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <form action={updateOrder} className="card space-y-4 xl:col-span-2">
          <h2 className="font-semibold">Order details</h2>
          <input type="hidden" name="id" value={o.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Customer" name="customer_id" options={cust.map((c) => ({ value: c.id, label: c.business_name }))} defaultValue={o.customer_id} emptyLabel="— none —" />
            <Select label="Product" name="product" options={PRODUCTS.map((p) => ({ value: p.value, label: p.label }))} defaultValue={o.product} />
            <Field label="Quantity" name="quantity" type="number" defaultValue={o.quantity} />
            <Field label="Unit price (₱)" name="unit_price" type="number" defaultValue={o.unit_price} />
            <Field label="Discount (₱)" name="discount" type="number" defaultValue={o.discount} />
            <Field label="Due date" name="due_date" type="date" defaultValue={o.due_date} />
            <Select label="Status" name="status" options={ORDER_STATUSES} defaultValue={o.status} />
            <Select label="Payment" name="payment_status" options={PAYMENT_STATUSES} defaultValue={o.payment_status} />
            <Field label="Amount paid (₱)" name="amount_paid" type="number" defaultValue={o.amount_paid} />
            <Select label="Method" name="payment_method" options={PAYMENT_METHODS} defaultValue={o.payment_method} emptyLabel="—" />
            <Field label="Actual direct cost (₱, optional)" name="direct_cost" type="number" defaultValue={o.direct_cost} hint="Leave blank to use the cost-per-card estimate." />
            <TextArea label="Notes" name="notes" defaultValue={o.notes} className="sm:col-span-2" />
          </div>
          <SubmitButton>Save order</SubmitButton>
        </form>

        <div className="space-y-6">
          <section className="card space-y-2 text-sm">
            <h2 className="mb-2 font-semibold">Money</h2>
            <Row label="Total" value={peso(o.total)} strong />
            <Row label="Paid" value={peso(o.amount_paid)} />
            <Row label="Balance" value={<span className={balance > 0 ? "text-red-600" : "text-emerald-600"}>{peso(balance)}</span>} />
            <hr className="border-line" />
            <Row label={`Est. cost (${nCards} card${nCards > 1 ? "s" : ""})`} value={peso(estCost)} />
            <Row label="Est. margin" value={<span className={margin >= 0 ? "text-emerald-600" : "text-red-600"}>{peso(margin)}</span>} strong />
            <p className="pt-1 text-xs text-ink-faint">
              {o.direct_cost !== null
                ? "Using the actual cost you entered."
                : cost.costPerSellable !== null
                  ? `Using ${peso(cost.costPerSellable)} per sellable card from your production log${extra ? ` + ${peso(extra)} expenses tagged to this order` : ""}.`
                  : "No production batches yet — using planned material cost from purchase yields."}
            </p>
          </section>

          <section className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Cards for this order</h2>
              <Link href={`/admin/cards?new=1&order=${o.id}${o.customer_id ? `&customer=${o.customer_id}` : ""}`} className="text-xs font-semibold text-sky-700 hover:underline">+ Create</Link>
            </div>
            {linked.length ? (
              <ul className="space-y-1 text-sm">
                {linked.map((c) => (
                  <li key={c.id} className="flex items-center justify-between">
                    <Link href={`/admin/cards/${c.id}`} className="font-mono hover:underline">{c.card_code}</Link>
                    <span className="text-xs text-ink-weak">{c.label ?? c.card_type}</span>
                    <Badge value={c.status} label={labelOf(CARD_STATUSES, c.status)} />
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No cards linked yet ({nCards} needed).</Empty>
            )}
          </section>

          <section className="card">
            <h2 className="mb-3 font-semibold">Quality check before delivery</h2>
            <ul className="space-y-2 text-sm text-ink">
              {CHECKLIST.map((item) => (
                <li key={item}>
                  <label className="flex items-start gap-2">
                    <input type="checkbox" className="mt-0.5 h-4 w-4 accent-sky-600" /> {item}
                  </label>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-faint">Checklist resets on reload. Move the order to “Quality check” when done.</p>
          </section>

          <form action={deleteOrder}>
            <input type="hidden" name="id" value={o.id} />
            <SubmitButton className="btn btn-danger" confirm="Delete this order? Linked cards stay but are unlinked.">Delete order</SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-weak">{label}</span>
      <span className={strong ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
