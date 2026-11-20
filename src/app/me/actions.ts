"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { isSafeHttpUrl, normalizeUrl, parseLinks, str } from "@/lib/utils";

export type FormState = { error?: string; notice?: string; savedAt?: number };

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

async function uploadPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  file: FormDataEntryValue | null,
  kind: "photo" | "cover"
): Promise<string | undefined> {
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (!file.type.startsWith("image/")) throw new Error("Please choose a photo (JPG, PNG or WEBP).");
  if (file.size > MAX_PHOTO) throw new Error("That photo is too big — keep it under 4 MB.");
  const ext = (file.type.split("/")[1] || "jpg").replace(/[^a-z0-9]/g, "").replace("jpeg", "jpg");
  // The storage policy only allows writes inside owners/{your user id}/.
  const path = `owners/${userId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("brand-assets").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Couldn't upload the photo: ${error.message}`);
  return supabase.storage.from("brand-assets").getPublicUrl(path).data.publicUrl;
}

function clip(v: FormDataEntryValue | null, max: number) {
  const s = str(v);
  return s ? s.slice(0, max) : null;
}

export async function updateMyProfile(_prev: FormState, f: FormData): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/me/login");

  const profileId = str(f.get("id"));
  const { data: current } = await supabase
    .from("profiles")
    .select("id, slug")
    .eq("id", profileId ?? "")
    .eq("owner_id", user.id)
    .maybeSingle<{ id: string; slug: string }>();
  if (!current) return { error: "You can only edit your own profile." };

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
    facebook: normalizeUrl(f.get("facebook")),
    instagram: normalizeUrl(f.get("instagram")),
    tiktok: normalizeUrl(f.get("tiktok")),
    messenger: normalizeUrl(f.get("messenger")),
    whatsapp: normalizeUrl(f.get("whatsapp")),
    viber: normalizeUrl(f.get("viber")),
    links: parseLinks(str(f.get("links"))).slice(0, 12),
    accent_color: /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : "#38BDF8",
    theme: f.get("theme") === "light" ? "light" : "dark",
  };

  const labels: Record<string, string> = {
    website: "Website",
    maps_url: "Map link",
    facebook: "Facebook",
    instagram: "Instagram",
    tiktok: "TikTok",
    messenger: "Messenger",
    whatsapp: "WhatsApp",
    viber: "Viber",
  };
  for (const key of Object.keys(labels)) {
    const v = update[key] as string | null;
    if (v && !isSafeHttpUrl(v)) return { error: `${labels[key]} must be a web link (https://…).` };
  }

  try {
    const photo = await uploadPhoto(supabase, user.id, f.get("photo"), "photo");
    if (photo) update.logo_url = photo;
    else if (f.get("remove_photo") === "on") update.logo_url = null;

    const cover = await uploadPhoto(supabase, user.id, f.get("cover"), "cover");
    if (cover) update.cover_url = cover;
    else if (f.get("remove_cover") === "on") update.cover_url = null;
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", current.id).eq("owner_id", user.id);
  if (error) return { error: `Couldn't save: ${error.message}` };

  revalidatePath("/me");
  revalidatePath(`/p/${current.slug}`);
  return { savedAt: Date.now() };
}
