import Link from "next/link";
import { requireAdmin, check } from "@/lib/admin";
import { LEAD_AREAS } from "@/lib/constants";
import type { Customer } from "@/lib/types";
import { fmtDate, matches } from "@/lib/utils";
import { Badge, Empty, Field, PageHeader, Select, TextArea } from "@/components/admin/fields";
import { DialogButton } from "@/components/admin/dialog";
import { Icon } from "@/components/admin/icons";
import { PillTabs } from "@/components/admin/tabs";
import { SearchBox } from "@/components/admin/search";
import { SubmitButton } from "@/components/admin/ui";
import { createCustomer } from "../actions";

export const metadata = { title: "Customers" };

type Tab = "business" | "users";

type PersonalProfile = { id: string; display_name: string; slug: string; owner_id: string | null; is_active: boolean; created_at: string };
type PersonalCard = {
  id: string;
  card_code: string;
  owner_name: string | null;
  label: string | null;
  profile_id: string | null;
  status: string;
  created_at: string;
};
type Owner = { user_id: string; email: string; last_sign_in_at: string | null };

/** One row in the Users table: a buyer who set up their card, or a sold card still waiting for setup. */
type UserRow = {
  key: string;
  name: string;
  href: string;
  email: string | null;
  lastSeen: string | null;
  cards: PersonalCard[];
  status: "active" | "waiting" | "off";
  since: string;
};

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const { tab: tabParam, q } = await searchParams;
  const tab: Tab = tabParam === "users" ? "users" : "business";
  const { supabase: db } = await requireAdmin();

  const [customersRes, profilesRes, cardsRes, ownersRes] = await Promise.all([
    db.from("customers").select("*").order("created_at", { ascending: false }),
    db.from("profiles").select("id, display_name, slug, owner_id, is_active, created_at").eq("kind", "personal"),
    db.from("nfc_cards").select("id, card_code, owner_name, label, profile_id, status, created_at").eq("card_type", "personal").order("created_at"),
    db.rpc("admin_card_owners"),
  ]);
  const customers = check(customersRes, "Customers") as Customer[];
  const profiles = check(profilesRes, "Users") as PersonalProfile[];
  const cards = check(cardsRes, "Personal cards") as PersonalCard[];
  // If the email lookup isn't available (database not updated yet), still show users without emails.
  const owners = new Map(((ownersRes.data ?? []) as Owner[]).map((o) => [o.user_id, o]));

  const users: UserRow[] = [
    ...profiles.map((p): UserRow => {
      const owner = p.owner_id ? owners.get(p.owner_id) : undefined;
      return {
        key: p.id,
        name: p.display_name,
        href: `/admin/profiles/${p.id}`,
        email: owner?.email ?? null,
        lastSeen: owner?.last_sign_in_at ?? null,
        cards: cards.filter((c) => c.profile_id === p.id),
        status: p.is_active ? "active" : "off",
        since: p.created_at,
      };
    }),
    ...cards
      .filter((c) => !c.profile_id)
      .map((c): UserRow => ({
        key: c.id,
        name: c.owner_name ?? "Unnamed buyer",
        href: `/admin/cards/${c.id}`,
        email: null,
        lastSeen: null,
        cards: [c],
        status: "waiting",
        since: c.created_at,
      })),
  ].sort((a, b) => b.since.localeCompare(a.since));

  const waiting = users.filter((u) => u.status === "waiting").length;

  const bizShown = customers.filter((c) => matches(q, c.business_name, c.contact_person, c.phone, c.email, c.area, c.address));
  const usersShown = users.filter((u) => matches(q, u.name, u.email, ...u.cards.flatMap((c) => [c.card_code, c.label, c.owner_name])));
  const qs = q ? `q=${encodeURIComponent(q)}` : "";
  const noMatch = <>No matches for “{q}”.</>;

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" subtitle="Businesses you sell to, and people who bought a personal card.">
        <Link href="/admin/cards?tab=users&new=1" className="btn btn-ghost">
          <Icon name="cards" className="h-[18px] w-[18px]" /> New card for a buyer
        </Link>
        <DialogButton
          title="Add business"
          label={
            <>
              <Icon name="plus" className="h-[18px] w-[18px]" /> Add business
            </>
          }
        >
          <form action={createCustomer} className="space-y-4">
            <Field label="Business name" name="business_name" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact person" name="contact_person" />
              <Field label="Phone" name="phone" />
              <Field label="Email" name="email" type="email" />
              <Select label="Area" name="area" options={LEAD_AREAS} emptyLabel="—" />
            </div>
            <Field label="Address" name="address" />
            <TextArea label="Notes" name="notes" />
            <SubmitButton className="btn btn-primary w-full">Add business</SubmitButton>
          </form>
        </DialogButton>
      </PageHeader>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PillTabs
          label="Customer type"
          tabs={[
            { href: `/admin/customers${qs ? `?${qs}` : ""}`, label: "Business", count: bizShown.length, active: tab === "business" },
            { href: `/admin/customers?tab=users${qs ? `&${qs}` : ""}`, label: "Users", count: usersShown.length, active: tab === "users" },
          ]}
        />
        <SearchBox
          placeholder={tab === "users" ? "Search name, email, card code, order no." : "Search business, contact, phone, area"}
          className="w-full sm:w-80"
        />
      </div>

      {tab === "business" ? (
        <div className="card overflow-x-auto p-0">
          {bizShown.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Contact</th>
                  <th>Area</th>
                  <th>Since</th>
                </tr>
              </thead>
              <tbody>
                {bizShown.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link className="font-medium text-ink hover:underline" href={`/admin/customers/${c.id}`}>
                        {c.business_name}
                      </Link>
                    </td>
                    <td>
                      {c.contact_person ?? "—"}
                      <div className="text-xs text-ink-weak">{c.phone ?? ""}</div>
                    </td>
                    <td>{c.area ?? "—"}</td>
                    <td>{fmtDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-5">
              <Empty>{q ? noMatch : <>No businesses yet. Click “Add business”, or win a lead to add one automatically.</>}</Empty>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-ink-weak">
            Everyone who bought a <b className="text-ink">personal card</b> (Shopee, Lazada, TikTok Shop or the website).
            {waiting > 0 && (
              <>
                {" "}
                <b className="text-ink">{waiting}</b> {waiting === 1 ? "card hasn’t" : "cards haven’t"} been set up yet.
              </>
            )}
          </p>
          <div className="card overflow-x-auto p-0">
            {usersShown.length ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Login email</th>
                    <th>Card</th>
                    <th>Status</th>
                    <th>Since</th>
                  </tr>
                </thead>
                <tbody>
                  {usersShown.map((u) => (
                    <tr key={u.key}>
                      <td>
                        <Link className="font-medium text-ink hover:underline" href={u.href}>
                          {u.name}
                        </Link>
                      </td>
                      <td>
                        {u.email ?? <span className="text-ink-faint">—</span>}
                        {u.lastSeen && <div className="text-xs text-ink-weak">Last login {fmtDate(u.lastSeen)}</div>}
                      </td>
                      <td>
                        {u.cards.length ? (
                          u.cards.map((c) => (
                            <div key={c.id}>
                              <Link href={`/admin/cards/${c.id}`} className="font-mono font-semibold text-ink hover:underline">
                                {c.card_code}
                              </Link>
                              {c.label && <span className="ml-1.5 text-xs text-ink-weak">{c.label}</span>}
                            </div>
                          ))
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                      <td>
                        {u.status === "active" ? (
                          <Badge value="delivered" label="Active" />
                        ) : u.status === "waiting" ? (
                          <Badge value="pending" label="Waiting for setup" />
                        ) : (
                          <Badge value="disabled" label="Turned off" />
                        )}
                      </td>
                      <td>{fmtDate(u.since)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-5">
                <Empty>{q ? noMatch : <>No users yet. Create a personal card for a buyer, and they’ll show up here.</>}</Empty>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
