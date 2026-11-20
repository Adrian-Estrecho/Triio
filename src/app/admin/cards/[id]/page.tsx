import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requireAdmin, check } from "@/lib/admin";
import { CARD_STATUSES, labelOf } from "@/lib/constants";
import { cardUrl } from "@/lib/env";
import type { Card } from "@/lib/types";
import { NTAG213_BYTES, fmtDate, ndefBytes } from "@/lib/utils";
import { Badge, Checkbox, Field, PageHeader, Select } from "@/components/admin/fields";
import { CopyButton, SubmitButton } from "@/components/admin/ui";
import { CardTypePicker, CardTypeScope, OnlyFor } from "@/components/admin/card-type";
import { deleteCard, resetCardSetup, setCardStatus, updateCard } from "../../actions";

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase: db } = await requireAdmin();
  const { data: card } = await db
    .from("nfc_cards")
    .select("*, customers(business_name), profiles(display_name, slug)")
    .eq("id", id)
    .maybeSingle<Card>();
  if (!card) notFound();

  const [customers, profiles, orders, taps, recent] = await Promise.all([
    db.from("customers").select("id, business_name").order("business_name"),
    db.from("profiles").select("id, display_name").neq("kind", "personal").order("display_name"),
    db.from("orders").select("id, order_no, customers(business_name)").order("order_no", { ascending: false }),
    db.from("card_taps").select("id", { count: "exact", head: true }).eq("card_id", id),
    db.from("card_taps").select("created_at").eq("card_id", id).order("created_at", { ascending: false }).limit(5),
  ]);
  const cust = check(customers, "Customers") as { id: string; business_name: string }[];
  const prof = check(profiles, "Profiles") as { id: string; display_name: string }[];
  const ords = check(orders, "Orders") as unknown as { id: string; order_no: number; customers: { business_name: string } | null }[];
  const lastTaps = (recent.data ?? []) as { created_at: string }[];

  const url = cardUrl(card.card_code);
  const qrPng = await QRCode.toDataURL(url, { width: 1024, margin: 2, errorCorrectionLevel: "M" });
  const qrSvg = await QRCode.toString(url, { type: "svg", margin: 2, errorCorrectionLevel: "M" });
  const bytes = ndefBytes(url);

  const steps: { status: string; label: string }[] = [
    { status: "programmed", label: "Mark programmed" },
    { status: "tested", label: "Mark tested" },
    { status: "delivered", label: "Mark delivered" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={`Card ${card.card_code}`} subtitle={[card.label, card.customers?.business_name].filter(Boolean).join(" · ") || undefined}>
        <Link href="/admin/cards" className="btn btn-ghost">← Cards</Link>
        <a href={`/c/${card.card_code}`} target="_blank" rel="noreferrer" className="btn btn-accent">Test tap</a>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <section className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Write this to the chip</h2>
            <Badge value={card.status} label={labelOf(CARD_STATUSES, card.status)} />
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-navy px-3 py-2">
            <code className="flex-1 break-all text-sm text-sky-200">{url}</code>
            <CopyButton text={url} />
          </div>
          <p className={`text-xs ${bytes <= NTAG213_BYTES ? "text-emerald-600" : "text-red-600"}`}>
            ≈ {bytes} bytes — {bytes <= NTAG213_BYTES ? `fits ${card.chip_type}` : "too long for NTAG213, use a shorter SITE_URL or NTAG215"}
          </p>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrPng} alt={`QR code for ${url}`} className="mx-auto w-56 rounded-lg border border-line" />
          <div className="flex justify-center gap-2">
            <a href={qrPng} download={`triio-${card.card_code}.png`} className="btn btn-ghost text-xs">Download PNG</a>
            <a href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`} download={`triio-${card.card_code}.svg`} className="btn btn-ghost text-xs">
              Download SVG (for print)
            </a>
          </div>

          <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-weak">
            <li>Open the free <b>NFC Tools</b> app (Android or iPhone).</li>
            <li>Write → Add a record → <b>URL / URI</b> → paste the link above.</li>
            <li>Tap Write and hold the card on the back of the phone.</li>
            <li>Tap the card with another phone to test, then mark it below.</li>
            <li>Only lock the chip (Other → Lock tag) after the customer approves. Locking can&apos;t be undone.</li>
          </ol>

          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            {steps.map((s) => (
              <form key={s.status} action={setCardStatus}>
                <input type="hidden" name="id" value={card.id} />
                <input type="hidden" name="status" value={s.status} />
                <SubmitButton className={`btn ${card.status === s.status ? "btn-accent" : "btn-ghost"} text-xs`} pendingText="…">{s.label}</SubmitButton>
              </form>
            ))}
          </div>

          {card.card_type === "personal" && (
            <div className="space-y-3 rounded-xl bg-white p-3 text-sm">
              {card.profile_id ? (
                <>
                  <p>
                    Set up by its owner →{" "}
                    <Link href={`/admin/profiles/${card.profile_id}`} className="link">{card.profiles?.display_name ?? "profile"}</Link>
                  </p>
                  <p className="text-xs text-ink-weak">The owner edits it themselves at /me. Reset only if they lost access or the card changed hands.</p>
                  <form action={resetCardSetup}>
                    <input type="hidden" name="id" value={card.id} />
                    <SubmitButton className="btn btn-ghost text-xs" confirm="Unlink the owner and make a new setup code? Their profile is kept, but this card will show the setup screen again." pendingText="…">
                      Reset setup (new code)
                    </SubmitButton>
                  </form>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-ink-weak">Setup code: give this to the customer with the card</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 font-mono text-2xl font-bold tracking-[0.25em] text-ink">{card.claim_code ?? "—"}</code>
                    {card.claim_code && <CopyButton text={card.claim_code} />}
                  </div>
                  <p className="text-xs text-ink-weak">On the first tap they enter this code, their email and a password, and the card becomes theirs.</p>
                  <a href={`/print/card/${card.id}`} target="_blank" rel="noreferrer" className="btn btn-accent text-xs">
                    Print packaging insert
                  </a>
                  {(card.claim_attempts ?? 0) > 0 && (
                    <p className={`text-xs ${(card.claim_attempts ?? 0) >= 10 ? "text-red-600" : "text-amber-700"}`}>
                      {(card.claim_attempts ?? 0) >= 10 ? "Locked after 10 wrong codes." : `${card.claim_attempts} wrong code ${card.claim_attempts === 1 ? "try" : "tries"} so far.`}
                    </p>
                  )}
                  <form action={resetCardSetup}>
                    <input type="hidden" name="id" value={card.id} />
                    <SubmitButton className="btn btn-ghost text-xs" pendingText="…">New setup code</SubmitButton>
                  </form>
                </>
              )}
            </div>
          )}

          <div className="rounded-xl bg-white p-3 text-sm">
            <p><b>{taps.count ?? 0}</b> taps/scans total</p>
            {lastTaps.length > 0 && <p className="text-xs text-ink-weak">Last: {lastTaps.map((t) => fmtDate(t.created_at)).join(", ")}</p>}
          </div>
        </section>

        <div className="space-y-6">
          <form action={updateCard} className="card space-y-4">
            <h2 className="font-semibold">Where this card goes</h2>
            <input type="hidden" name="id" value={card.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <CardTypeScope defaultType={card.card_type}>
                <CardTypePicker className="sm:col-span-2" />
                <OnlyFor types={["review", "link"]}>
                  <Field label="Link the card opens" name="destination_url" defaultValue={card.destination_url} className="sm:col-span-2" />
                </OnlyFor>
                <OnlyFor types={["profile"]}>
                  <Select label="Profile" name="profile_id" options={prof.map((p) => ({ value: p.id, label: p.display_name }))} defaultValue={card.profile_id} emptyLabel="— choose —" className="sm:col-span-2" />
                </OnlyFor>
                <OnlyFor types={["personal"]}>
                  <Field
                    label="Buyer name"
                    name="owner_name"
                    defaultValue={card.owner_name}
                    placeholder="Maria Santos"
                    hint="Shown on the setup screen and the packaging insert. The owner's profile is managed on the left."
                    className="sm:col-span-2"
                  />
                </OnlyFor>
                <OnlyFor types={["review", "profile", "link"]}>
                  <Select label="Customer" name="customer_id" options={cust.map((c) => ({ value: c.id, label: c.business_name }))} defaultValue={card.customer_id} emptyLabel="— none —" />
                </OnlyFor>
                <Select
                  label="Order (optional)"
                  name="order_id"
                  options={ords.map((o) => ({ value: o.id, label: `#${o.order_no} ${o.customers?.business_name ?? ""}` }))}
                  defaultValue={card.order_id}
                  emptyLabel="— none —"
                />
                <Field label="Label" name="label" defaultValue={card.label} placeholder="Order no., or Counter / Chair" />
                <Select label="Chip" name="chip_type" options={["NTAG213", "NTAG215", "NTAG216"]} defaultValue={card.chip_type} />
                <Select label="Status" name="status" options={CARD_STATUSES} defaultValue={card.status} />
                <div className="flex items-end pb-2"><Checkbox label="Chip is permanently locked" name="is_locked" defaultChecked={card.is_locked} /></div>
              </CardTypeScope>
            </div>
            <p className="text-xs text-ink-weak">Set status to <b>Disabled</b> to switch a card off (e.g. unpaid renewal) without deleting it.</p>
            <SubmitButton>Save card</SubmitButton>
          </form>

          <form action={deleteCard}>
            <input type="hidden" name="id" value={card.id} />
            <SubmitButton className="btn btn-danger" confirm="Delete this card? If it's already programmed, it will stop working.">Delete card</SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
