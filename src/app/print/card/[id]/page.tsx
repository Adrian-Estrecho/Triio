import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { requireAdmin } from "@/lib/admin";
import { cardUrl } from "@/lib/env";
import type { Card } from "@/lib/types";
import { CardInsert } from "./insert";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Packaging insert", robots: { index: false } };

/**
 * A small printable insert for the package of a personal card:
 * the buyer's name, three setup steps, their private setup code and a QR backup.
 * Sized 95 × 140 mm (fits a standard card sleeve / mailer); print at 100% scale.
 */
export default async function CardInsertPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) redirect("/admin");

  const { data: card } = await supabase.from("nfc_cards").select("*").eq("id", id).maybeSingle<Card>();
  if (!card || card.card_type !== "personal") notFound();

  const url = cardUrl(card.card_code);
  const qr = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#111827", light: "#ffffff" } });
  const claimed = Boolean(card.profile_id);

  return (
    <main className="flex min-h-dvh flex-col items-center gap-5 bg-surface-2 px-4 py-8 print:block print:min-h-0 print:bg-white print:p-0">
      <style>{`@page { size: A4; margin: 12mm; }`}</style>

      <div className="flex w-full max-w-[95mm] flex-col gap-3 print:hidden">
        {claimed ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This card is already set up, so it has no setup code. Use <b>Reset setup</b> on the card page to make a new one.
          </p>
        ) : (
          <p className="text-sm text-ink-weak">
            Print at <b>100% / Actual size</b>, cut on the border and put it in the package with card <b className="font-mono">{card.card_code}</b>.
          </p>
        )}
        <PrintButton disabled={claimed} />
      </div>

      <CardInsert name={card.owner_name ?? null} code={claimed ? null : (card.claim_code ?? null)} qrSvg={qr} />
    </main>
  );
}
