"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { NEW_SOCIALS, SOCIALS, socialUrl } from "@/lib/social";
import type { GameId, WalletKind, WalletPass } from "@/lib/types";
import { cleanGames } from "@/lib/games";
import { isSafeHttpUrl, normalizeUrl, parseLinks, str } from "@/lib/utils";
import { WALLET_MAX, bankOf, presetOf } from "@/lib/wallet";

export type FormState = {
  error?: string;
  notice?: string;
  /** Saved, but something couldn't be (e.g. the wallet before supabase/wallet.sql is run). */
  warning?: string;
  savedAt?: number;
  /** What was actually saved, so the form can drop its local copies of uploaded files. */
  saved?: { logo_url: string | null; cover_url: string | null; wallet: WalletPass[] | null; games: GameId[] | null };
};

/** Turn Supabase auth errors into something a card owner can act on. */
function friendly(message: string) {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered")) return "That email already has an account. Tap “I already have an account” to log in.";
  if (m.includes("invalid login")) return "Wrong email or password.";
  if (m.includes("email not confirmed")) return "Please confirm your email first — check your inbox for the link.";
  if (m.includes("signups not allowed") || m.includes("signup is disabled")) return "New accounts are turned off right now. Please contact Triio.";
  if (m.includes("password")) return message;
  if (m.includes("rate limit")) return "Too many tries. Please wait a minute and try again.";
  return message;
}

/** Only allow redirects back into the owner pages or a card. */
function safeNext(raw: FormDataEntryValue | null) {
  const next = String(raw ?? "/me");
  return /^\/(me|c\/[A-Za-z0-9]{4,16}|p\/[a-z0-9-]+)(\/|\?|$)/.test(next) ? next : "/me";
}

/* ============================== CARD SETUP ============================== */

/**
 * First tap on a new personal card: create an account (or log in), then claim the card
 * with the setup code that came with it. Bound to the card code.
 */
