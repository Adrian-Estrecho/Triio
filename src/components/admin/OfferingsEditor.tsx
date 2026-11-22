"use client";

import { useEffect, useState } from "react";
import type { Offering } from "@/lib/types";
import { OFFERINGS_MAX, OFFERINGS_TITLE, newOfferingId } from "@/lib/offerings";

type Row = Offering & { preview?: string | null; removeImage?: boolean };

/**
 * Products & services for a business profile, inside the admin profile form.
 * The list goes up as JSON (`offerings`); each new photo as its own file field (`offering_img_<id>`).
 */
export function OfferingsEditor({ initial, title, ready }: { initial: Offering[]; title: string | null; ready: boolean }) {
  const [rows, setRows] = useState<Row[]>(initial);

  // Free the local photo previews when the editor goes away.
  useEffect(() => () => rows.forEach((r) => r.preview && URL.revokeObjectURL(r.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) {
    return (
      <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
        Products &amp; services aren&apos;t switched on yet. Run <code className="font-mono">supabase/offerings.sql</code> in the Supabase SQL Editor (after
        wallet.sql and games.sql), then reload this page.
      </p>
    );
  }

  const edit = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, by: number) =>
    setRows((rs) => {
      const j = i + by;
      if (j < 0 || j >= rs.length) return rs;
      const next = [...rs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const payload = rows.map(({ preview: _p, ...r }) => r);

  return (
    <div className="space-y-4">
      <input type="hidden" name="offerings" value={JSON.stringify(payload)} />
      <div className="max-w-sm">
        <label className="label" htmlFor="offerings_title">
          Section title
        </label>
        <input id="offerings_title" name="offerings_title" className="input" defaultValue={title ?? ""} placeholder={OFFERINGS_TITLE} maxLength={40} />
      </div>

      {rows.map((r, i) => {
        const img = r.preview ?? (r.removeImage ? null : r.image);
        return (
          <div key={r.id} className="flex gap-4 rounded-2xl border border-line p-3">
            <div className="w-24 shrink-0">
              <label className="group relative flex aspect-[4/5] w-24 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-line-strong bg-surface-2 text-xs text-ink-weak hover:bg-surface-3">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <span className="px-2 text-center">+ Photo</span>
                )}
                <input
                  type="file"
                  name={`offering_img_${r.id}`}
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (r.preview) URL.revokeObjectURL(r.preview);
                    edit(i, { preview: file ? URL.createObjectURL(file) : null, removeImage: false });
                  }}
                />
              </label>
              {img && !r.preview && (
                <button type="button" className="mt-1 w-full cursor-pointer text-xs text-red-600 hover:underline" onClick={() => edit(i, { removeImage: true })}>
                  Remove photo
                </button>
              )}
            </div>

            <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Name *</label>
                <input className="input" value={r.title} maxLength={60} placeholder="Gel manicure" onChange={(e) => edit(i, { title: e.target.value })} />
              </div>
              <div>
                <label className="label">Price</label>
                <input className="input" value={r.price ?? ""} maxLength={24} placeholder="₱450 or From ₱350" onChange={(e) => edit(i, { price: e.target.value })} />
              </div>
              <div>
                <label className="label">Category (for the filter chips)</label>
                <input className="input" value={r.category ?? ""} maxLength={24} placeholder="Nails" onChange={(e) => edit(i, { category: e.target.value })} />
              </div>
              <div>
                <label className="label">Order / booking link</label>
                <input className="input" value={r.url ?? ""} maxLength={300} placeholder="shopee.ph/… (optional)" onChange={(e) => edit(i, { url: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Description</label>
                <textarea
                  className="input"
                  rows={2}
                  value={r.description ?? ""}
                  maxLength={400}
                  placeholder="What's included, how long it takes…"
                  onChange={(e) => edit(i, { description: e.target.value })}
                />
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-1">
              <button type="button" className="btn btn-ghost h-8 px-2.5" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                ↑
              </button>
              <button type="button" className="btn btn-ghost h-8 px-2.5" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down">
                ↓
              </button>
              <button
                type="button"
                className="btn btn-ghost h-8 px-2.5 text-red-600"
                onClick={() => {
                  if (r.preview) URL.revokeObjectURL(r.preview);
                  setRows((rs) => rs.filter((_, j) => j !== i));
                }}
                aria-label={`Remove ${r.title || "item"}`}
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}

      {rows.length < OFFERINGS_MAX && (
        <button
          type="button"
          className="btn btn-accent"
          onClick={() => setRows((rs) => [...rs, { id: newOfferingId(), title: "", price: "", category: "", description: "", url: "", image: null }])}
        >
          + Add product or service
        </button>
      )}
      <p className="text-xs text-ink-faint">
        Items without a name are skipped. Photos: square or portrait, under 4 MB. They show as a photo grid under the Save Contact button.
      </p>
    </div>
  );
}
