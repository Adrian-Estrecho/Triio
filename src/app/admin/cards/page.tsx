import Link from "next/link";
import { requireAdmin, check } from "@/lib/admin";
import { CARD_STATUSES, labelOf } from "@/lib/constants";
import { cardUrl } from "@/lib/env";
import type { Card, CardType } from "@/lib/types";
import { Badge, Empty, Field, PageHeader, Select } from "@/components/admin/fields";
import { CardTypePicker, CardTypeScope, OnlyFor } from "@/components/admin/card-type";
import { DialogButton } from "@/components/admin/dialog";
import { Icon } from "@/components/admin/icons";
import { PillTabs } from "@/components/admin/tabs";
import { SearchBox } from "@/components/admin/search";
import { matches } from "@/lib/utils";
import { AutoSubmitSelect, SubmitButton } from "@/components/admin/ui";
import { createCards } from "../actions";

export const metadata = { title: "NFC cards" };

type SP = Promise<{ status?: string; customer?: string; order?: string; type?: string; tab?: string; new?: string; q?: string }>;

export default async function CardsPage({ searchParams }: { searchParams: SP }) {
  const { status, customer, order, type, tab: tabParam, new: openNew, q } = await searchParams;
  const tab = tabParam === "users" || type === "personal" ? "users" : "business";
  // The create form starts on Personal in the Users tab, otherwise on the type in the link (or Review).
  const newType: CardType = tab === "users" ? "personal" : type === "profile" || type === "link" ? type : "review";
  const { supabase: db } = await requireAdmin();

  let query = db.from("nfc_cards").select("*, customers(business_name), profiles(display_name, slug)").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  if (customer) query = query.eq("customer_id", customer);
  const [cards, customers, profiles, orders, taps] = await Promise.all([
    query,
    db.from("customers").select("id, business_name").order("business_name"),
    db.from("profiles").select("id, display_name").neq("kind", "personal").order("display_name"),
    db.from("orders").select("id, order_no, customers(business_name)").neq("status", "cancelled").order("order_no", { ascending: false }),
    db.from("card_taps").select("card_id"),
  ]);
  const list = check(cards, "Cards") as Card[];
  const cust = check(customers, "Customers") as { id: string; business_name: string }[];
  const prof = check(profiles, "Profiles") as { id: string; display_name: string }[];
  const ords = check(orders, "Orders") as unknown as { id: string; order_no: number; customers: { business_name: string } | null }[];
  const tapCount = new Map<string, number>();
  for (const t of (taps.data ?? []) as { card_id: string }[]) tapCount.set(t.card_id, (tapCount.get(t.card_id) ?? 0) + 1);

  const found = list.filter((c) =>
    matches(q, c.card_code, c.label, c.owner_name, c.profiles?.display_name, c.profiles?.slug, c.customers?.business_name, c.destination_url, c.card_type)
  );
  const business = found.filter((c) => c.card_type !== "personal");
  const users = found.filter((c) => c.card_type === "personal");
  const waiting = users.filter((c) => !c.profile_id).length;

  // Tab links keep the current filters.
  const tabHref = (t: "business" | "users") => {
    const p = new URLSearchParams();
    if (t === "users") p.set("tab", "users");
    if (status) p.set("status", status);
    if (customer) p.set("customer", customer);
    if (q) p.set("q", q);
    const s = p.toString();
    return `/admin/cards${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="NFC cards" subtitle="Each card has a permanent code. Write its URL to the chip once — change where it goes anytime here.">
        <DialogButton
          title="Create cards"
          defaultOpen={openNew === "1"}
          label={
            <>
              <Icon name="plus" className="h-[18px] w-[18px]" /> Create cards
            </>
          }
        >
          <form action={createCards} className="flex flex-col gap-4">
            <CardTypeScope defaultType={newType}>
              <CardTypePicker />

              <OnlyFor types={["review", "link"]}>
                <Field
                  label="Link the card opens"
                  name="destination_url"
                  placeholder="https://g.page/r/…/review"
                  hint="Review card: Google Business Profile → Ask for reviews → copy the link. Link card: any https:// link."
                />
              </OnlyFor>
              <OnlyFor types={["profile"]}>
                <Select label="Profile" name="profile_id" options={prof.map((p) => ({ value: p.id, label: p.display_name }))} emptyLabel="— choose —" />
              </OnlyFor>
              <OnlyFor types={["personal"]}>
                <Field
                  label="Buyer name"
                  name="owner_name"
                  placeholder="Maria Santos"
                  hint="From the Shopee / Lazada / TikTok order. The card greets them by name when they set it up."
                />
              </OnlyFor>
              <OnlyFor types={["review", "profile", "link"]}>
                <Select
                  label="Customer"
                  name="customer_id"
                  options={cust.map((c) => ({ value: c.id, label: c.business_name }))}
                  defaultValue={customer}
                  emptyLabel="— none —"
                />
              </OnlyFor>

              <Field label="Label" name="label" placeholder="Order no., or Counter / Chair" hint="Several cards are numbered: Chair 1, Chair 2…" />
              <Select
                label="Order (optional)"
                name="order_id"
                options={ords.map((o) => ({ value: o.id, label: `#${o.order_no} ${o.customers?.business_name ?? ""}` }))}
                defaultValue={order}
                emptyLabel="— none —"
              />
              <div className="grid grid-cols-2 gap-4">
                <Field label="How many" name="count" type="number" defaultValue={1} />
                <OnlyFor types={["review", "profile", "link"]}>
                  <Select label="Chip" name="chip_type" options={["NTAG213", "NTAG215", "NTAG216"]} defaultValue="NTAG213" />
                </OnlyFor>
              </div>
            </CardTypeScope>
            <SubmitButton className="btn btn-primary w-full">Create</SubmitButton>
            <p className="text-xs text-ink-faint">Card URL format: {cardUrl("ABC234")}</p>
          </form>
        </DialogButton>
      </PageHeader>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <PillTabs
          label="Card type"
          tabs={[
            { href: tabHref("business"), label: "Business", count: business.length, active: tab === "business" },
            { href: tabHref("users"), label: "Users", count: users.length, active: tab === "users" },
          ]}
        />
        <div className="flex w-full flex-wrap items-end gap-3 sm:w-auto">
          <SearchBox placeholder={tab === "users" ? "Search code, buyer, order no." : "Search code, label, customer, profile"} className="w-full sm:w-72" />
          <form method="get" className="flex flex-wrap items-end gap-3">
            {tab === "users" && <input type="hidden" name="tab" value="users" />}
            {customer && <input type="hidden" name="customer" value={customer} />}
            {q && <input type="hidden" name="q" value={q} />}
            <div>
              <label className="label" htmlFor="status-filter">
                Status
              </label>
              <AutoSubmitSelect id="status-filter" className="input" name="status" defaultValue={status ?? ""}>
                <option value="">All</option>
                {CARD_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </AutoSubmitSelect>
            </div>
            {(status || customer) && (
              <Link href={tab === "users" ? "/admin/cards?tab=users" : "/admin/cards"} className="btn btn-ghost">
                Clear filters
              </Link>
            )}
          </form>
        </div>
      </div>

      {tab === "business" ? (
        <div className="card overflow-x-auto p-0">
          {business.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Opens</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Taps</th>
                </tr>
              </thead>
              <tbody>
                {business.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/admin/cards/${c.id}`} className="font-mono font-semibold text-ink hover:underline">
                        {c.card_code}
                      </Link>
                      <div className="text-xs text-ink-weak">{c.label ?? ""}</div>
                    </td>
                    <td className="max-w-64">
                      <span className="capitalize">{c.card_type}</span>
                      <div className="truncate text-xs text-ink-weak">
                        {c.card_type === "profile" ? (c.profiles?.display_name ?? "⚠ no profile") : (c.destination_url ?? "⚠ no link")}
                      </div>
                    </td>
                    <td>{c.customers?.business_name ?? "—"}</td>
                    <td>
                      <Badge value={c.status} label={labelOf(CARD_STATUSES, c.status)} />
                    </td>
                    <td className="tabular-nums">{tapCount.get(c.id) ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-5">
              <Empty>{q || status ? "No business cards match your search or filter." : "No business cards yet. Click “Create cards”."}</Empty>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-ink-weak">
            Personal cards for buyers (Shopee, Lazada, TikTok Shop, website).
            {waiting > 0 && (
              <>
                {" "}
                <b className="text-ink">{waiting}</b> waiting for the buyer to set up.
              </>
            )}
          </p>
          <div className="card overflow-x-auto p-0">
            {users.length ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Buyer</th>
                    <th>Setup</th>
                    <th>Card status</th>
                    <th>Taps</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/admin/cards/${c.id}`} className="font-mono font-semibold text-ink hover:underline">
                          {c.card_code}
                        </Link>
                        <div className="text-xs text-ink-weak">{c.label ?? ""}</div>
                      </td>
                      <td className="max-w-64">
                        {c.profile_id ? (
                          <Link href={`/admin/profiles/${c.profile_id}`} className="font-medium text-ink hover:underline">
                            {c.profiles?.display_name ?? c.owner_name ?? "Profile"}
                          </Link>
                        ) : (
                          (c.owner_name ?? <span className="text-ink-faint">No name</span>)
                        )}
                        {c.profiles?.slug && <div className="truncate text-xs text-ink-weak">/p/{c.profiles.slug}</div>}
                      </td>
                      <td>
                        {c.profile_id ? (
                          <Badge value="delivered" label="Set up" />
                        ) : (c.claim_attempts ?? 0) >= 10 ? (
                          <Badge value="disabled" label="Locked" />
                        ) : (
                          <Badge value="pending" label="Waiting" />
                        )}
                      </td>
                      <td>
                        <Badge value={c.status} label={labelOf(CARD_STATUSES, c.status)} />
                      </td>
                      <td className="tabular-nums">{tapCount.get(c.id) ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-5">
                <Empty>
                  {q || status ? "No personal cards match your search or filter." : "No personal cards yet. Click “Create cards” and choose Personal."}
                </Empty>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
