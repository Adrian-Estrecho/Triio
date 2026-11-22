"use client";

import { startTransition, useActionState, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ProfileView } from "@/components/ProfileView";
import { TAB_ICONS } from "@/components/wallet/ProfileTabs";
import { onColor, readableTint, safeColor } from "@/lib/color";
import { SOCIALS, socialInput, socialUrl, socialValid, type SocialKey } from "@/lib/social";
import type { GameId, Profile, ProfileLink, PublicProfile } from "@/lib/types";
import { GAMES, GAMES_MAX, gameOf, visibleGames } from "@/lib/games";
import { isSafeHttpUrl, normalizeUrl } from "@/lib/utils";
import { ownerSignOut, updateMyProfile, type FormState } from "./actions";
import { Counter, Group, Icon, Row, Sheet, Tile, optionStyle, type IconName } from "./ui";
import { WalletEditor, previewPasses, type DraftPass } from "./wallet-editor";
import { CoverCropper } from "./cover-cropper";

const SWATCHES = ["#38BDF8", "#0A84FF", "#5E5CE6", "#BF5AF2", "#FF375F", "#FF9F0A", "#30D158", "#8E8E93"];

type Tab = "profile" | "wallet" | "games";
const TABS: Tab[] = ["profile", "wallet", "games"];
const TAB_LABEL: Record<Tab, string> = { profile: "Profile", wallet: "Wallet", games: "Games" };

type Values = {
  display_name: string;
  tagline: string;
  intro_greeting: string;
  intro_enabled: boolean;
  description: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  maps_url: string;
} & Record<SocialKey, string>;

type Snapshot = { values: Values; links: ProfileLink[]; games: GameId[]; accent: string; theme: "dark" | "light"; wallet: DraftPass[]; logo: string | null; cover: string | null };

function valuesOf(p: Profile): Values {
  return {
    display_name: p.display_name ?? "",
    tagline: p.tagline ?? "",
    intro_greeting: p.intro_greeting ?? "",
    intro_enabled: p.intro_enabled !== false,
    description: p.description ?? "",
    phone: p.phone ?? "",
    email: p.email ?? "",
    website: p.website ?? "",
    address: p.address ?? "",
    maps_url: p.maps_url ?? "",
    ...(Object.fromEntries(SOCIALS.map((s) => [s.key, socialInput(s.key, p[s.key])])) as Record<SocialKey, string>),
  };
}

const cleanLinks = (links: ProfileLink[]) => links.filter((l) => l.url.trim()).map((l) => ({ label: l.label.trim(), url: l.url.trim() }));
/** Game IDs as they'd be saved: entries with an ID, trimmed. */
const gamesKey = (g: GameId[]) =>
  g.filter((x) => x.uid.trim()).map((x) => ({ game: x.game, title: x.title?.trim() || null, ign: x.ign?.trim() || null, uid: x.uid.trim(), server: x.server?.trim() || null }));
const walletKey = (w: DraftPass[]) =>
  w.map(({ file, preview: _p, logoFile, logoPreview: _lp, ...rest }) => ({ ...rest, pending: Boolean(file), logoPending: Boolean(logoFile) }));

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

function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

/* Brand marks for the social rows (simple glyphs, not logos). */
const socialMark: Record<SocialKey, { bg: string; d: string; fill: boolean }> = {
  facebook: { bg: "#1877F2", d: "M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.3H7.8v3h2.6V21h3.1Z", fill: true },
  instagram: { bg: "linear-gradient(45deg,#F9A23C,#E1306C 50%,#8A3AB9)", d: "M8 3.5h8A4.5 4.5 0 0 1 20.5 8v8a4.5 4.5 0 0 1-4.5 4.5H8A4.5 4.5 0 0 1 3.5 16V8A4.5 4.5 0 0 1 8 3.5Zm4 5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm5-1.7v.01", fill: false },
  tiktok: { bg: "#111", d: "M13 3v11.5a3.5 3.5 0 1 1-3.5-3.5M13 3c.7 2.7 2.8 4.6 5.5 4.8", fill: false },
  youtube: { bg: "#FF0000", d: "M8 5.5v13l11-6.5-11-6.5Z", fill: true },
  linkedin: { bg: "#0A66C2", d: "M5 9h3v10H5V9Zm1.5-5a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5ZM10.5 9h2.9v1.4c.5-.9 1.7-1.7 3.4-1.7 3 0 3.7 1.9 3.7 4.5V19h-3v-5.2c0-1.3-.3-2.4-1.7-2.4s-2.3 1-2.3 2.5V19h-3V9Z", fill: true },
};

