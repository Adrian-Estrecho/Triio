import Link from "next/link";
import { requireAdmin, check } from "@/lib/admin";
import { LEAD_STATUSES, ORDER_STATUSES, STARTING_CAPITAL, labelOf } from "@/lib/constants";
import { summarizeCosts, cardsInOrder } from "@/lib/metrics";
import type { Batch, Expense, Lead, Order } from "@/lib/types";
import { fmtDate, peso, todayISO } from "@/lib/utils";
import { Badge, Empty, PageHeader, Stat } from "@/components/admin/fields";
import { AlertList } from "@/components/admin/alerts";
import { computeAlerts } from "@/lib/automation/alerts";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const { supabase: db } = await requireAdmin();
  const today = todayISO();
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const monthStart = today.slice(0, 8) + "01";

  const [alerts, orders, expenses, batches, leads, taps, cards, outreach] = await Promise.all([
    computeAlerts(db),
    db.from("orders").select("*, customers(business_name)").order("created_at", { ascending: false }),
    db.from("expenses").select("*"),
    db.from("production_batches").select("*"),
    db.from("leads").select("*"),
    db.from("card_taps").select("id", { count: "exact", head: true }).gte("created_at", since),
    db.from("nfc_cards").select("id, status"),
    db.from("outreach").select("id, contacted_on, outcome").gte("contacted_on", monthStart),
  ]);

  const o = check(orders, "Orders") as Order[];
  const e = check(expenses, "Expenses") as Expense[];
  const b = check(batches, "Batches") as Batch[];
  const l = check(leads, "Leads") as Lead[];
  const c = check(cards, "Cards") as { id: string; status: string }[];
  const out = check(outreach, "Outreach") as { id: string; outcome: string | null }[];

  const live = o.filter((x) => x.status !== "cancelled");
  const revenue = live.reduce((s, x) => s + Number(x.amount_paid), 0);
  const billed = live.reduce((s, x) => s + Number(x.total), 0);
  const receivable = billed - revenue;
  const cost = summarizeCosts(e, b);
  const profit = revenue - cost.totalSpend;
  const capitalLeft = Math.max(STARTING_CAPITAL - cost.totalSpend + revenue, 0);
  const cardsSold = live.reduce((s, x) => s + cardsInOrder(x.product, x.quantity), 0);
  const openOrders = live.filter((x) => x.status !== "completed");
  const followUps = l
    .filter((x) => x.next_follow_up && x.next_follow_up <= today && !["won", "lost"].includes(x.status))
    .sort((a, z) => (a.next_follow_up ?? "").localeCompare(z.next_follow_up ?? ""));
  const won = l.filter((x) => x.status === "won").length;
  const worked = l.filter((x) => x.status !== "new").length;

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" subtitle={`Today is ${fmtDate(today)}`}>
        <Link href="/admin/leads" className="btn btn-ghost">+ Lead</Link>
        <Link href="/admin/orders?new=1" className="btn btn-primary">+ Order</Link>
      </PageHeader>

      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Needs attention</h2>
          <Link href="/admin/automations" className="text-xs font-semibold text-sky-700 hover:underline">Automations →</Link>
        </div>
        <AlertList alerts={alerts} maxItems={3} />
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Cash collected" value={peso(revenue)} sub={receivable > 0 ? `${peso(receivable)} still to collect` : "Nothing outstanding"} />
        <Stat label="Total spent" value={peso(cost.totalSpend)} sub={`${peso(cost.directSpend)} materials · ${peso(cost.operatingSpend)} other`} />
        <Stat
          label="Profit so far"
          value={<span className={profit >= 0 ? "text-emerald-600" : "text-red-600"}>{peso(profit)}</span>}
          sub={profit >= 0 ? "Starting capital recovered" : `${peso(-profit)} left to recover the ₱5,000`}
        />
        <Stat label="Cash on hand (est.)" value={peso(capitalLeft)} sub={`₱${STARTING_CAPITAL.toLocaleString()} start − spend + collected`} />
        <Stat label="Cards sold" value={cardsSold} sub={`${live.length} orders`} />
        <Stat
          label="Cost per sellable card"
          value={cost.costPerSellable !== null ? peso(cost.costPerSellable) : "—"}
          sub={cost.sellable ? `${cost.sellable} sellable of ${cost.attempted} made` : "Log a production batch in Costs"}
        />
        <Stat label="Card taps (30 days)" value={taps.count ?? 0} sub={`${c.filter((x) => x.status !== "disabled").length} active cards`} />
        <Stat label="Leads won" value={`${won}/${l.length}`} sub={worked ? `${Math.round((won / worked) * 100)}% of contacted leads` : "No outreach yet"} />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Follow-ups due</h2>
            <span className="text-xs text-ink-weak">{out.length} contacts logged this month</span>
          </div>
          {followUps.length ? (
            <table className="table">
              <tbody>
                {followUps.slice(0, 10).map((x) => (
                  <tr key={x.id}>
                    <td>
                      <Link href={`/admin/leads/${x.id}`} className="font-medium text-ink hover:underline">{x.business_name}</Link>
                      <div className="text-xs text-ink-weak">{x.area ?? "—"}</div>
                    </td>
                    <td><Badge value={x.status} label={labelOf(LEAD_STATUSES, x.status)} /></td>
                    <td className={x.next_follow_up! < today ? "text-red-600" : ""}>{fmtDate(x.next_follow_up)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty>No follow-ups due. Set a follow-up date when you log outreach.</Empty>
          )}
        </section>

        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Open orders</h2>
            <Link href="/admin/orders" className="text-xs font-semibold text-sky-700 hover:underline">All orders →</Link>
          </div>
          {openOrders.length ? (
            <table className="table">
              <tbody>
                {openOrders.slice(0, 10).map((x) => (
                  <tr key={x.id}>
                    <td>
                      <Link href={`/admin/orders/${x.id}`} className="font-medium text-ink hover:underline">#{x.order_no} · {x.customers?.business_name ?? "No customer"}</Link>
                      <div className="text-xs text-ink-weak">Due {fmtDate(x.due_date)}</div>
                    </td>
                    <td><Badge value={x.status} label={labelOf(ORDER_STATUSES, x.status)} /></td>
                    <td><Badge value={x.payment_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty>No open orders.</Empty>
          )}
        </section>
      </div>

      <section className="card">
        <h2 className="mb-4 font-semibold">Lead pipeline</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {LEAD_STATUSES.map((s) => (
            <Link key={s.value} href={`/admin/leads?status=${s.value}`} className="rounded-xl bg-white p-3 text-center transition-colors hover:bg-surface-3">
              <div className="text-2xl font-bold">{l.filter((x) => x.status === s.value).length}</div>
              <div className="text-xs text-ink-weak">{s.label}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