export async function setupCard(cardCode: string, _prev: FormState, f: FormData): Promise<FormState> {
  if (!/^[A-Za-z0-9]{4,16}$/.test(cardCode)) return { error: "This card link isn't valid." };
  const mode = String(f.get("mode") ?? "claim");
  const name = str(f.get("name"));
  const setupCode = str(f.get("setup_code"));
  if (!setupCode) return { error: "Enter the setup code that came with your card." };

  const supabase = await createClient();
  let {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const email = str(f.get("email"));
    const password = String(f.get("password") ?? "");
    if (!email || !password) return { error: "Enter your email and a password." };

    if (mode === "signup") {
      if (password.length < 8) return { error: "Use a password with at least 8 characters." };
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(`/c/${cardCode}?notice=confirm-email`)}`,
        },
      });
      if (error) return { error: friendly(error.message) };
      // "Confirm email" is on in Supabase: they must click the link, then come back to the card.
      if (!data.session) {
        return { notice: `We sent a link to ${email}. Open it to confirm your email, then tap your card again to finish — keep your setup code handy.` };
      }
      user = data.user;
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: friendly(error.message) };
      user = data.user;
    }
  }

  const { data, error } = await supabase.rpc("claim_card", { p_code: cardCode, p_claim: setupCode, p_name: name ?? "" });
  if (error) return { error: error.message };
  const res = data as { ok: boolean; error?: string; slug?: string };
  if (!res?.ok) return { error: res?.error ?? "Couldn't set up this card." };

  revalidatePath(`/c/${cardCode}`);
  redirect("/me?welcome=1");
}

/* ============================== LOG IN / OUT ============================== */

export async function ownerSignIn(_prev: FormState, f: FormData): Promise<FormState> {
  const email = str(f.get("email"));
  const password = String(f.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: friendly(error.message) };
  redirect(safeNext(f.get("next")));
}

export async function ownerSignOut(f?: FormData) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(f?.get("next") ? safeNext(f.get("next")) : "/me/login");
}

/* ============================== EDIT PROFILE ============================== */

const MAX_PHOTO = 4 * 1024 * 1024;

type Db = Awaited<ReturnType<typeof createClient>>;

async function uploadImage(supabase: Db, userId: string, file: FormDataEntryValue | null, kind: "photo" | "cover" | "qr" | "logo"): Promise<string | undefined> {
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (!file.type.startsWith("image/") || file.type.includes("svg")) throw new Error("Please choose a photo (JPG, PNG or WEBP).");
  if (file.size > MAX_PHOTO) throw new Error("That photo is too big — keep it under 4 MB.");
  const ext = (file.type.split("/")[1] || "jpg").replace(/[^a-z0-9]/g, "").replace("jpeg", "jpg");
  // The storage policy only allows writes inside owners/{your user id}/.
  const path = `owners/${userId}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("brand-assets").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Couldn't upload the photo: ${error.message}`);
  return supabase.storage.from("brand-assets").getPublicUrl(path).data.publicUrl;
}

function clip(v: FormDataEntryValue | null, max: number) {
  const s = str(v);
  return s ? s.slice(0, max) : null;
}

const WALLET_KINDS = new Set<WalletKind>(["gcash", "maya", "bank", "link", "profile", "custom"]);

function text(v: unknown, max: number) {
  if (typeof v !== "string") return null;
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return s ? s.slice(0, max) : null;
}

/**
 * The wallet arrives as JSON plus one optional image per pass (`wallet_qr_<id>`).
 * Every pass needs a QR: text to encode, a new image, or an image it already had.
 * Image links are never taken from the form: only ones this profile saved before.
 */
async function readWallet(supabase: Db, userId: string, f: FormData, previous: WalletPass[], profileUrl: string): Promise<WalletPass[]> {
  let items: unknown;
  try {
    items = JSON.parse(String(f.get("wallet") ?? "[]"));
  } catch {
    throw new Error("Your wallet couldn't be read. Reload the page and try again.");
  }
  if (!Array.isArray(items)) throw new Error("Your wallet couldn't be read. Reload the page and try again.");
  if (items.length > WALLET_MAX) throw new Error(`You can keep up to ${WALLET_MAX} cards in your wallet.`);

  const knownImages = new Set(previous.map((p) => p.qr_image).filter(Boolean));
  const knownLogos = new Set(previous.map((p) => p.logo).filter(Boolean));
  const ids = new Set<string>();
  const out: WalletPass[] = [];

  for (const raw of items as Record<string, unknown>[]) {
    const id = typeof raw?.id === "string" && /^[a-z0-9]{4,24}$/.test(raw.id) ? raw.id : null;
    if (!id || ids.has(id)) throw new Error("Your wallet couldn't be read. Reload the page and try again.");
    ids.add(id);

    const kind: WalletKind = WALLET_KINDS.has(raw.kind as WalletKind) ? (raw.kind as WalletKind) : "custom";
    const preset = presetOf(kind);
    const title = text(raw.title, 40) ?? (preset.title || "QR code");
    const color = typeof raw.color === "string" && /^#[0-9a-fA-F]{6}$/.test(raw.color) ? raw.color : preset.color;

    // "My card" always points at this profile.
    let qr_text = kind === "profile" ? profileUrl : text(raw.qr_text, 1200);
    let qr_image: string | null = null;
    if (!qr_text) {
      qr_image = (await uploadImage(supabase, userId, f.get(`wallet_qr_${id}`), "qr")) ?? null;
      if (!qr_image && typeof raw.qr_image === "string" && knownImages.has(raw.qr_image)) qr_image = raw.qr_image;
    }
    if (qr_text === "") qr_text = null;
    if (!qr_text && !qr_image) throw new Error(`Add a QR code to “${title}” in your wallet, or remove it.`);

    // Logo: a new upload, or one this profile already had.
    let logo = (await uploadImage(supabase, userId, f.get(`wallet_logo_${id}`), "logo")) ?? null;
    if (!logo && typeof raw.logo === "string" && knownLogos.has(raw.logo)) logo = raw.logo;
    const bank = kind === "bank" && typeof raw.bank === "string" ? (bankOf(raw.bank)?.id ?? null) : null;

    out.push({ id, kind, title, name: text(raw.name, 60), number: text(raw.number, 40), color, qr_text, qr_image, bank, logo });
  }
  return out;
}

export async function updateMyProfile(_prev: FormState, f: FormData): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/me/login");

  const profileId = str(f.get("id"));
  // select("*") so this keeps working before the wallet column exists.
  const { data: current } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId ?? "")
    .eq("owner_id", user.id)
    .maybeSingle<{ id: string; slug: string; logo_url: string | null; cover_url: string | null; wallet?: WalletPass[]; games?: GameId[] }>();
  if (!current) return { error: "You can only edit your own profile." };
  const walletReady = "wallet" in current;
  const gamesReady = "games" in current;
  const socialsReady = "youtube" in current;

  const display_name = clip(f.get("display_name"), 80);
  if (!display_name) return { error: "Your name can't be empty." };

  const accent = str(f.get("accent_color")) ?? "#38BDF8";
  const update: Record<string, unknown> = {
    display_name,
    tagline: clip(f.get("tagline"), 120),
    description: clip(f.get("description"), 1200),
    intro_greeting: clip(f.get("intro_greeting"), 40),
    intro_enabled: f.get("intro_enabled") === "on",
    phone: clip(f.get("phone"), 40),
    email: clip(f.get("email"), 120),
    website: normalizeUrl(f.get("website")),
    address: clip(f.get("address"), 240),
    maps_url: normalizeUrl(f.get("maps_url")),
    links: parseLinks(str(f.get("links"))).slice(0, 12),
    accent_color: /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : "#38BDF8",
    theme: f.get("theme") === "light" ? "light" : "dark",
  };
  // Social accounts: a username or a link, saved as a link.
  for (const s of SOCIALS) update[s.key] = socialUrl(s.key, str(f.get(s.key)));

  const labels: Record<string, string> = { website: "Website", maps_url: "Map link", ...Object.fromEntries(SOCIALS.map((s) => [s.key, s.label])) };
  for (const key of Object.keys(labels)) {
    const v = update[key] as string | null;
    if (v && !isSafeHttpUrl(v)) return { error: `${labels[key]}: enter a username or a web link (https://…).` };
  }
  let warning: string | undefined;
  // YouTube and LinkedIn need supabase/socials.sql; until then, save everything else.
  if (!socialsReady) {
    if (NEW_SOCIALS.some((k) => update[k])) warning = "Your profile is saved, but YouTube and LinkedIn aren't switched on yet. Ask Triio to finish the update, then add them again.";
    for (const k of NEW_SOCIALS) delete update[k];
  }

  let wallet: WalletPass[] = current.wallet ?? [];
  let games: GameId[] = current.games ?? [];
  try {
    if (f.has("games")) {
      let items: unknown;
      try {
        items = JSON.parse(String(f.get("games")));
      } catch {
        throw new Error("Your game IDs couldn't be read. Reload the page and try again.");
      }
      const cleaned = cleanGames(items);
      if (gamesReady) {
        games = cleaned;
        update.games = games;
      } else if (cleaned.length) {
        warning = "Your profile is saved, but Game IDs aren't switched on yet. Ask Triio to finish the update, then add your games again.";
      }
    }

    const photo = await uploadImage(supabase, user.id, f.get("photo"), "photo");
    if (photo) update.logo_url = photo;
    else if (f.get("remove_photo") === "on") update.logo_url = null;

    const cover = await uploadImage(supabase, user.id, f.get("cover"), "cover");
    if (cover) update.cover_url = cover;
    else if (f.get("remove_cover") === "on") update.cover_url = null;

    if (f.has("wallet")) {
      if (walletReady) {
        wallet = await readWallet(supabase, user.id, f, current.wallet ?? [], `${siteUrl()}/p/${current.slug}`);
        update.wallet = wallet;
      } else if (String(f.get("wallet")) !== "[]") {
        warning = "Your profile is saved, but the Wallet isn't switched on yet. Ask Triio to finish the update, then add your cards again.";
      }
    }
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", current.id).eq("owner_id", user.id);
  if (error) return { error: `Couldn't save: ${error.message}` };

  revalidatePath("/me");
  revalidatePath(`/p/${current.slug}`);
  return {
    savedAt: Date.now(),
    warning,
    saved: {
      logo_url: "logo_url" in update ? (update.logo_url as string | null) : current.logo_url,
      cover_url: "cover_url" in update ? (update.cover_url as string | null) : current.cover_url,
      wallet: walletReady ? wallet : null,
      games: gamesReady ? games : null,
    },
  };
}