function SocialTile({ k }: { k: SocialKey }) {
  const m = socialMark[k];
  return (
    <Tile bg={m.bg}>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill={m.fill ? "currentColor" : "none"} stroke={m.fill ? "none" : "currentColor"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={m.d} />
      </svg>
    </Tile>
  );
}

function GlyphTile({ name, bg }: { name: IconName; bg: string }) {
  return (
    <Tile bg={bg}>
      <Icon name={name} className="h-4 w-4" strokeWidth={2.2} />
    </Tile>
  );
}

/** A game's short tag (CODM, MLBB…) on its color, in the iOS tile shape. */
function GameTile({ game, large = false }: { game: string; large?: boolean }) {
  const info = gameOf(game);
  if (large)
    return (
      <span
        className="flex h-[54px] w-[54px] items-center justify-center rounded-[15px] text-[13px] leading-none font-extrabold tracking-tight"
        style={{ background: info.color, color: onColor(info.color) }}
      >
        {info.short}
      </span>
    );
  return (
    <Tile bg={info.color}>
      <span className="text-[8.5px] leading-none font-extrabold tracking-tight" style={{ color: onColor(info.color) }}>
        {info.short}
      </span>
    </Tile>
  );
}

/* ============================== Settings ============================== */

export function SettingsForm({
  profile: p,
  email,
  welcome,
  shareUrl,
  walletReady = true,
  gamesReady = true,
}: {
  profile: Profile;
  email: string;
  welcome: boolean;
  shareUrl: string;
  /** False until supabase/wallet.sql has been run (the profiles.wallet column is missing). */
  walletReady?: boolean;
  /** False until supabase/games.sql has been run (the profiles.games column is missing). */
  gamesReady?: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(updateMyProfile, {});

  const [base, setBase] = useState<Snapshot>(() => ({
    values: valuesOf(p),
    links: p.links ?? [],
    games: Array.isArray(p.games) ? p.games : [],
    accent: safeColor(p.accent_color),
    theme: p.theme,
    wallet: Array.isArray(p.wallet) ? p.wallet : [],
    logo: p.logo_url,
    cover: p.cover_url,
  }));
  const [values, setValues] = useState<Values>(base.values);
  const [links, setLinks] = useState<ProfileLink[]>(base.links);
  const [games, setGames] = useState<GameId[]>(base.games);
  const [accent, setAccent] = useState(base.accent);
  const [theme, setTheme] = useState<"dark" | "light">(base.theme);
  const [wallet, setWallet] = useState<DraftPass[]>(base.wallet);
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [cover, setCover] = useState<{ file: File; url: string } | null>(null);
  const [removeCover, setRemoveCover] = useState(false);

  const [tab, setTabState] = useState<Tab>("profile");
  const [toast, setToast] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  // The photo / cover menu. The kind outlives "open" so the sheet keeps its title while it slides away.
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaKind, setMediaKind] = useState<"photo" | "cover">("photo");
  const openMedia = (k: "photo" | "cover") => {
    setMediaKind(k);
    setMediaOpen(true);
  };
  const closeMedia = useCallback(() => setMediaOpen(false), []);
  // Move-and-scale for the cover. `src` outlives `open` so the sheet keeps its photo while it slides away.
  const [crop, setCrop] = useState<{ src: string; open: boolean } | null>(null);
  // The full photo the current cover was cut from (this visit only), so moving it again doesn't lose the edges.
  const coverSource = useRef<string | null>(null);
  const closeCropper = useCallback(() => setCrop((c) => (c ? { ...c, open: false } : c)), []);
  const cropped = (file: File) => {
    if (crop?.src.startsWith("blob:")) coverSource.current = crop.src;
    setCover({ file, url: URL.createObjectURL(file) });
    setRemoveCover(false);
    closeCropper();
  };
  const [previewOpen, setPreviewOpen] = useState(false);
  const [introRun, setIntroRun] = useState(0);
  const desktop = useMedia("(min-width: 1024px)");

  const formRef = useRef<HTMLFormElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const submitted = useRef<Snapshot | null>(null);

  const set = <K extends keyof Values>(k: K, v: Values[K]) => setValues((x) => ({ ...x, [k]: v }));

  const dark = theme === "dark";
  const tint = readableTint(accent, dark);
  const onAccent = onColor(accent);
  const logoUrl = photo?.url ?? (removePhoto ? null : base.logo);
  const coverUrl = cover?.url ?? (removeCover ? null : base.cover);
  const host = shareUrl.replace(/^https?:\/\//, "");

  const dirty =
    Boolean(photo || cover || removePhoto || removeCover) ||
    JSON.stringify([values, cleanLinks(links), gamesKey(games), accent, theme, walletKey(wallet)]) !==
      JSON.stringify([base.values, cleanLinks(base.links), gamesKey(base.games), base.accent, base.theme, walletKey(base.wallet)]);

  /* ---------- tabs (#wallet / #games open that tab) ---------- */
  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    history.replaceState(null, "", t === "profile" ? window.location.pathname + window.location.search : `#${t}`);
    window.scrollTo({ top: 0 });
  }, []);
  useEffect(() => {
    const h = window.location.hash.slice(1) as Tab;
    if (h !== "profile" && TABS.includes(h)) setTabState(h);
  }, []);

  /* ---------- after saving ---------- */
  useEffect(() => {
    if (!state.savedAt) return;
    const snap = submitted.current;
    if (snap) {
      const saved = state.saved;
      // wallet === null: the wallet wasn't saved (database not updated), so keep the cards as unsaved changes.
      const savedWallet = saved?.wallet === undefined ? snap.wallet : saved.wallet;
      const next: Omit<Snapshot, "wallet" | "games"> = { ...snap, links: cleanLinks(snap.links), logo: saved?.logo_url ?? null, cover: saved?.cover_url ?? null };
      // games === null: not saved (database not updated), so they stay as unsaved changes.
      const savedGames = saved?.games === undefined ? gamesKey(snap.games) : saved.games;
      setBase((b) => ({ ...next, wallet: savedWallet ?? b.wallet, games: savedGames ?? b.games }));
      if (savedGames) setGames((g) => (JSON.stringify(gamesKey(g)) === JSON.stringify(gamesKey(snap.games)) ? savedGames : g));
      setLinks((l) => (JSON.stringify(cleanLinks(l)) === JSON.stringify(next.links) ? next.links : l));
      // Swap local previews for the uploaded files (keep any edits made while saving).
      if (savedWallet) setWallet((w) => (JSON.stringify(walletKey(w)) === JSON.stringify(walletKey(snap.wallet)) ? savedWallet : w));
    }
    setPhoto(null);
    setCover(null);
    setRemovePhoto(false);
    setRemoveCover(false);
    setToast(state.warning ? { tone: "warn", text: state.warning } : { tone: "ok", text: "Saved" });
    const t = setTimeout(() => setToast(null), state.warning ? 6000 : 2200);
    return () => clearTimeout(t);
  }, [state.savedAt, state.saved, state.warning]);

  useEffect(() => {
    if (state.error) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [state]);

  useEffect(() => {
    if (!previewOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPreviewOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewOpen]);

  /* ---------- leaving with unsaved changes ---------- */
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const submit = useCallback(() => {
    const form = formRef.current;
    if (!form || pending) return;
    if (!form.reportValidity()) {
      setTab("profile");
      return;
    }
    const fd = new FormData(form);
    if (photo) fd.set("photo", photo.file);
    if (cover) fd.set("cover", cover.file);
    fd.set("games", JSON.stringify(gamesKey(games)));
    fd.set("wallet", JSON.stringify(wallet.map(({ file: _f, preview: _p, logoFile: _l, logoPreview: _lp, ...rest }) => rest)));
    for (const w of wallet) {
      if (w.file) fd.set(`wallet_qr_${w.id}`, w.file);
      if (w.logoFile) fd.set(`wallet_logo_${w.id}`, w.logoFile);
    }
    submitted.current = { values, links, games, accent, theme, wallet, logo: logoUrl, cover: coverUrl };
    startTransition(() => formAction(fd));
  }, [pending, photo, cover, wallet, values, links, games, accent, theme, logoUrl, coverUrl, formAction, setTab]);

  // ⌘S / Ctrl+S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty) submit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, submit]);

  const discard = () => {
    setValues(base.values);
    setLinks(base.links);
    setGames(base.games);
    setAccent(base.accent);
    setTheme(base.theme);
    setWallet(base.wallet);
    setPhoto(null);
    setCover(null);
    setRemovePhoto(false);
    setRemoveCover(false);
    coverSource.current = null;
  };

  const pick = async (e: React.ChangeEvent<HTMLInputElement>, which: "photo" | "cover") => {
    const f = e.target.files?.[0];
    e.target.value = ""; // the shrunk copy is sent instead
    if (!f) return;
    if (which === "cover") {
      // Covers go through move-and-scale first; the crop is what gets uploaded.
      setCrop({ src: URL.createObjectURL(f), open: true });
      return;
    }
    const small = await shrink(f, 1200);
    const v = { file: small, url: URL.createObjectURL(small) };
    if (which === "photo") {
      setPhoto(v);
      setRemovePhoto(false);
    } else {
      setCover(v);
      setRemoveCover(false);
    }
  };

  const addGame = () => {
    const used = new Set(games.map((g) => g.game));
    const next = GAMES.find((g) => !used.has(g.key))?.key ?? "other";
    setGames([...games, { game: next, title: null, ign: "", uid: "", server: null }]);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  /* ---------- live preview ---------- */
  const previewProfile: PublicProfile = useMemo(
    () => ({
      ...p,
      display_name: values.display_name.trim() || "Your name",
      tagline: values.tagline.trim() || null,
      description: values.description.trim() || null,
      phone: values.phone.trim() || null,
      email: values.email.trim() || null,
      website: normalizeUrl(values.website),
      address: values.address.trim() || null,
      maps_url: normalizeUrl(values.maps_url),
      ...(Object.fromEntries(SOCIALS.map((s) => [s.key, socialUrl(s.key, values[s.key])])) as Record<SocialKey, string | null>),
      links: cleanLinks(links)
        .map((l) => ({ label: l.label || l.url, url: normalizeUrl(l.url) ?? "" }))
        .filter((l) => isSafeHttpUrl(l.url)),
      accent_color: accent,
      theme,
      logo_url: logoUrl,
      cover_url: coverUrl,
      kind: "personal",
      intro_enabled: values.intro_enabled,
      intro_greeting: values.intro_greeting,
      wallet: previewPasses(wallet),
      games: visibleGames(gamesKey(games)),
    }),
    [p, values, links, games, accent, theme, logoUrl, coverUrl, wallet]
  );
  const preview = (
    <ProfileView
      key={`${tab}-${introRun}`}
      profile={previewProfile}
      vcardHref={`/p/${p.slug}/vcard`}
      preview
      intro={introRun > 0}
      initialTab={tab}
    />
  );
  const replay = () => {
    setIntroRun((n) => n + 1);
    if (!desktop) setPreviewOpen(true);
  };

  /* ---------- profile checklist ---------- */
  const checks: { done: boolean; label: string; go: () => void }[] = [
    { done: Boolean(logoUrl), label: "Add a photo", go: () => photoInput.current?.click() },
    { done: Boolean(values.tagline.trim()), label: "Add a headline", go: () => focus("f-tagline") },
    { done: Boolean(values.description.trim()), label: "Write about you", go: () => focus("f-description") },
    { done: Boolean(values.phone.trim() || values.email.trim()), label: "Add a phone or email", go: () => focus("f-phone") },
    { done: SOCIALS.some((s) => values[s.key].trim()), label: "Link a social account", go: () => focus("f-facebook") },
    ...(walletReady ? [{ done: wallet.length > 0, label: "Add a QR to your Wallet", go: () => setTab("wallet") }] : []),
  ];
  const done = checks.filter((c) => c.done).length;
  function focus(id: string) {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => el?.focus({ preventScroll: true }), 350);
  }

  // Shown next to each tab's name: cards in the wallet, games with an ID.
  const shownGames = visibleGames(gamesKey(games)).length;
  const counts: Record<Tab, number> = { profile: 0, wallet: wallet.length, games: shownGames };

  const websiteBad = values.website.trim() && !isSafeHttpUrl(normalizeUrl(values.website));
  const mapsBad = values.maps_url.trim() && !isSafeHttpUrl(normalizeUrl(values.maps_url));

  return (
    <main
      data-settings-root=""
      className={`ios ${dark ? "ios-dark" : "ios-light"} min-h-dvh`}
      // color-scheme: native controls (dropdown lists, date and color pickers) follow the theme,
      // so a dropdown's options aren't white text on the browser's white list.
      style={{ background: "var(--ios-bg)", color: "var(--ios-label)", colorScheme: dark ? "dark" : "light" }}
    >
      {/* ───── Navigation bar ───── */}
      <header
        className="sticky top-0 z-30 pt-[env(safe-area-inset-top)]"
        style={{
          background: "color-mix(in srgb, var(--ios-bg) 78%, transparent)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
          backdropFilter: "saturate(180%) blur(20px)",
          borderBottom: "0.5px solid var(--ios-separator)",
        }}
      >
        <div className="mx-auto grid h-12 max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-4 lg:px-8">
          <a href={`/p/${p.slug}`} className="flex items-center gap-1 justify-self-start text-[17px]" style={{ color: tint }}>
            <svg viewBox="0 0 12 20" className="h-[17px] w-[10px]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 2 2 10l8 8" />
            </svg>
            My Card
          </a>

          <h1 className="text-[17px] font-semibold lg:hidden">{tab === "profile" ? "Edit Profile" : TAB_LABEL[tab]}</h1>
          {/* Desktop: the two sections as a segmented control */}
          <div className="hidden w-[330px] grid-cols-3 rounded-[9px] p-[2px] lg:grid" style={{ background: "var(--ios-fill)" }} role="tablist" aria-label="Settings sections">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className="h-8 cursor-pointer rounded-[7px] text-[13px] font-semibold capitalize transition-[background-color,box-shadow] duration-200"
                style={tab === t ? { background: dark ? "#636366" : "#fff", boxShadow: "0 3px 8px rgba(0,0,0,0.12), 0 3px 1px rgba(0,0,0,0.04)" } : undefined}
              >
                {TAB_LABEL[t]}
                {counts[t] > 0 && <span className="ml-1 font-medium tabular-nums opacity-55">{counts[t]}</span>}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 justify-self-end">
            <button type="button" onClick={() => setPreviewOpen(true)} className="cursor-pointer lg:hidden" style={{ color: tint }} aria-label="Preview your card">
              <Icon name="eye" className="h-[22px] w-[22px]" />
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending || !dirty}
              className="cursor-pointer text-[17px] font-semibold disabled:cursor-default disabled:opacity-40"
              style={{ color: tint }}
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </header>

      {/* ───── Toast ───── */}
      <div
        className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+60px)] z-40 flex justify-center px-4 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none"
        style={{ opacity: toast ? 1 : 0, transform: toast ? "none" : "translateY(-8px) scale(0.96)" }}
        role="status"
        aria-live="polite"
      >
        <span className="flex max-w-md items-center gap-2 rounded-full px-4 py-2 text-[15px] font-semibold shadow-[0_8px_30px_rgba(0,0,0,0.25)]" style={{ background: "var(--ios-cell)" }}>
          <span style={{ color: toast?.tone === "warn" ? "#FF9F0A" : "#30D158" }}>
            <Icon name={toast?.tone === "warn" ? "alert" : "check"} className="h-5 w-5" strokeWidth={2.6} />
          </span>
          <span className={toast?.tone === "warn" ? "text-[14px] leading-snug font-medium" : ""}>{toast?.text ?? ""}</span>
        </span>
      </div>

      <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14 lg:px-8">
        {/* ───── Left: the form ───── */}
        <div className="mx-auto w-full max-w-xl px-4 pb-[calc(env(safe-area-inset-bottom)+170px)] lg:px-0 lg:pb-32">
          <form
            ref={formRef}
            id="profile-form"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="accent_color" value={accent} />
            <input type="hidden" name="theme" value={theme} />
            <input type="hidden" name="links" value={cleanLinks(links).map((l) => `${l.label || l.url} | ${l.url}`).join("\n")} />
            {removePhoto && <input type="hidden" name="remove_photo" value="on" />}
            {removeCover && <input type="hidden" name="remove_cover" value="on" />}

            {welcome && !state.savedAt && (
              <div className="mt-5 flex gap-3 rounded-[14px] p-4" style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)` }}>
                <span style={{ color: tint }}>
                  <Icon name="sparkle" className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-[17px] font-semibold">Your card is live</p>
                  <p className="mt-1 text-[15px] leading-snug" style={{ color: "var(--ios-secondary)" }}>
                    Add a photo and your details, then tap Save. Whoever taps your card sees the changes right away.
                  </p>
                </div>
              </div>
            )}

            {state.error && (
              <p className="mt-5 flex gap-2 rounded-[12px] px-4 py-3 text-[15px] leading-snug" role="alert" style={{ background: "rgba(255,69,58,0.14)", color: "#FF6961" }}>
                <Icon name="alert" className="mt-0.5 h-[18px] w-[18px] shrink-0" />
                {state.error}
              </p>
            )}

            {/* ═════════ PROFILE TAB ═════════ */}
            <div hidden={tab !== "profile"}>
              {/* Identity card: cover, photo, name, link. Photo and cover changes go through one small menu. */}
              <section className="mt-5 overflow-hidden rounded-[20px]" style={{ background: "var(--ios-cell)" }}>
                <div
                  className="relative h-[148px]"
                  style={{
                    background: `radial-gradient(120% 140% at 100% 0%, color-mix(in srgb, ${accent} 70%, #fff) 0%, ${accent} 40%, color-mix(in srgb, ${accent} 55%, #000) 100%)`,
                  }}
                >
                  {coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "50% 30%" }} />
                  )}
                  {/* A soft shade at the top so the button reads on any photo. */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-black/30 to-transparent" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={() => (coverUrl ? openMedia("cover") : coverInput.current?.click())}
                    className="absolute top-3 right-3 flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-black/40 px-3 text-[13px] font-semibold text-white ring-1 ring-white/15 backdrop-blur-md transition-transform active:scale-95"
                  >
                    <Icon name={coverUrl ? "pencil" : "image"} className="h-[15px] w-[15px]" />
                    {coverUrl ? "Edit cover" : "Add cover"}
                  </button>
                </div>

                <div className="px-5 pb-5">
                  <button
                    type="button"
                    onClick={() => (logoUrl ? openMedia("photo") : photoInput.current?.click())}
                    className="group relative -mt-12 block cursor-pointer rounded-full"
                    aria-label={logoUrl ? "Change or remove your photo" : "Add a photo"}
                  >
                    <span
                      className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full text-[38px] font-bold transition-transform duration-150 group-active:scale-[0.96]"
                      style={{
                        background: logoUrl ? "var(--ios-fill)" : `linear-gradient(150deg, color-mix(in srgb, ${accent} 80%, #fff), ${accent} 45%, color-mix(in srgb, ${accent} 65%, #000))`,
                        color: onAccent,
                        boxShadow: "0 0 0 4px var(--ios-cell), 0 10px 28px -10px rgba(0,0,0,0.55)",
                      }}
                    >
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        values.display_name.trim().slice(0, 1).toUpperCase() || "?"
                      )}
                    </span>
                    <span
                      className="absolute right-0 bottom-0.5 flex h-[30px] w-[30px] items-center justify-center rounded-full"
                      style={{ background: "var(--ios-cell)", color: "var(--ios-label)", boxShadow: "0 0 0 0.5px var(--ios-separator), 0 2px 8px rgba(0,0,0,0.28)" }}
                      aria-hidden="true"
                    >
                      <Icon name="camera" className="h-[15px] w-[15px]" />
                    </span>
                  </button>

                  <p className="mt-3 truncate text-[24px] leading-tight font-bold" style={{ letterSpacing: "-0.025em" }}>
                    {values.display_name.trim() || "Your name"}
                  </p>
                  {values.tagline.trim() ? (
                    <p className="mt-0.5 truncate text-[15px]" style={{ color: "var(--ios-secondary)" }}>
                      {values.tagline.trim()}
                    </p>
                  ) : (
                    <button type="button" onClick={() => focus("f-tagline")} className="mt-0.5 cursor-pointer text-[15px] font-medium" style={{ color: tint }}>
                      Add a headline
                    </button>
                  )}

                  {/* Your link: copy it, or open the card */}
                  <div className="mt-4 flex items-center gap-1.5 rounded-[12px] py-1.5 pr-1.5 pl-3" style={{ background: "var(--ios-fill)" }}>
                    <span className="shrink-0" style={{ color: "var(--ios-secondary)" }}>
                      <Icon name="link" className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14px]">{host}</span>
                    <button
                      type="button"
                      onClick={copy}
                      className="flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-[9px] px-2.5 text-[13px] font-semibold transition-colors"
                      style={{ background: "var(--ios-cell)", color: copied ? "#30D158" : tint }}
                      aria-label={copied ? "Link copied" : `Copy your link ${host}`}
                    >
                      <Icon name={copied ? "check" : "copy"} className="h-[15px] w-[15px]" />
                      {copied ? "Copied" : "Copy"}
                    </button>
                    <a
                      href={`/p/${p.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]"
                      style={{ background: "var(--ios-cell)", color: "var(--ios-label)" }}
                      aria-label="Open your card in a new tab"
                      title="Open your card"
                    >
                      <Icon name="open" className="h-[15px] w-[15px]" />
                    </a>
                  </div>
                </div>

                <input ref={photoInput} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => pick(e, "photo")} />
                <input ref={coverInput} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => pick(e, "cover")} />
              </section>

              {/* Cover: move and scale */}
              <Sheet open={!!crop?.open} onClose={closeCropper} label="Move and scale your cover">
                {crop && (
                  <CoverCropper key={crop.src} src={crop.src} name={values.display_name.trim() || "Your name"} tint={tint} onCancel={closeCropper} onDone={cropped} />
                )}
              </Sheet>

              {/* Photo / cover menu */}
              <Sheet open={mediaOpen} onClose={closeMedia} label={mediaKind === "cover" ? "Cover photo" : "Profile photo"}>
                <div className="p-2 pb-[calc(env(safe-area-inset-bottom)+8px)]">
                  <div className="overflow-hidden rounded-[14px]" style={{ background: "var(--ios-cell)" }}>
                    <p className="px-4 pt-3.5 pb-3 text-center text-[13px] font-semibold" style={{ color: "var(--ios-secondary)", borderBottom: "0.5px solid var(--ios-separator)" }}>
                      {mediaKind === "cover" ? "Cover photo" : "Profile photo"}
                    </p>
                    {mediaKind === "cover" && coverUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          closeMedia();
                          setCrop({ src: coverSource.current ?? coverUrl, open: true });
                        }}
                        className="flex h-[54px] w-full cursor-pointer items-center justify-center gap-2 text-[17px]"
                        style={{ color: tint, borderBottom: "0.5px solid var(--ios-separator)" }}
                      >
                        <Icon name="pencil" /> Move and scale
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        closeMedia();
                        (mediaKind === "cover" ? coverInput : photoInput).current?.click();
                      }}
                      className="flex h-[54px] w-full cursor-pointer items-center justify-center gap-2 text-[17px]"
                      style={{ color: tint, borderBottom: "0.5px solid var(--ios-separator)" }}
                    >
                      <Icon name="image" /> Choose a new photo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        closeMedia();
                        if (mediaKind === "cover") {
                          coverSource.current = null;
                          setCover(null);
                          setRemoveCover(true);
                        } else {
                          setPhoto(null);
                          setRemovePhoto(true);
                        }
                      }}
                      className="flex h-[54px] w-full cursor-pointer items-center justify-center gap-2 text-[17px]"
                      style={{ color: "#FF453A" }}
                    >
                      <Icon name="trash" /> Remove {mediaKind === "cover" ? "cover" : "photo"}
                    </button>
                  </div>
                  <button type="button" onClick={closeMedia} className="mt-2 h-[54px] w-full cursor-pointer rounded-[14px] text-[17px] font-semibold" style={{ background: "var(--ios-cell)", color: tint }}>
                    Cancel
                  </button>
                </div>
              </Sheet>

              {/* Completeness */}
              {done < checks.length && (
                <section className="mt-4 rounded-[14px] p-4" style={{ background: "var(--ios-cell)" }}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[15px] font-semibold">Finish your card</p>
                    <p className="text-[13px] tabular-nums" style={{ color: "var(--ios-secondary)" }}>
                      {done} of {checks.length}
                    </p>
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--ios-fill)" }}>
                    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(done / checks.length) * 100}%`, background: tint }} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {checks
                      .filter((c) => !c.done)
                      .map((c) => (
                        <button
                          key={c.label}
                          type="button"
                          onClick={c.go}
                          className="flex h-8 cursor-pointer items-center gap-1 rounded-full px-3 text-[13px] font-semibold"
                          style={{ background: `color-mix(in srgb, ${tint} 14%, transparent)`, color: tint }}
                        >
                          <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2.6} />
                          {c.label}
                        </button>
                      ))}
                  </div>
                </section>
              )}

              <Group
                id="sec-intro"
                title="Intro"
                footer={
                  <>
                    People who tap your card first see{" "}
                    <b style={{ color: "var(--ios-label)" }}>
                      “{values.intro_greeting.trim() || "Hi, I’m"} {values.display_name.trim() || "…"}”
                    </b>{" "}
                    animate in.{" "}
                    {values.intro_enabled && (
                      <button type="button" onClick={replay} className="inline-flex cursor-pointer items-center gap-1 font-semibold" style={{ color: tint }}>
                        <Icon name="play" className="h-3 w-3" /> Play it
                      </button>
                    )}
                  </>
                }
              >
                <Row label="Name" htmlFor="f-name">
                  <input
                    id="f-name"
                    className="ios-input"
                    name="display_name"
                    value={values.display_name}
                    onChange={(e) => set("display_name", e.target.value)}
                    maxLength={80}
                    autoComplete="name"
                    placeholder="Your name"
                    required
                  />
                </Row>
                <Row label="Headline" htmlFor="f-tagline">
                  <input
                    id="f-tagline"
                    className="ios-input"
                    name="tagline"
                    value={values.tagline}
                    onChange={(e) => set("tagline", e.target.value)}
                    placeholder="Photographer · Marikina"
                    maxLength={120}
                  />
                </Row>
                <Row label="Greeting" htmlFor="f-greeting">
                  <input
                    id="f-greeting"
                    className="ios-input"
                    name="intro_greeting"
                    value={values.intro_greeting}
                    onChange={(e) => set("intro_greeting", e.target.value)}
                    placeholder="Hi, I’m"
                    maxLength={40}
                  />
                </Row>
                <label className="ios-field cursor-pointer">
                  <span className="flex-1 text-[17px]">Play intro animation</span>
                  <input
                    type="checkbox"
                    name="intro_enabled"
                    checked={values.intro_enabled}
                    onChange={(e) => set("intro_enabled", e.target.checked)}
                    className="ios-switch"
                  />
                </label>
              </Group>

              <Group id="sec-about" title="About" aside={<Counter value={values.description} max={1200} />}>
                <label className="ios-field">
                  <span className="sr-only">About you</span>
                  <textarea
                    id="f-description"
                    className="ios-input"
                    name="description"
                    value={values.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="A few lines about you and what you do."
                    maxLength={1200}
                  />
                </label>
              </Group>

              <Group id="sec-contact" title="Contact" footer="Shown as buttons on your card, and saved when someone taps Save Contact.">
                <Row icon={<GlyphTile name="phone" bg="#30D158" />} label="Phone" htmlFor="f-phone">
                  <input
                    id="f-phone"
                    className="ios-input"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    value={values.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="0917 123 4567"
                    autoComplete="tel"
                    maxLength={40}
                  />
                </Row>
                <Row icon={<GlyphTile name="mail" bg="#0A84FF" />} label="Email" htmlFor="f-email">
                  <input
                    id="f-email"
                    className="ios-input"
                    name="email"
                    type="email"
                    value={values.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={120}
                  />
                </Row>
                <Row icon={<GlyphTile name="globe" bg="#5E5CE6" />} label="Website" htmlFor="f-website" invalid={websiteBad && "Enter a web address, like yoursite.com"}>
                  <input
                    id="f-website"
                    className="ios-input"
                    name="website"
                    inputMode="url"
                    value={values.website}
                    onChange={(e) => set("website", e.target.value)}
                    placeholder="yoursite.com"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </Row>
                <Row icon={<GlyphTile name="map" bg="#FF453A" />} label="Address" htmlFor="f-address">
                  <input
                    id="f-address"
                    className="ios-input"
                    name="address"
                    value={values.address}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder="City or full address"
                    maxLength={240}
                    autoComplete="street-address"
                  />
                </Row>
                <Row icon={<GlyphTile name="pin" bg="#FF9F0A" />} label="Map link" htmlFor="f-maps" invalid={mapsBad && "Paste a Google Maps link"}>
                  <input
                    id="f-maps"
                    className="ios-input"
                    name="maps_url"
                    inputMode="url"
                    value={values.maps_url}
                    onChange={(e) => set("maps_url", e.target.value)}
                    placeholder="Google Maps link"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </Row>
              </Group>

              <Group id="sec-social" title="Social" footer="Type your username (like @maria) or paste the link.">
                {SOCIALS.map((s) => (
                  <Row
                    key={s.key}
                    icon={<SocialTile k={s.key} />}
                    label={s.label}
                    htmlFor={`f-${s.key}`}
                    invalid={!socialValid(s.key, values[s.key]) && `${s.label}: enter a username or a link`}
                  >
                    <input
                      id={`f-${s.key}`}
                      className="ios-input"
                      name={s.key}
                      value={values[s.key]}
                      onChange={(e) => set(s.key, e.target.value)}
                      placeholder={s.placeholder}
                      autoCapitalize="none"
                      spellCheck={false}
                    />
                  </Row>
                ))}
              </Group>

              <Group id="sec-links" title="Links" footer="Portfolio, booking page, shop: anything you want people to open.">
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
                        inputMode="url"
                        autoCapitalize="none"
                        spellCheck={false}
                        aria-label="Link address"
                        onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                      />
                    </div>
                    {l.url.trim() && !isSafeHttpUrl(normalizeUrl(l.url)) && (
                      <span className="shrink-0 text-[#FF453A]" role="img" aria-label="Not a valid link">
                        <Icon name="alert" />
                      </span>
                    )}
                  </div>
                ))}
                {links.length < 12 && (
                  <button type="button" className="ios-field w-full cursor-pointer text-left" onClick={() => setLinks([...links, { label: "", url: "" }])}>
                    <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full" style={{ background: "#30D158" }} aria-hidden="true">
                      <Icon name="plus" className="h-3 w-3 text-white" strokeWidth={3} />
                    </span>
                    <span className="text-[17px]" style={{ color: tint }}>
                      Add Link
                    </span>
                  </button>
                )}
              </Group>

              <Group id="sec-look" title="Appearance">
                {/* Color: label on top, one even row of swatches below */}
                <div className="ml-4 pt-3.5 pr-4 pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[17px]">Color</span>
                    <span className="flex items-center gap-2 text-[13px] uppercase tabular-nums" style={{ color: "var(--ios-secondary)" }}>
                      <span className="h-3 w-3 rounded-full" style={{ background: accent }} />
                      {accent}
                    </span>
                  </div>
                  <div className="mt-3.5 grid grid-cols-9 justify-items-center" role="radiogroup" aria-label="Accent color">
                    {SWATCHES.map((c) => {
                      const on = accent.toLowerCase() === c.toLowerCase();
                      return (
                        <button
                          key={c}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          aria-label={c}
                          onClick={() => setAccent(c)}
                          className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full transition-transform duration-150 active:scale-90"
                          style={{
                            background: c,
                            color: onColor(c),
                            boxShadow: on ? `0 0 0 2px var(--ios-cell), 0 0 0 3.5px ${c}` : "inset 0 0 0 0.5px rgba(0,0,0,0.15)",
                          }}
                        >
                          {on && <Icon name="check" className="h-4 w-4" strokeWidth={3} />}
                        </button>
                      );
                    })}
                    {(() => {
                      const custom = !SWATCHES.some((c) => c.toLowerCase() === accent.toLowerCase());
                      return (
                        <label
                          className="relative flex h-[30px] w-[30px] cursor-pointer items-center justify-center overflow-hidden rounded-full"
                          style={{
                            background: "conic-gradient(#FF375F, #FF9F0A, #FFD60A, #30D158, #64D2FF, #5E5CE6, #BF5AF2, #FF375F)",
                            boxShadow: custom ? `0 0 0 2px var(--ios-cell), 0 0 0 3.5px ${accent}` : undefined,
                          }}
                          aria-label="Custom color"
                        >
                          {custom && <span className="h-3.5 w-3.5 rounded-full" style={{ background: accent, boxShadow: "0 0 0 2px #fff" }} />}
                          <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
                        </label>
                      );
                    })()}
                  </div>
                </div>

                {/* Theme: two small previews */}
                <div className="ml-4 pt-3.5 pr-4 pb-4" style={{ borderTop: "0.5px solid var(--ios-separator)" }}>
                  <span className="text-[17px]">Theme</span>
                  <div className="mt-3 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Theme">
                    {(["dark", "light"] as const).map((t) => {
                      const on = theme === t;
                      const bg = t === "dark" ? "#000" : "#f2f2f7";
                      const cell = t === "dark" ? "#1c1c1e" : "#fff";
                      return (
                        <button
                          key={t}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => setTheme(t)}
                          className="cursor-pointer rounded-[14px] p-2 text-left transition-[box-shadow] duration-200"
                          style={{ background: "var(--ios-fill)", boxShadow: on ? `inset 0 0 0 2px ${tint}` : "none" }}
                        >
                          <span className="block overflow-hidden rounded-[9px] p-1.5" style={{ background: bg, boxShadow: "inset 0 0 0 0.5px rgba(127,127,127,0.35)" }} aria-hidden="true">
                            <span className="block h-5 rounded-[5px]" style={{ background: accent }} />
                            <span className="mt-1.5 block h-1.5 w-1/2 rounded-full" style={{ background: t === "dark" ? "#fff" : "#000", opacity: 0.85 }} />
                            <span className="mt-1.5 block h-4 rounded-[4px]" style={{ background: cell }} />
                          </span>
                          <span className="mt-2 flex items-center justify-between px-0.5">
                            <span className="text-[14px] font-semibold capitalize">{t}</span>
                            <span
                              className="flex h-5 w-5 items-center justify-center rounded-full"
                              style={on ? { background: tint, color: onColor(tint) } : { boxShadow: "inset 0 0 0 1.5px var(--ios-tertiary)" }}
                            >
                              {on && <Icon name="check" className="h-3 w-3" strokeWidth={3.2} />}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Group>
            </div>

            {/* ═════════ WALLET TAB ═════════ */}
            <div hidden={tab !== "wallet"}>
              <WalletEditor available={walletReady} wallet={wallet} setWallet={setWallet} ownerName={values.display_name.trim() || p.display_name} shareUrl={shareUrl} accent={accent} tint={tint} />
            </div>

            {/* ═════════ GAMES TAB ═════════ */}
            <div hidden={tab !== "games"}>
              <div className="px-1 pt-6">
                <h2 className="text-[28px] leading-tight font-bold" style={{ letterSpacing: "-0.025em" }}>
                  Games
                </h2>
                <p className="mt-1 text-[15px] leading-snug" style={{ color: "var(--ios-secondary)" }}>
                  Your in-game IDs, so friends can add you. A <b style={{ color: "var(--ios-label)" }}>Games</b> tab appears on your card as soon as one has an ID.
                </p>
              </div>

              {!gamesReady && (
                <p className="mt-5 flex gap-2.5 rounded-[14px] px-4 py-3 text-[14px] leading-snug" style={{ background: "rgba(255,159,10,0.14)" }}>
                  <span className="mt-px shrink-0 text-[#FF9F0A]">
                    <Icon name="alert" />
                  </span>
                  Game IDs aren’t switched on yet. You can fill them in, but ask Triio to finish the update before they’ll save.
                </p>
              )}

              {games.length === 0 ? (
                <div className="mt-6 rounded-[16px] px-5 pt-8 pb-6 text-center" style={{ background: "var(--ios-cell)" }}>
                  <div className="mx-auto flex w-fit gap-1.5" aria-hidden="true">
                    {["mlbb", "codm", "genshin", "valorant"].map((k, i) => (
                      <span key={k} className="rounded-[15px]" style={{ boxShadow: "0 0 0 3px var(--ios-cell)", transform: `rotate(${(i - 1.5) * 7}deg) translateY(${Math.abs(i - 1.5) * 3}px)` }}>
                        <GameTile game={k} large />
                      </span>
                    ))}
                  </div>
                  <p className="mt-5 text-[17px] font-semibold">No games yet</p>
                  <p className="mx-auto mt-1 max-w-xs text-[14px] leading-snug" style={{ color: "var(--ios-secondary)" }}>
                    Add Mobile Legends, CODM, Genshin and more. People can copy your ID straight from your card.
                  </p>
                  <button
                    type="button"
                    onClick={addGame}
                    className="mt-5 inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-5 text-[15px] font-semibold"
                    style={{ background: accent, color: onAccent }}
                  >
                    <Icon name="plus" className="h-4 w-4" strokeWidth={2.6} />
                    Add a game
                  </button>
                </div>
              ) : (
                <Group
                  id="sec-games"
                  title="Your games"
                  aside={<span className="tabular-nums">{games.length} of {GAMES_MAX}</span>}
                  footer="Each game gets a Copy button on your card. A game without an ID stays hidden."
                >
                  {games.map((g, i) => {
                    const info = gameOf(g.game);
                    const edit = (patch: Partial<GameId>) => setGames(games.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                    // One labeled line inside a game entry (label on the left, like the other settings rows).
                    const line = (label: string, input: React.ReactNode) => (
                      <label className="flex items-center gap-2" style={{ borderTop: "0.5px solid var(--ios-separator)" }}>
                        <span className="w-[76px] shrink-0 truncate text-[13px]" style={{ color: "var(--ios-secondary)" }}>
                          {label}
                        </span>
                        {input}
                      </label>
                    );
                    return (
                      <div key={i} className="ios-field gap-3 py-1.5" style={{ alignItems: "flex-start" }}>
                        <button
                          type="button"
                          className="mt-[11px] flex h-[22px] w-[22px] shrink-0 cursor-pointer items-center justify-center rounded-full"
                          style={{ background: "#FF453A" }}
                          onClick={() => setGames(games.filter((_, j) => j !== i))}
                          aria-label={`Remove ${info.name}`}
                        >
                          <span className="h-[2px] w-[10px] rounded-full bg-white" />
                        </button>
                        <span className="mt-[7px]">
                          <GameTile game={g.game} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <select
                            className="ios-input block w-full cursor-pointer py-2 font-semibold"
                            value={info.key}
                            aria-label="Game"
                            onChange={(e) => edit({ game: e.target.value, server: gameOf(e.target.value).serverLabel ? g.server : null })}
                          >
                            {GAMES.map((x) => (
                              <option key={x.key} value={x.key} style={optionStyle}>
                                {x.name}
                              </option>
                            ))}
                          </select>
                          {info.key === "other" &&
                            line(
                              "Game",
                              <input
                                className="ios-input block w-full py-2"
                                value={g.title ?? ""}
                                placeholder="Game name"
                                maxLength={40}
                                onChange={(e) => edit({ title: e.target.value })}
                              />
                            )}
                          {line(
                            "IGN",
                            <input
                              className="ios-input block w-full py-2"
                              value={g.ign ?? ""}
                              placeholder="Optional"
                              maxLength={40}
                              autoCapitalize="none"
                              spellCheck={false}
                              onChange={(e) => edit({ ign: e.target.value })}
                            />
                          )}
                          {line(
                            info.idLabel,
                            <input
                              className="ios-input block w-full py-2 font-mono"
                              value={g.uid}
                              placeholder={info.idPlaceholder}
                              maxLength={40}
                              autoCapitalize="none"
                              spellCheck={false}
                              onChange={(e) => edit({ uid: e.target.value })}
                            />
                          )}
                          {info.serverLabel &&
                            line(
                              info.serverLabel,
                              <input
                                className="ios-input block w-full py-2 font-mono"
                                value={g.server ?? ""}
                                placeholder={info.serverPlaceholder}
                                maxLength={20}
                                autoCapitalize="none"
                                spellCheck={false}
                                onChange={(e) => edit({ server: e.target.value })}
                              />
                            )}
                        </div>
                        {!g.uid.trim() && (g.ign?.trim() || g.title?.trim()) && (
                          <span className="mt-[11px] shrink-0 text-[#FF9F0A]" role="img" aria-label={`Add your ${info.idLabel}, or this game won't be shown`} title={`Add your ${info.idLabel}, or this game won't be shown`}>
                            <Icon name="alert" />
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {games.length < GAMES_MAX && (
                    <button
                      type="button"
                      className="ios-field w-full cursor-pointer text-left"
                      onClick={addGame}
                    >
                      <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full" style={{ background: "#30D158" }} aria-hidden="true">
                        <Icon name="plus" className="h-3 w-3 text-white" strokeWidth={3} />
                      </span>
                      <span className="text-[17px]" style={{ color: tint }}>
                        Add Game
                      </span>
                    </button>
                  )}
                </Group>
              )}
            </div>
          </form>

          {/* Account (its own form: logging out isn't part of saving) */}
          <form action={ownerSignOut} hidden={tab !== "profile"}>
            <Group title="Account">
              <Row icon={<GlyphTile name="person" bg="#8E8E93" />}>
                <span className="min-w-0 flex-1 truncate text-[17px]" style={{ color: "var(--ios-secondary)" }}>
                  {email}
                </span>
              </Row>
              <button className="ios-field w-full cursor-pointer justify-center gap-2 text-[17px]" style={{ color: "#FF453A" }}>
                <Icon name="logout" /> Log Out
              </button>
            </Group>
          </form>
        </div>

        {/* ───── Right: live preview (desktop) ───── */}
        {desktop && (
          <aside className="sticky top-12 flex h-[calc(100dvh-48px)] flex-col items-center justify-center py-6" aria-label="Live preview">
            <div className="mb-3 flex w-full max-w-[340px] items-center justify-between text-[13px]">
              <span className="flex items-center gap-1.5 font-semibold" style={{ color: "var(--ios-secondary)" }}>
                <span className={`h-2 w-2 rounded-full ${dirty ? "bg-[#FF9F0A]" : "bg-[#30D158]"}`} />
                {dirty ? "Preview · not saved" : "Live preview"}
              </span>
              <span className="flex gap-3">
                {values.intro_enabled && (
                  <button type="button" onClick={replay} className="flex cursor-pointer items-center gap-1 font-semibold" style={{ color: tint }}>
                    <Icon name="play" className="h-3 w-3" /> Intro
                  </button>
                )}
                <a href={`/p/${p.slug}`} target="_blank" rel="noreferrer" className="font-semibold" style={{ color: tint }}>
                  Open ↗
                </a>
              </span>
            </div>
            <div className="phone-frame">
              <div className="phone-screen">
                <div data-preview-scroll="" className="phone-scroll">
                  {preview}
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ───── Unsaved changes bar ───── */}
      <div className="savebar" data-show={dirty} aria-hidden={!dirty}>
        <span className="px-2 text-[14px] font-medium" style={{ color: "var(--ios-secondary)" }}>
          Unsaved changes
        </span>
        <button type="button" onClick={discard} disabled={pending} tabIndex={dirty ? 0 : -1} className="h-9 cursor-pointer rounded-full px-3.5 text-[14px] font-semibold" style={{ color: "var(--ios-label)" }}>
          Discard
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          tabIndex={dirty ? 0 : -1}
          className="h-9 cursor-pointer rounded-full px-4 text-[14px] font-semibold disabled:opacity-60"
          style={{ background: accent, color: onAccent }}
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>

      {/* ───── Bottom navigation (phone) ───── */}
      <nav className="tabbar lg:hidden" style={{ "--tint": tint, "--i": TABS.indexOf(tab) } as React.CSSProperties} aria-label="Settings sections">
        <div role="tablist" className="tabbar-list" style={{ gridTemplateColumns: "repeat(3, 96px)" }}>
          <span className="tabbar-pill" aria-hidden="true" />
          {TABS.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className="tabbar-item">
              <span className="relative">
                <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={TAB_ICONS[t]} />
                </svg>
                {counts[t] > 0 && (
                  <span className="absolute -top-1 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold" style={{ background: "var(--ios-label)", color: "var(--ios-bg)" }}>
                    {counts[t]}
                  </span>
                )}
              </span>
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>
      </nav>

      {/* ───── Full-screen preview (phone) ───── */}
      {!desktop && previewOpen && (
        <div className="fixed inset-0 z-[80] flex flex-col" style={{ background: "var(--ios-bg)" }} role="dialog" aria-modal="true" aria-label="Preview of your card">
          <div className="phone-screen flex-1">
            <div data-preview-scroll="" className="phone-scroll">
              {preview}
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+10px)] z-[90] flex justify-center">
            <span className="pointer-events-auto flex items-center gap-1 rounded-full bg-black/60 p-1 pl-3.5 text-[13px] font-semibold text-white backdrop-blur-md">
              {dirty ? "Preview · not saved" : "Preview"}
              <button type="button" onClick={() => setPreviewOpen(false)} className="ml-1 h-7 cursor-pointer rounded-full bg-white/20 px-3" autoFocus>
                Done
              </button>
            </span>
          </div>
        </div>
      )}
    </main>
  );
}
