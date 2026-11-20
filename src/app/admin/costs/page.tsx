import { requireAdmin, check } from "@/lib/admin";
import { EXPENSE_CATEGORIES, PRODUCTS, labelOf } from "@/lib/constants";
import { summarizeCosts } from "@/lib/metrics";
import type { Batch, Expense } from "@/lib/types";
import { fmtDate, peso, todayISO } from "@/lib/utils";
import { Empty, Field, PageHeader, Select, Stat } from "@/components/admin/fields";
import { SubmitButton } from "@/components/admin/ui";
import { createBatch, createExpense, deleteBatch, deleteExpense } from "../actions";

export const metadata = { title: "Costs" };

export default async function CostsPage() {
  const { supabase: db } = await requireAdmin();
  const [expenses, batches] = await Promise.all([
    db.from("expenses").select("*").order("spent_on", { ascending: false }).order("created_at", { ascending: false }),
    db.from("production_batches").select("*").order("made_on", { ascending: false }),
  ]);
  const e = check(expenses, "Expenses") as Expense[];
  const b = check(batches, "Batches") as Batch[];
  const s = summarizeCosts(e, b);
  const perCard = s.costPerSellable ?? s.plannedMaterialCost;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Costs"
        subtitle="Log every purchase and every production batch. Cost per sellable card = material + printing + chips + packaging ÷ sellable cards."
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Actual cost / sellable card"
          value={s.costPerSellable !== null ? peso(s.costPerSellable) : "—"}
          sub={s.sellable ? `${peso(s.directSpend)} ÷ ${s.sellable} cards · drops as you use up leftover stock` : "Add a production batch below"}
        />
        <Stat
          label="Planned material cost / card"
          value={s.plannedMaterialCost !== null ? peso(s.plannedMaterialCost) : "—"}
          sub="From latest purchase ÷ cards it can make"
        />
        <Stat
          label="Defect rate"
          value={s.defectRate !== null ? `${Math.round(s.defectRate * 100)}%` : "—"}
          sub={s.attempted ? `${s.attempted - s.sellable} of ${s.attempted} failed` : "—"}
        />
        <Stat label="Time per card" value={s.minutesPerCard !== null ? `${Math.round(s.minutesPerCard)} min` : "—"} sub="Design + assemble + program + test" />
      </section>

      {perCard !== null && (
        <section className="card overflow-x-auto">
          <h2 className="mb-3 font-semibold">Margin per product at current cost</h2>
          <table className="table">
            <thead><tr><th>Product</th><th>Price</th><th>Cards</th><th>Card cost</th><th>Margin</th></tr></thead>
            <tbody>
              {PRODUCTS.filter((p) => p.price > 0).map((p) => {
                const cards = p.value === "barber_pack" ? 3 : 1;
                const c = cards * perCard;
                return (
                  <tr key={p.value}>
                    <td>{p.label}</td>
                    <td>{peso(p.price)}</td>
                    <td>{cards}</td>
                    <td>{peso(c)}</td>
                    <td className="font-semibold text-emerald-600">{peso(p.price - c)} <span className="text-xs font-normal text-ink-faint">({Math.round(((p.price - c) / p.price) * 100)}%)</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-ink-faint">Material cost only — your time, transport and marketing are tracked as other expenses.</p>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-4">
          <form action={createExpense} className="card space-y-4">
            <h2 className="font-semibold">Add expense</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date" name="spent_on" type="date" defaultValue={todayISO()} />
              <Select label="Category" name="category" options={EXPENSE_CATEGORIES} defaultValue="material" />
              <Field label="Description" name="description" required placeholder="PVC sheets (10 pcs)" className="sm:col-span-2" />
              <Field label="Amount (₱)" name="amount" type="number" required />
              <Field label="Quantity" name="quantity" type="number" />
              <Field label="Cards it can make" name="yield_cards" type="number" hint="e.g. 10 sheets × 5 = 50" className="sm:col-span-2" />
            </div>
            <SubmitButton>Add expense</SubmitButton>
          </form>

          <div className="card overflow-x-auto p-0">
            {e.length ? (
              <table className="table">
                <thead><tr><th>Date</th><th>Item</th><th>Amount</th><th></th></tr></thead>
                <tbody>
                  {e.map((x) => (
                    <tr key={x.id}>
                      <td className="whitespace-nowrap">{fmtDate(x.spent_on)}</td>
                      <td>
                        {x.description}
                        <div className="text-xs text-ink-weak">
                          {labelOf(EXPENSE_CATEGORIES, x.category)}
                          {x.yield_cards ? ` · makes ${x.yield_cards} cards (${peso(Number(x.amount) / x.yield_cards)}/card)` : ""}
                        </div>
                      </td>
                      <td>{peso(x.amount)}</td>
                      <td>
                        <form action={deleteExpense}>
                          <input type="hidden" name="id" value={x.id} />
                          <SubmitButton className="text-xs text-ink-faint hover:text-red-600" pendingText="…" confirm="Delete this expense?">Delete</SubmitButton>
                        </form>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={2} className="font-semibold">Total</td>
                    <td className="font-semibold">{peso(s.totalSpend)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            ) : (
              <div className="p-5"><Empty>No expenses yet.</Empty></div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <form action={createBatch} className="card space-y-4">
            <h2 className="font-semibold">Log a production batch</h2>
            <p className="text-sm text-ink-weak">Count only cards you would actually sell. Failed prints and dead chips go in “attempted”.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date" name="made_on" type="date" defaultValue={todayISO()} />
              <Field label="Minutes spent (total)" name="minutes_spent" type="number" />
              <Field label="Cards attempted" name="attempted" type="number" required />
              <Field label="Cards sellable" name="sellable" type="number" required />
              <Field label="Notes" name="notes" placeholder="2 chips dead, 1 misprint" className="sm:col-span-2" />
            </div>
            <SubmitButton>Add batch</SubmitButton>
          </form>

          <div className="card overflow-x-auto p-0">
            {b.length ? (
              <table className="table">
                <thead><tr><th>Date</th><th>Made</th><th>Sellable</th><th>Time</th><th></th></tr></thead>
                <tbody>
                  {b.map((x) => (
                    <tr key={x.id}>
                      <td className="whitespace-nowrap">{fmtDate(x.made_on)}<div className="text-xs text-ink-weak">{x.notes ?? ""}</div></td>
                      <td>{x.attempted}</td>
                      <td>{x.sellable}</td>
                      <td>{x.minutes_spent ? `${x.minutes_spent} min` : "—"}</td>
                      <td>
                        <form action={deleteBatch}>
                          <input type="hidden" name="id" value={x.id} />
                          <SubmitButton className="text-xs text-ink-faint hover:text-red-600" pendingText="…" confirm="Delete this batch?">Delete</SubmitButton>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-5"><Empty>No batches yet.</Empty></div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
