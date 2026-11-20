"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { onColor, readableTint, safeColor } from "@/lib/color";
import type { Profile, ProfileLink } from "@/lib/types";
import { ownerSignOut, updateMyProfile, type FormState } from "./actions";

const SWATCHES = ["#38BDF8", "#0A84FF", "#5E5CE6", "#BF5AF2", "#FF375F", "#FF9F0A", "#30D158", "#8E8E93"];

/** Shrink big phone photos before upload (faster, and well under the size limit). */
async function shrink(file: File, max = 1200): Promise<File> {
  if (!file.type.startsWith("image/") || /svg|gif/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 900_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.86));
    return blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

function Group({ title, footer, children }: { title?: string; footer?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      {title && (
        <h2 className="mb-1.5 px-4 text-[13px] uppercase" style={{ color: "var(--ios-secondary)" }}>
          {title}
        </h2>
      )}
      <div className="overflow-hidden rounded-[12px]" style={{ background: "var(--ios-cell)" }}>
        {children}
      </div>
      {footer && (
        <div className="mt-1.5 px-4 text-[13px] leading-snug" style={{ color: "var(--ios-secondary)" }}>
          {footer}
        </div>
      )}
    </section>
  );
}

function Text({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  inputMode,
  autoComplete,
  maxLength,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  maxLength?: number;
  required?: boolean;
}) {
  return (
    <label className="ios-field">
      <span className="ios-field-label">{label}</span>
      <input
        className="ios-input"
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete ?? "off"}
        maxLength={maxLength}
        required={required}
        autoCapitalize={type === "url" || type === "email" ? "none" : undefined}
        spellCheck={type === "url" || type === "email" ? false : undefined}
      />
    </label>
  );
}

