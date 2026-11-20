import Link from "next/link";
import { requireAdmin, check } from "@/lib/admin";
import type { Profile } from "@/lib/types";
import { fmtDate, isSafeHttpUrl, matches } from "@/lib/utils";
import { Empty, Field, PageHeader, Select } from "@/components/admin/fields";
import { DialogButton } from "@/components/admin/dialog";
import { Icon } from "@/components/admin/icons";
import { PillTabs } from "@/components/admin/tabs";
import { SearchBox } from "@/components/admin/search";
import { SubmitButton } from "@/components/admin/ui";
import { createProfile } from "../actions";

export const metadata = { title: "Profiles" };

type Row = Profile & { customers: { business_name: string } | null };
type Owner = { user_id: string; email: string };

function Swatch({ p }: { p: Row }) {
  return p.logo_url && isSafeHttpUrl(p.logo_url) ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.logo_url} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
  ) : (
    <span className="h-8 w-8 shrink-0 rounded-lg" style={{ background: p.accent_color }} />
  );
}

function Name({ p }: { p: Row }) {
  return (
    <div className="flex items-center gap-3">
      <Swatch p={p} />
      <div className="min-w-0">
        <Link href={`/admin/profiles/${p.id}`} className="font-medium text-ink hover:underline">
          {p.display_name}
        </Link>
        <div className="text-xs text-ink-weak">/p/{p.slug}</div>
      </div>
    </div>
  );
}

function Live({ on }: { on: boolean }) {
  return on ? <span className="text-emerald-600">Live</span> : <span className="text-ink-faint">Off</span>;
}

export default async function ProfilesPage({ searchParams }: { searchParams: Promise<{ tab?: string; new?: string; q?: string }> }) {
  const { tab: tabParam, new: openNew, q } = await searchParams;
  const tab = tabParam === "users" ? "users" : "business";
  const { supabase: db } = await requireAdmin();

  const [profiles, customers, cards, ownersRes] = await Promise.all([
    db.from("profiles").select("*, customers(business_name)").order("updated_at", { ascending: false }),
    db.from("customers").select("id, business_name").order("business_name"),
    db.from("nfc_cards").select("id, card_code, profile_id").not("profile_id", "is", null),
    db.rpc("admin_card_owners"),
  ]);
  const all = check(profiles, "Profiles") as Row[];
  const cust = check(customers, "Customers") as { id: string; business_name: string }[];
  const linked = (cards.data ?? []) as { id: string; card_code: string; profile_id: string }[];
  const owners = new Map(((ownersRes.data ?? []) as Owner[]).map((o) => [o.user_id, o.email]));

  const cardsOf = (id: string) => linked.filter((c) => c.profile_id === id);
  const found = all.filter((p) =>
    matches(
      q,
      p.display_name,
      p.slug,
      p.tagline,
      p.phone,
      p.email,
      p.customers?.business_name,
      p.owner_id ? owners.get(p.owner_id) : null,
      ...cardsOf(p.id).map((c) => c.card_code)
    )
  );
  const business = found.filter((p) => p.kind !== "personal");
  const users = found.filter((p) => p.kind === "personal");
  const qs = q ? `q=${encodeURIComponent(q)}` : "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Digital profiles"
        subtitle="What a tap opens. Business profiles you build for clients; user profiles are made by buyers of personal cards."
      >
        <DialogButton
          title="New business profile"
          defaultOpen={openNew === "1"}
          label={
            <>
              <Icon name="plus" className="h-[18px] w-[18px]" /> Add profile
            </>
          }
        >
          <form action={createProfile} className="space-y-4">
            <Field label="Business / display name" name="display_name" required />
            <Field label="Link name (optional)" name="slug" hint="Becomes /p/your-name. Leave blank to auto-generate." />
            <Select label="Customer" name="customer_id" options={cust.map((c) => ({ value: c.id, label: c.business_name }))} emptyLabel="— none —" />
            <SubmitButton className="btn btn-primary w-full">Create & edit</SubmitButton>
            <p className="text-xs text-ink-faint">For a marketplace buyer, don’t make a profile here. Create a personal card instead; they set up their own.</p>
          </form>
        </DialogButton>
      </PageHeader>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PillTabs
          label="Profile type"
          tabs={[
            { href: `/admin/profiles${qs ? `?${qs}` : ""}`, label: "Business", count: business.length, active: tab === "business" },
            { href: `/admin/profiles?tab=users${qs ? `&${qs}` : ""}`, label: "Users", count: users.length, active: tab === "users" },
          ]}
        />
        <SearchBox placeholder={tab === "users" ? "Search name, email, card code" : "Search name, link, customer, phone"} className="w-full sm:w-80" />
      </div>

      {tab === "business" ? (
        <div className="card overflow-x-auto p-0">
          {business.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Profile</th>
                  <th>Customer</th>
                  <th>Cards</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {business.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Name p={p} />
                    </td>
                    <td>{p.customers?.business_name ?? "—"}</td>
                    <td className="tabular-nums">{cardsOf(p.id).length}</td>
                    <td>
                      <Live on={p.is_active} />
                    </td>
                    <td>{fmtDate(p.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-5">
              <Empty>{q ? <>No matches for “{q}”.</> : <>No business profiles yet. Click “Add profile”.</>}</Empty>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-ink-weak">Made and edited by the buyers themselves. You can view them; only change one if the owner asks you to.</p>
          <div className="card overflow-x-auto p-0">
            {users.length ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Profile</th>
                    <th>Login email</th>
                    <th>Card</th>
                    <th>Status</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Name p={p} />
                      </td>
                      <td>{(p.owner_id && owners.get(p.owner_id)) ?? <span className="text-ink-faint">—</span>}</td>
                      <td>
                        {cardsOf(p.id).length ? (
                          cardsOf(p.id).map((c) => (
                            <Link key={c.id} href={`/admin/cards/${c.id}`} className="block font-mono font-semibold text-ink hover:underline">
                              {c.card_code}
                            </Link>
                          ))
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                      <td>
                        <Live on={p.is_active} />
                      </td>
                      <td>{fmtDate(p.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-5">
                <Empty>{q ? <>No matches for “{q}”.</> : <>No user profiles yet. They appear when a buyer sets up their personal card.</>}</Empty>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
