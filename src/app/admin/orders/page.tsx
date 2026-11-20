import Link from "next/link";
import { requireAdmin, check } from "@/lib/admin";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, PRODUCTS, labelOf } from "@/lib/constants";
import type { Order } from "@/lib/types";
import { fmtDate, peso } from "@/lib/utils";
import { Badge, Empty, Field, PageHeader, Select, TextArea } from "@/components/admin/fields";
import { AutoSubmitSelect, SubmitButton } from "@/components/admin/ui";
import { createOrder, setOrderStatus } from "../actions";

export const metadata = { title: "Orders" };

type SP = Promise<{ status?: string; view?: string }>;

export default async function OrdersPage({ searchParams }: { searchParams: SP }) {
  const { status, view } = await searchParams;
  const { supabase: db } = await requireAdmin();

  let q = db.from("orders").select("*, customers(business_name)").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const [orders, customers] = await Promise.all([q, db.from("customers").select("id, business_name").order("business_name")]);
  const list = check(orders, "Orders") as Order[];
  const cust = check(customers, "Customers") as { id: string; business_name: string }[];
  const board = view === "board";

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" subtitle="New → Awaiting payment → Designing → For approval → Production → Quality check → Ready → Completed">
        <Link href={board ? "/admin/orders" : "/admin/orders?view=board"} className="btn btn-ghost">{board ? "Table view" : "Board view"}</Link>
      </PageHeader>

      {board ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {ORDER_STATUSES.filter((s) => s.value !== "cancelled").map((s) => {
            const col = list.filter((o) => o.status === s.value);
            return (
              <div key={s.value} className="w-64 shrink-0 rounded-2xl bg-surface-2 p-3">
                <div className="mb-3 flex items-center justify-between text-sm font-semibold text-ink">
                  {s.label} <span className="text-ink-faint">{col.length}</span>
                </div>
                <div className="space-y-2">
                  {col.map((o) => (
                    <div key={o.id} className="rounded-xl bg-white p-3 text-sm ring-1 ring-black/5 transition-colors hover:ring-black/15">
                      <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">#{o.order_no} · {o.customers?.business_name ?? "No customer"}</Link>
                      <p className="text-xs text-ink-weak">{labelOf(PRODUCTS, o.product)} × {o.quantity} · {peso(o.total)}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <Badge value={o.payment_status} />
                        <form action={setOrderStatus}>
                          <input type="hidden" name="id" value={o.id} />
                          <AutoSubmitSelect name="status" defaultValue={o.status} className="cursor-pointer rounded-full bg-surface-3 px-2 py-1 text-xs font-medium">
                            {ORDER_STATUSES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                          </AutoSubmitSelect>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <form method="get" className="flex items-end gap-3">
              <div>
                <label className="label">Status</label>
                <AutoSubmitSelect className="input" name="status" defaultValue={status ?? ""}>
                  <option value="">All</option>
                  {ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </AutoSubmitSelect>
              </div>
            </form>
            <div className="card overflow-x-auto p-0">
              {list.length ? (
                <table className="table">
                  <thead><tr><th>Order</th><th>Product</th><th>Total</th><th>Paid</th><th>Status</th><th>Due</th></tr></thead>
                  <tbody>
                    {list.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link href={`/admin/orders/${o.id}`} className="font-medium text-ink hover:underline">#{o.order_no}</Link>
                          {o.source === "website" && <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">Website</span>}
                          <div className="text-xs text-ink-weak">{o.customers?.business_name ?? "No customer"}</div>
                        </td>
                        <td>{labelOf(PRODUCTS, o.product)} × {o.quantity}</td>
                        <td>{peso(o.total)}</td>
                        <td>
                          <Badge value={o.payment_status} />
                          {Number(o.amount_paid) > 0 && <div className="text-xs text-ink-weak">{peso(o.amount_paid)}</div>}
                        </td>
                        <td><Badge value={o.status} label={labelOf(ORDER_STATUSES, o.status)} /></td>
                        <td>{fmtDate(o.due_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-5"><Empty>No orders yet.</Empty></div>
              )}
            </div>
          </div>

          <form action={createOrder} className="card h-fit space-y-4">
            <h2 className="font-semibold">New order</h2>
            <Select label="Customer" name="customer_id" options={cust.map((c) => ({ value: c.id, label: c.business_name }))} emptyLabel="— choose —" />
            <Select label="Product" name="product" options={PRODUCTS.map((p) => ({ value: p.value, label: `${p.label} — ${peso(p.price)}` }))} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Quantity" name="quantity" type="number" defaultValue={1} />
              <Field label="Unit price" name="unit_price" type="number" hint="Blank = product price" />
              <Field label="Discount (₱)" name="discount" type="number" defaultValue={0} />
              <Field label="Due date" name="due_date" type="date" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Payment" name="payment_status" options={PAYMENT_STATUSES} defaultValue="unpaid" />
              <Field label="Amount paid" name="amount_paid" type="number" defaultValue={0} />
            </div>
            <Select label="Method" name="payment_method" options={PAYMENT_METHODS} emptyLabel="—" />
            <TextArea label="Notes" name="notes" placeholder="Design notes, colors, delivery…" />
            <SubmitButton>Create order</SubmitButton>
            {cust.length === 0 && <p className="text-xs text-amber-600">Tip: add the customer first (Customers page, or win a lead).</p>}
          </form>
        </div>
      )}
    </div>
  );
}
