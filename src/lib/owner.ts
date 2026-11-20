import type { Viewer } from "@/components/ProfileView";
import { createClient } from "@/lib/supabase/server";

/** Is someone logged in, and do they own this profile? Never throws — a public page must always render. */
export async function getViewer(slug: string): Promise<Viewer> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { loggedIn: false, isOwner: false };
    const { data } = await supabase.from("profiles").select("owner_id").eq("slug", slug).maybeSingle<{ owner_id: string | null }>();
    return { loggedIn: true, isOwner: data?.owner_id === user.id };
  } catch {
    return { loggedIn: false, isOwner: false };
  }
}

/** The logged-in user's email, or null. */
export async function getUserEmail(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.email ?? null;
  } catch {
    return null;
  }
}
