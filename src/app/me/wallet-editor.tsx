"use client";

import { useCallback, useMemo, useState } from "react";
import { onColor } from "@/lib/color";
import { qrPath } from "@/lib/qr";
import type { WalletKind, WalletPass } from "@/lib/types";
import { BANKS, WALLET_MAX, WALLET_PRESETS, bankOf, hasQr, isPaymentKind, newPassId, presetOf } from "@/lib/wallet";
import { PassFront, PassGlyph, WalletStack, type ShownPass } from "@/components/wallet/WalletStack";
import { decodeQrFile, qrPhName } from "./qr-decode";
import { Group, Icon, Sheet, optionStyle } from "./ui";

/**
 * A pass being edited. `file` is a QR image that hasn't been uploaded yet (`preview` is its local URL);
 * `logoFile` / `logoPreview` the same for its logo.
 */
export type DraftPass = WalletPass & { file?: File; preview?: string; logoFile?: File; logoPreview?: string };

/** What the wallet looks like with local (not yet uploaded) images. */
export function previewPasses(wallet: DraftPass[]): WalletPass[] {
  return wallet.map(({ file: _f, preview, logoFile: _l, logoPreview, ...p }) => ({ ...p, qr_image: preview ?? p.qr_image ?? null, logo: logoPreview ?? p.logo ?? null }));
}

function shownOf(wallet: DraftPass[]): ShownPass[] {
  return previewPasses(wallet).map((p) => ({ ...p, qr: p.qr_text?.trim() ? qrPath(p.qr_text.trim()) : null }));
}

/** Shrink a big screenshot, keeping enough detail for the QR. */
async function shrinkImage(file: File, max = 1400): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    return blob && blob.size < file.size ? new File([blob], "qr.png", { type: "image/png" }) : file;
  } catch {
    return file;
  }
}

const SWATCHES = ["#0B5FFF", "#0E9F6E", "#1D3557", "#5E5CE6", "#BF5AF2", "#FF375F", "#FF9F0A", "#1C1C1E"];

/* ============================== The Wallet tab in settings ============================== */

