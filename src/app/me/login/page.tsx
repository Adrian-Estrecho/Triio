import { redirect } from "next/navigation";
import { getUserEmail } from "@/lib/owner";
import { OwnerLoginForm } from "./form";

export const metadata = { title: "Log in to your card", robots: { index: false } };

export default async function OwnerLoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; switch?: string }> }) {
  const { next, error, switch: switching } = await searchParams;
  if (!switching && (await getUserEmail())) redirect(next?.startsWith("/me") ? next : "/me");
  return <OwnerLoginForm next={next ?? "/me"} initialError={error} />;
}
