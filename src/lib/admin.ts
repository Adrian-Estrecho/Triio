import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Returns a Supabase client for a logged-in admin, or redirects. Use in every admin page and action. */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  return { supabase, user, isAdmin: Boolean(isAdmin) };
}

/** Throws a readable error when a Supabase call fails. (Writes without .select() return null data — ignore it.) */
export function check<T>(result: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data as NonNullable<T>;
}