export function WalletEditor({
  available = true,
  wallet,
  setWallet,
  ownerName,
  shareUrl,
  accent,
  tint,
}: {
  /** False until the database has the wallet column (supabase/wallet.sql). */
  available?: boolean;
  wallet: DraftPass[];
  setWallet: (w: DraftPass[]) => void;
  ownerName: string;
  shareUrl: string;
  accent: string;
  tint: string;
}) {
  const [editing, setEditing] = useState<{ draft: DraftPass; isNew: boolean } | null>(null);
  const [choosing, setChoosing] = useState(false);
  const shown = useMemo(() => shownOf(wallet), [wallet]);
  const full = wallet.length >= WALLET_MAX;

  const start = (kind: WalletKind) => {
    const preset = presetOf(kind);
    setChoosing(false);
    setEditing({
      isNew: true,
      draft: {
        id: newPassId(),
        kind,
        title: preset.title,
        color: kind === "profile" ? accent : preset.color,
        name: null,
        number: null,
        qr_text: kind === "profile" ? shareUrl : null,
        qr_image: null,
      },
    });
  };

  const save = (d: DraftPass) => {
    setWallet(wallet.some((p) => p.id === d.id) ? wallet.map((p) => (p.id === d.id ? d : p)) : [...wallet, d]);
    setEditing(null);
  };
  const remove = (id: string) => {
    setWallet(wallet.filter((p) => p.id !== id));
    setEditing(null);
  };
  const reorder = (from: number, to: number) => {
    if (to < 0 || to >= wallet.length || from === to) return;
    const next = [...wallet];
    const [card] = next.splice(from, 1);
    next.splice(to, 0, card);
    setWallet(next);
  };
  const move = (i: number, by: number) => reorder(i, i + by);
  const closeEditor = useCallback(() => setEditing(null), []);
  const closeChooser = useCallback(() => setChoosing(false), []);

  return (
    <div className="pt-6">
      <div className="px-1">
        <h2 className="text-[28px] leading-tight font-bold" style={{ letterSpacing: "-0.025em" }}>
          Wallet
        </h2>
        <p className="mt-1 text-[15px] leading-snug" style={{ color: "var(--ios-secondary)" }}>
          Keep your QR codes on your card: GCash, Maya, bank, links. A <b style={{ color: "var(--ios-label)" }}>Wallet</b> tab appears on your card as soon as you add
          one.
        </p>
      </div>

      {!available ? (
        <div className="mt-6 rounded-[16px] px-5 py-6 text-center" style={{ background: "var(--ios-cell)" }}>
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(255,159,10,0.16)", color: "#FF9F0A" }}>
            <Icon name="alert" className="h-6 w-6" />
          </span>
          <p className="mt-4 text-[17px] font-semibold">Wallet is coming soon</p>
          <p className="mx-auto mt-1 max-w-xs text-[14px] leading-snug" style={{ color: "var(--ios-secondary)" }}>
            Triio is finishing an update. Check back shortly to add your GCash, Maya and other QR codes.
          </p>
        </div>
      ) : wallet.length === 0 ? (
        <div className="mt-6 rounded-[16px] px-5 pt-8 pb-6 text-center" style={{ background: "var(--ios-cell)" }}>
          <div className="relative mx-auto h-[118px] w-[200px]" aria-hidden="true">
            {["#1D3557", "#0E9F6E", "#0B5FFF"].map((c, i) => (
              <span
                key={c}
                className="absolute inset-x-0 h-[86px] rounded-[12px] shadow-[0_8px_20px_-10px_rgba(0,0,0,0.5)]"
                style={{
                  top: i * 16,
                  background: `linear-gradient(140deg, color-mix(in srgb, ${c} 76%, #fff), ${c} 45%, color-mix(in srgb, ${c} 68%, #000))`,
                  transform: `scale(${0.88 + i * 0.06})`,
                }}
              >
                <span className="absolute top-2.5 left-3 h-1.5 w-12 rounded-full bg-white/50" />
              </span>
            ))}
          </div>
          <p className="mt-5 text-[17px] font-semibold">No cards yet</p>
          <p className="mx-auto mt-1 max-w-xs text-[14px] leading-snug" style={{ color: "var(--ios-secondary)" }}>
            Add your payment QR so people can pay you with one tap, no more sending screenshots.
          </p>
          <button
            type="button"
            onClick={() => setChoosing(true)}
            className="mt-5 inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-5 text-[16px] font-semibold transition-transform duration-100 active:scale-[0.97]"
            style={{ background: accent, color: onColor(accent) }}
          >
            <Icon name="plus" className="h-[18px] w-[18px]" strokeWidth={2.4} /> Add a card
          </button>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <WalletStack passes={shown} ownerName={ownerName} tint={tint} onReorder={reorder} />
          </div>

          <Group title="Your cards" aside={<span className="text-[13px]" style={{ color: "var(--ios-secondary)" }}>{wallet.length} of {WALLET_MAX}</span>}>
            {wallet.map((p, i) => (
              <div key={p.id} className="ios-field gap-3 pr-2">
                <button type="button" className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-2 text-left" onClick={() => setEditing({ draft: p, isNew: false })}>
                  <span className="flex h-[38px] w-[56px] shrink-0 items-center justify-center rounded-[7px]" style={{ background: p.color, color: onColor(p.color) }}>
                    <PassGlyph kind={p.kind} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-medium">{p.title || presetOf(p.kind).label}</span>
                    <span className="block truncate text-[13px]" style={{ color: "var(--ios-secondary)" }}>
                      {[p.name, p.number].filter(Boolean).join(" · ") || (p.qr_text ? "QR code" : "QR image")}
                      {p.file && " · not saved yet"}
                    </span>
                  </span>
                </button>
                <span className="flex shrink-0 items-center">
                  <button type="button" className="flex h-9 w-8 cursor-pointer items-center justify-center rounded-lg disabled:opacity-25" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${p.title} up`}>
                    <Icon name="up" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="flex h-9 w-8 cursor-pointer items-center justify-center rounded-lg disabled:opacity-25"
                    onClick={() => move(i, 1)}
                    disabled={i === wallet.length - 1}
                    aria-label={`Move ${p.title} down`}
                  >
                    <Icon name="down" className="h-4 w-4" />
                  </button>
                </span>
              </div>
            ))}
            {!full && (
              <button type="button" className="ios-field w-full cursor-pointer text-left" onClick={() => setChoosing(true)}>
                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full" style={{ background: "#30D158" }} aria-hidden="true">
                  <Icon name="plus" className="h-3 w-3 text-white" strokeWidth={3} />
                </span>
                <span className="text-[17px]" style={{ color: tint }}>
                  Add a card
                </span>
              </button>
            )}
          </Group>
          <p className="mt-1.5 px-4 text-[13px]" style={{ color: "var(--ios-secondary)" }}>
            The first card is on top. Hold and drag a card above (or use the arrows) to change the order.
          </p>
        </>
      )}

      {/* Step 1: choose a type */}
      <Sheet open={choosing} onClose={closeChooser} label="Add a card">
        <div className="px-4 pt-3 pb-5">
          <SheetHeader title="Add a card" onClose={closeChooser} />
          <div className="mt-2 grid grid-cols-2 gap-2.5">
            {WALLET_PRESETS.map((p) => (
              <button
                key={p.kind}
                type="button"
                onClick={() => start(p.kind)}
                className="flex cursor-pointer flex-col items-start gap-3 rounded-[14px] p-3.5 text-left transition-transform duration-100 active:scale-[0.97]"
                style={{ background: "var(--ios-cell)" }}
              >
                <span
                  className="flex h-9 w-12 items-center justify-center rounded-[7px]"
                  style={{ background: p.kind === "profile" ? accent : p.color, color: onColor(p.kind === "profile" ? accent : p.color) }}
                >
                  <PassGlyph kind={p.kind} />
                </span>
                <span>
                  <span className="block text-[16px] font-semibold">{p.label}</span>
                  <span className="mt-0.5 block text-[12px] leading-snug" style={{ color: "var(--ios-secondary)" }}>
                    {p.hint}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </Sheet>

      {/* Step 2: details */}
      <Sheet open={!!editing} onClose={closeEditor} label={editing?.isNew ? "New card" : "Edit card"}>
        {editing && (
          <PassForm
            key={editing.draft.id}
            initial={editing.draft}
            isNew={editing.isNew}
            ownerName={ownerName}
            shareUrl={shareUrl}
            tint={tint}
            onCancel={closeEditor}
            onSave={save}
            onDelete={() => remove(editing.draft.id)}
          />
        )}
      </Sheet>
    </div>
  );
}

function SheetHeader({ title, onClose, action }: { title: string; onClose: () => void; action?: React.ReactNode }) {
  return (
    <div>
      <span className="mx-auto block h-[5px] w-9 rounded-full" style={{ background: "var(--ios-tertiary)" }} aria-hidden="true" />
      <div className="grid h-11 grid-cols-[1fr_auto_1fr] items-center">
        <button type="button" onClick={onClose} className="cursor-pointer justify-self-start text-[17px]" style={{ color: "var(--ios-secondary)" }}>
          Cancel
        </button>
        <h3 className="text-[17px] font-semibold">{title}</h3>
        <span className="justify-self-end">{action}</span>
      </div>
    </div>
  );
}

/* ============================== Add / edit one card ============================== */

function PassForm({
  initial,
  isNew,
  ownerName,
  shareUrl,
  tint,
  onCancel,
  onSave,
  onDelete,
}: {
  initial: DraftPass;
  isNew: boolean;
  ownerName: string;
  shareUrl: string;
  tint: string;
  onCancel: () => void;
  onSave: (d: DraftPass) => void;
  onDelete: () => void;
}) {
  const [d, setD] = useState<DraftPass>(initial);
  const [reading, setReading] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const preset = presetOf(d.kind);
  const pay = isPaymentKind(d.kind);
  const isProfile = d.kind === "profile";
  const ready = hasQr({ qr_text: d.qr_text, qr_image: d.preview ?? d.qr_image });
  const shown = useMemo(() => shownOf([d]), [d]);
  const set = (patch: Partial<DraftPass>) => setD((x) => ({ ...x, ...patch }));

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus({ ok: false, text: "Choose an image (a screenshot or photo of the QR code)." });
      return;
    }
    setReading(true);
    setStatus(null);
    const text = await decodeQrFile(file);
    if (text) {
      setD((x) => ({ ...x, qr_text: text, qr_image: null, file: undefined, preview: undefined, name: x.name || qrPhName(text) }));
      setStatus({ ok: true, text: "QR code read. It will show sharp and clean on your card." });
    } else {
      const small = await shrinkImage(file);
      setD((x) => ({ ...x, qr_text: null, qr_image: null, file: small, preview: URL.createObjectURL(small) }));
      setStatus({ ok: false, text: "We couldn't read a QR code in this image, so it will be shown as it is. For best results, crop it close to the code." });
    }
    setReading(false);
  };

  const onLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/") || file.type.includes("svg")) return;
    const small = await shrinkImage(file, 256);
    setD((x) => ({ ...x, logoFile: small, logoPreview: URL.createObjectURL(small) }));
  };
  const logoSrc = d.logoPreview ?? d.logo ?? null;

  // Picking a bank fills in its name and color (unless the owner already changed them).
  const pickBank = (id: string) => {
    const b = bankOf(id);
    setD((x) => {
      const prev = bankOf(x.bank);
      const titleIsDefault = !x.title.trim() || x.title === preset.title || x.title === prev?.name;
      const colorIsDefault = x.color.toLowerCase() === preset.color.toLowerCase() || x.color.toLowerCase() === prev?.color.toLowerCase();
      return {
        ...x,
        bank: b ? b.id : null,
        title: b && titleIsDefault ? (b.id === "other" ? preset.title : b.name) : x.title,
        color: b && colorIsDefault ? b.color : x.color,
      };
    });
  };

  return (
    <div className="px-4 pt-3 pb-5">
      <SheetHeader
        title={isNew ? preset.label : "Edit card"}
        onClose={onCancel}
        action={
          <button type="button" disabled={!ready || reading} onClick={() => onSave(d)} className="cursor-pointer text-[17px] font-semibold disabled:cursor-default disabled:opacity-40" style={{ color: tint }}>
            {isNew ? "Add" : "Done"}
          </button>
        }
      />

      {/* Live card: tap to flip */}
      <div className="mx-auto mt-3 max-w-[340px]">
        {ready ? (
          <WalletStack passes={shown} ownerName={ownerName} tint={tint} hint={false} />
        ) : (
          <div className="wallet">
            <div className="wallet-stack" style={{ height: "var(--ch)" }}>
              <span className="pass" style={{ cursor: "default" }}>
                <span className="pass-flip">
                  <PassFront pass={d} ownerName={ownerName} />
                </span>
              </span>
            </div>
          </div>
        )}
        <p className="mt-2 text-center text-[12px]" style={{ color: "var(--ios-secondary)" }}>
          {ready ? "Tap the card to see the QR side" : "Add a QR code to finish"}
        </p>
      </div>

      {/* QR code */}
      {isProfile ? (
        <div className="mt-5 rounded-[12px] px-4 py-3 text-[14px] leading-snug" style={{ background: "var(--ios-cell)", color: "var(--ios-secondary)" }}>
          This QR opens your card at <b style={{ color: "var(--ios-label)" }}>{shareUrl.replace(/^https?:\/\//, "")}</b>, handy for people whose phone can&apos;t tap NFC.
        </div>
      ) : (
        <section className="mt-5">
          <h4 className="mb-1.5 px-4 text-[13px] font-medium uppercase" style={{ color: "var(--ios-secondary)" }}>
            QR code
          </h4>
          <div className="overflow-hidden rounded-[12px]" style={{ background: "var(--ios-cell)" }}>
            <label className="ios-field cursor-pointer gap-3 py-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px]" style={{ background: `color-mix(in srgb, ${tint} 16%, transparent)`, color: tint }}>
                {reading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Icon name="image" className="h-[22px] w-[22px]" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-medium" style={{ color: tint }}>
                  {reading ? "Reading QR code…" : d.file || d.qr_image || (pay && d.qr_text) ? "Replace image" : "Upload a screenshot"}
                </span>
                <span className="block text-[13px] leading-snug" style={{ color: "var(--ios-secondary)" }}>
                  {preset.hint}
                </span>
              </span>
              <input type="file" accept="image/*" className="sr-only" onChange={onFile} disabled={reading} />
            </label>
            <div className="ios-field items-start py-0">
              <textarea
                className="ios-input min-h-[64px]! text-[15px]!"
                value={d.file ? "" : (d.qr_text ?? "")}
                onChange={(e) => {
                  setStatus(null);
                  set({ qr_text: e.target.value, file: undefined, preview: undefined, qr_image: e.target.value ? null : d.qr_image });
                }}
                placeholder={pay ? "…or paste the QR code text" : "Paste a link or any text, e.g. https://…"}
                maxLength={1200}
                rows={2}
                autoCapitalize="none"
                spellCheck={false}
                aria-label="QR code link or text"
              />
            </div>
          </div>
          {status && (
            <p className="mt-1.5 flex gap-1.5 px-4 text-[13px] leading-snug" style={{ color: status.ok ? "#30D158" : "#FF9F0A" }} role="status">
              <Icon name={status.ok ? "check" : "alert"} className="mt-px h-4 w-4 shrink-0" />
              {status.text}
            </p>
          )}
        </section>
      )}

      {/* Details */}
      <section className="mt-6">
        <h4 className="mb-1.5 px-4 text-[13px] font-medium uppercase" style={{ color: "var(--ios-secondary)" }}>
          Details
        </h4>
        <div className="overflow-hidden rounded-[12px]" style={{ background: "var(--ios-cell)" }}>
          {d.kind === "bank" && (
            <label className="ios-field">
              <span className="ios-field-label">Bank</span>
              <select
                className="ios-input cursor-pointer appearance-none bg-transparent"
                value={d.bank ?? ""}
                onChange={(e) => pickBank(e.target.value)}
                style={{ color: d.bank ? "var(--ios-label)" : "var(--ios-tertiary)" }}
              >
                <option value="" disabled style={{ ...optionStyle, color: "var(--ios-secondary)" }}>
                  Choose your bank
                </option>
                {BANKS.map((b) => (
                  <option key={b.id} value={b.id} style={optionStyle}>
                    {b.name}
                  </option>
                ))}
              </select>
              <Icon name="down" className="h-4 w-4 shrink-0 opacity-50" />
            </label>
          )}
          <label className="ios-field">
            <span className="ios-field-label">Title</span>
            <input className="ios-input" value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder={preset.title || "Event pass"} maxLength={40} />
          </label>
          <label className="ios-field">
            <span className="ios-field-label">{pay ? "Name" : "Subtitle"}</span>
            <input
              className="ios-input"
              value={d.name ?? ""}
              onChange={(e) => set({ name: e.target.value })}
              placeholder={pay || isProfile ? ownerName : "Optional"}
              maxLength={60}
            />
          </label>
          {!isProfile && (
            <label className="ios-field">
              <span className="ios-field-label">{pay ? "Number" : "Details"}</span>
              <input
                className="ios-input"
                value={d.number ?? ""}
                onChange={(e) => set({ number: e.target.value })}
                placeholder={pay ? "0917 123 4567" : "Optional"}
                inputMode={pay ? "tel" : undefined}
                maxLength={40}
              />
            </label>
          )}
        </div>
        <div className="mt-3 overflow-hidden rounded-[12px]" style={{ background: "var(--ios-cell)" }}>
          <div className="ios-field gap-3 py-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px]" style={{ background: logoSrc ? "#fff" : "var(--ios-fill)" }}>
              {logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoSrc} alt="" className="h-full w-full object-contain p-1" />
              ) : (
                <PassGlyph kind={d.kind} />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px]">Logo</span>
              <span className="block text-[13px] leading-snug" style={{ color: "var(--ios-secondary)" }}>
                Optional. A square image works best.
              </span>
            </span>
            {logoSrc && (
              <button type="button" className="cursor-pointer text-[15px]" style={{ color: "#FF453A" }} onClick={() => set({ logo: null, logoFile: undefined, logoPreview: undefined })}>
                Remove
              </button>
            )}
            <label className="cursor-pointer text-[15px] font-semibold" style={{ color: tint }}>
              {logoSrc ? "Change" : "Upload"}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={onLogo} />
            </label>
          </div>
        </div>
        {pay && (
          <p className="mt-1.5 px-4 text-[13px] leading-snug" style={{ color: "var(--ios-secondary)" }}>
            Shown on the front of the card. You can hide part of the number, e.g. 0917 ••• 4567.
          </p>
        )}
      </section>

      {/* Color */}
      <section className="mt-6">
        <h4 className="mb-1.5 px-4 text-[13px] font-medium uppercase" style={{ color: "var(--ios-secondary)" }}>
          Color
        </h4>
        <div className="flex flex-wrap items-center gap-3 rounded-[12px] px-4 py-3.5" style={{ background: "var(--ios-cell)" }} role="radiogroup" aria-label="Card color">
          {Array.from(new Set([bankOf(d.bank)?.color ?? preset.color, ...SWATCHES].map((c) => c.toUpperCase()))).map((c) => {
            const on = d.color.toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={c}
                onClick={() => set({ color: c })}
                className="h-8 w-8 cursor-pointer rounded-full transition-transform duration-150 active:scale-90"
                style={{ background: c, boxShadow: on ? `0 0 0 2px var(--ios-cell), 0 0 0 4px ${c}` : "inset 0 0 0 0.5px rgba(127,127,127,0.4)" }}
              />
            );
          })}
          <label
            className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-full"
            style={{ background: "conic-gradient(#FF375F, #FF9F0A, #FFD60A, #30D158, #64D2FF, #5E5CE6, #BF5AF2, #FF375F)" }}
            aria-label="Custom color"
          >
            <input type="color" value={d.color} onChange={(e) => set({ color: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
          </label>
        </div>
      </section>

      <button
        type="button"
        disabled={!ready || reading}
        onClick={() => onSave(d)}
        className="mt-7 flex h-[50px] w-full cursor-pointer items-center justify-center rounded-[14px] text-[17px] font-semibold transition-[transform,opacity] duration-100 active:scale-[0.98] disabled:cursor-default disabled:opacity-40"
        style={{ background: tint, color: onColor(tint) }}
      >
        {isNew ? "Add to Wallet" : "Done"}
      </button>
      {!isNew && (
        <button type="button" onClick={onDelete} className="mt-2 flex h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] text-[17px]" style={{ color: "#FF453A" }}>
          <Icon name="trash" className="h-[18px] w-[18px]" /> Remove from Wallet
        </button>
      )}
    </div>
  );
}