export function SettingsForm({ profile: p, email, welcome, shareUrl }: { profile: Profile; email: string; welcome: boolean; shareUrl: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(updateMyProfile, {});
  const [theme, setTheme] = useState<"dark" | "light">(p.theme);
  const [accent, setAccent] = useState(safeColor(p.accent_color));
  const [name, setName] = useState(p.display_name);
  const [links, setLinks] = useState<ProfileLink[]>(p.links?.length ? p.links : []);
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [cover, setCover] = useState<{ file: File; url: string } | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [toast, setToast] = useState(false);
  const [copied, setCopied] = useState(false);
  const [greeting, setGreeting] = useState(p.intro_greeting ?? "");

  const dark = theme === "dark";
  const tint = readableTint(accent, dark);
  const onAccent = onColor(accent);
  const photoUrl = photo?.url ?? (removePhoto ? null : p.logo_url);
  const coverUrl = cover?.url ?? (removeCover ? null : p.cover_url);

  // After a save: show the toast and forget the local photo picks (the saved ones come back from the server).
  useEffect(() => {
    if (!state.savedAt) return;
    setPhoto(null);
    setCover(null);
    setRemovePhoto(false);
    setRemoveCover(false);
    setToast(true);
    const t = setTimeout(() => setToast(false), 2200);
    return () => clearTimeout(t);
  }, [state.savedAt]);

  useEffect(() => {
    if (state.error) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [state]);

  const pick = async (e: React.ChangeEvent<HTMLInputElement>, set: (v: { file: File; url: string } | null) => void) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // the shrunk copy is sent instead
    if (!f) return;
    const small = await shrink(f);
    set({ file: small, url: URL.createObjectURL(small) });
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (photo) fd.set("photo", photo.file);
    if (cover) fd.set("cover", cover.file);
    // Submitting this way keeps everything typed in the form (no reset after saving).
    startTransition(() => formAction(fd));
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <main className={`ios ${dark ? "ios-dark" : "ios-light"} min-h-dvh`} style={{ background: "var(--ios-bg)", color: "var(--ios-label)" }}>
      {/* Navigation bar */}
      <header
        className="sticky top-0 z-30 pt-[env(safe-area-inset-top)]"
        style={{
          background: `color-mix(in srgb, var(--ios-bg) 78%, transparent)`,
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
          backdropFilter: "saturate(180%) blur(20px)",
          borderBottom: "0.5px solid var(--ios-separator)",
        }}
      >
        <div className="mx-auto grid h-11 max-w-md grid-cols-[1fr_auto_1fr] items-center px-4">
          <a href={`/p/${p.slug}`} className="flex items-center gap-1 justify-self-start text-[17px]" style={{ color: tint }}>
            <svg viewBox="0 0 12 20" className="h-[17px] w-[10px]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 2 2 10l8 8" />
            </svg>
            My Card
          </a>
          <h1 className="text-[17px] font-semibold">Edit Profile</h1>
          <button
            type="submit"
            form="profile-form"
            disabled={pending}
            className="cursor-pointer justify-self-end text-[17px] font-semibold disabled:opacity-50"
            style={{ color: tint }}
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </header>

      {/* Saved toast */}
      <div
        className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+56px)] z-40 flex justify-center transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none"
        style={{ opacity: toast ? 1 : 0, transform: toast ? "none" : "translateY(-8px) scale(0.96)" }}
        role="status"
        aria-live="polite"
      >
        <span className="flex items-center gap-2 rounded-full px-4 py-2 text-[15px] font-semibold shadow-[0_8px_30px_rgba(0,0,0,0.25)]" style={{ background: "var(--ios-cell)" }}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#30D158" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
          {toast ? "Saved" : ""}
        </span>
      </div>

      <form id="profile-form" onSubmit={onSubmit} className="mx-auto w-full max-w-md px-4 pb-[calc(env(safe-area-inset-bottom)+48px)]">
        <input type="hidden" name="id" value={p.id} />
        <input type="hidden" name="accent_color" value={accent} />
        <input type="hidden" name="theme" value={theme} />
        <input type="hidden" name="links" value={links.filter((l) => l.url.trim()).map((l) => `${l.label.trim() || l.url.trim()} | ${l.url.trim()}`).join("\n")} />
        {removePhoto && <input type="hidden" name="remove_photo" value="on" />}
        {removeCover && <input type="hidden" name="remove_cover" value="on" />}

        {welcome && !state.savedAt && (
          <div className="mt-5 rounded-[14px] p-4" style={{ background: `${accent}22` }}>
            <p className="text-[17px] font-semibold">Your card is live</p>
            <p className="mt-1 text-[15px] leading-snug" style={{ color: "var(--ios-secondary)" }}>
              Add a photo and your details, then tap Save. Whoever taps your card sees the changes right away.
            </p>
          </div>
        )}

        {state.error && (
          <p className="mt-5 rounded-[12px] px-4 py-3 text-[15px] leading-snug" role="alert" style={{ background: "rgba(255,69,58,0.14)", color: "#FF6961" }}>
            {state.error}
          </p>
        )}

        {/* Photo */}
        <div className="mt-7 flex flex-col items-center">
          <label className="group relative cursor-pointer rounded-full" aria-label="Change photo">
            <span
              className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full text-[44px] font-semibold transition-transform duration-150 group-active:scale-[0.96]"
              style={{ background: photoUrl ? "#fff" : `linear-gradient(180deg, ${accent} 0%, ${accent}CC 100%)`, color: onAccent }}
            >
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                name.slice(0, 1).toUpperCase() || "?"
              )}
            </span>
            <span
              className="absolute right-0.5 bottom-0.5 flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: tint, boxShadow: "0 0 0 3px var(--ios-bg)" }}
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke={onColor(tint)} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9Z" />
                <circle cx="12" cy="13" r="3.2" />
              </svg>
            </span>
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e, setPhoto)} />
          </label>
          <div className="mt-3 flex gap-5 text-[15px]">
            <label className="cursor-pointer" style={{ color: tint }}>
              {photoUrl ? "Change Photo" : "Add Photo"}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e, setPhoto)} />
            </label>
            {photoUrl && (
              <button
                type="button"
                className="cursor-pointer"
                style={{ color: "#FF453A" }}
                onClick={() => {
                  setPhoto(null);
                  setRemovePhoto(true);
                }}
              >
                Remove
              </button>
            )}
          </div>
        </div>

        <Group
          title="Intro"
          footer={
            <>
              People who tap your card first see <b style={{ color: "var(--ios-label)" }}>“{greeting.trim() || "Hi, I’m"} {name || "…"}”</b> animate in.{" "}
              <a href={`/p/${p.slug}`} target="_blank" rel="noreferrer" style={{ color: tint }}>
                Preview
              </a>
            </>
          }
        >
          <label className="ios-field">
            <span className="ios-field-label">Name</span>
            <input
              className="ios-input"
              name="display_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoComplete="name"
              required
            />
          </label>
          <Text label="Headline" name="tagline" defaultValue={p.tagline} placeholder="Photographer · Marikina" maxLength={120} />
          <label className="ios-field">
            <span className="ios-field-label">Greeting</span>
            <input className="ios-input" name="intro_greeting" value={greeting} onChange={(e) => setGreeting(e.target.value)} placeholder="Hi, I’m" maxLength={40} />
          </label>
          <label className="ios-field cursor-pointer">
            <span className="flex-1 text-[17px]">Play intro animation</span>
            <input type="checkbox" name="intro_enabled" defaultChecked={p.intro_enabled !== false} className="ios-switch" />
          </label>
        </Group>

        <Group title="About">
          <label className="ios-field">
            <span className="sr-only">About you</span>
            <textarea
              className="ios-input"
              name="description"
              defaultValue={p.description ?? ""}
              placeholder="A few lines about you and what you do."
              maxLength={1200}
            />
          </label>
        </Group>

        <Group title="Contact">
          <Text label="Phone" name="phone" type="tel" inputMode="tel" defaultValue={p.phone} placeholder="0917 123 4567" autoComplete="tel" maxLength={40} />
          <Text label="Email" name="email" type="email" defaultValue={p.email} placeholder="you@example.com" autoComplete="email" maxLength={120} />
          <Text label="Website" name="website" type="url" inputMode="url" defaultValue={p.website} placeholder="yoursite.com" />
          <Text label="Address" name="address" defaultValue={p.address} placeholder="City or full address" maxLength={240} />
          <Text label="Map link" name="maps_url" type="url" inputMode="url" defaultValue={p.maps_url} placeholder="Google Maps link" />
        </Group>

        <Group title="Social">
          <Text label="Facebook" name="facebook" type="url" inputMode="url" defaultValue={p.facebook} placeholder="facebook.com/you" />
          <Text label="Instagram" name="instagram" type="url" inputMode="url" defaultValue={p.instagram} placeholder="instagram.com/you" />
          <Text label="TikTok" name="tiktok" type="url" inputMode="url" defaultValue={p.tiktok} placeholder="tiktok.com/@you" />
          <Text label="Messenger" name="messenger" type="url" inputMode="url" defaultValue={p.messenger} placeholder="m.me/you" />
          <Text label="WhatsApp" name="whatsapp" type="url" inputMode="url" defaultValue={p.whatsapp} placeholder="wa.me/63917…" />
          <Text label="Viber" name="viber" type="url" inputMode="url" defaultValue={p.viber} placeholder="Viber link" />
        </Group>

        <Group title="Links" footer="Portfolio, booking page, shop — anything you want people to open.">
          {links.map((l, i) => (
            <div key={i} className="ios-field gap-3 py-1">
              <button
                type="button"
                className="flex h-[22px] w-[22px] shrink-0 cursor-pointer items-center justify-center rounded-full"
                style={{ background: "#FF453A" }}
                onClick={() => setLinks(links.filter((_, j) => j !== i))}
                aria-label={`Remove link ${l.label || i + 1}`}
              >
                <span className="h-[2px] w-[10px] rounded-full bg-white" />
              </button>
              <div className="min-w-0 flex-1">
                <input
                  className="ios-input block w-full py-1.5"
                  value={l.label}
                  placeholder="Title"
                  maxLength={60}
                  aria-label="Link title"
                  onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                />
                <input
                  className="ios-input block w-full py-1.5 text-[15px]!"
                  style={{ color: "var(--ios-secondary)", borderTop: "0.5px solid var(--ios-separator)" }}
                  value={l.url}
                  placeholder="https://"
                  type="url"
                  inputMode="url"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-label="Link address"
                  onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                />
              </div>
            </div>
          ))}
          {links.length < 12 && (
            <button type="button" className="ios-field w-full cursor-pointer text-left" onClick={() => setLinks([...links, { label: "", url: "" }])}>
              <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full" style={{ background: "#30D158" }} aria-hidden="true">
                <svg viewBox="0 0 12 12" className="h-[10px] w-[10px]" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 1v10M1 6h10" />
                </svg>
              </span>
              <span className="text-[17px]" style={{ color: tint }}>
                Add Link
              </span>
            </button>
          )}
        </Group>

        <Group title="Look">
          <div className="ios-field py-3">
            <span className="ios-field-label">Color</span>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2.5" role="radiogroup" aria-label="Accent color">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={accent.toLowerCase() === c.toLowerCase()}
                  aria-label={c}
                  onClick={() => setAccent(c)}
                  className="h-7 w-7 cursor-pointer rounded-full transition-transform duration-150 active:scale-90"
                  style={{
                    background: c,
                    boxShadow: accent.toLowerCase() === c.toLowerCase() ? `0 0 0 2px var(--ios-cell), 0 0 0 4px ${c}` : "inset 0 0 0 0.5px rgba(0,0,0,0.15)",
                  }}
                />
              ))}
              <label
                className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full"
                style={{
                  background: "conic-gradient(#FF375F, #FF9F0A, #FFD60A, #30D158, #64D2FF, #5E5CE6, #BF5AF2, #FF375F)",
                  boxShadow: SWATCHES.some((c) => c.toLowerCase() === accent.toLowerCase()) ? undefined : `0 0 0 2px var(--ios-cell), 0 0 0 4px ${accent}`,
                }}
                aria-label="Custom color"
              >
                <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
              </label>
            </div>
          </div>
          <div className="ios-field py-2.5">
            <span className="ios-field-label">Theme</span>
            <div className="ml-auto grid w-[180px] grid-cols-2 rounded-[9px] p-[2px]" style={{ background: "var(--ios-fill)" }} role="radiogroup" aria-label="Theme">
              {(["dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={theme === t}
                  onClick={() => setTheme(t)}
                  className="h-7 cursor-pointer rounded-[7px] text-[13px] font-semibold capitalize transition-[background-color,box-shadow] duration-200"
                  style={theme === t ? { background: dark ? "#636366" : "#fff", boxShadow: "0 3px 8px rgba(0,0,0,0.12), 0 3px 1px rgba(0,0,0,0.04)" } : undefined}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="ios-field py-2.5">
            <span className="ios-field-label">Cover</span>
            <div className="flex flex-1 items-center justify-end gap-3">
              {coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt="" className="h-9 w-14 rounded-[6px] object-cover" />
              )}
              {coverUrl && (
                <button
                  type="button"
                  className="cursor-pointer text-[15px]"
                  style={{ color: "#FF453A" }}
                  onClick={() => {
                    setCover(null);
                    setRemoveCover(true);
                  }}
                >
                  Remove
                </button>
              )}
              <label className="cursor-pointer text-[15px]" style={{ color: tint }}>
                {coverUrl ? "Change" : "Add Photo"}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e, setCover)} />
              </label>
            </div>
          </div>
        </Group>

        <Group title="Share" footer="Put this link in your bio. Taps on your card open the same profile.">
          <div className="ios-field">
            <span className="min-w-0 flex-1 truncate text-[17px]" style={{ color: "var(--ios-secondary)" }}>
              {shareUrl.replace(/^https?:\/\//, "")}
            </span>
            <button type="button" onClick={copy} className="cursor-pointer text-[17px]" style={{ color: tint }}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </Group>

        <button
          type="submit"
          disabled={pending}
          className="mt-8 flex h-[52px] w-full cursor-pointer items-center justify-center rounded-[14px] text-[17px] font-semibold transition-[transform,opacity] duration-100 active:scale-[0.97] disabled:opacity-60 motion-reduce:transition-none"
          style={{ background: accent, color: onAccent }}
        >
          {pending ? "Saving…" : "Save Changes"}
        </button>
      </form>

      <form action={ownerSignOut} className="mx-auto w-full max-w-md px-4 pb-[calc(env(safe-area-inset-bottom)+40px)]">
        <h2 className="mb-1.5 px-4 text-[13px] uppercase" style={{ color: "var(--ios-secondary)" }}>
          Account
        </h2>
        <div className="overflow-hidden rounded-[12px]" style={{ background: "var(--ios-cell)" }}>
          <div className="ios-field">
            <span className="min-w-0 flex-1 truncate text-[17px]" style={{ color: "var(--ios-secondary)" }}>
              {email}
            </span>
          </div>
          <button className="ios-field w-full cursor-pointer justify-center text-[17px]" style={{ color: "#FF453A" }}>
            Log Out
          </button>
        </div>
      </form>
    </main>
  );
}
