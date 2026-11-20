import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { CONCERN_STATUSES, CONCERN_TOPICS, labelOf } from "@/lib/constants";
import { isMissingTable } from "@/lib/automation/db";
import type { Concern } from "@/lib/types";
import { siteUrl } from "@/lib/env";
import { fmtDate } from "@/lib/utils";
import { Badge, Empty, PageHeader } from "@/components/admin/fields";
import { CopyButton } from "@/components/admin/ui";

export const metadata = { title: "Concerns" };

type SP = Promise<{ status?: string }>;

const statusBadge: Record<string, string> = { open: "unpaid", in_progress: "partial", resolved: "paid" };

export default async function ConcernsPage({ searchParams }: { searchParams: SP }) {
  const { status = "active" } = await searchParams;
  const { supabase: db } = await requireAdmin();

  let q = db.from("concerns").select("*").order("created_at", { ascending: false }).limit(200);
  if (status === "active") q = q.neq("status", "resolved");
  else if (status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error && !isMissingTable(error)) throw new Error(`Concerns: ${error.message}`);
  const concerns = (data ?? []) as Concern[];
  const supportUrl = `${siteUrl()}/support`;

  const tabs = [
    { value: "active", label: "Open & replied" },
    { value: "open", label: "Open" },
    { value: "resolved", label: "Resolved" },
    { value: "all", label: "All" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Concerns" subtitle="Questions and problems customers send from your support page. They get an automatic reply, and you get an email.">
        <CopyButton text={supportUrl} label="Copy support page link" />
        <a href="/support" target="_blank" rel="noreferrer" className="btn btn-ghost">Open support page</a>
      </PageHeader>

      {error && (
        <div className="card text-sm ring-2 ring-amber-300">
          Run <code className="rounded bg-surface-3 px-1.5">supabase/automations.sql</code> in Supabase to turn on concerns.
        </div>
      )}

      <nav className="flex flex-wrap gap-2" aria-label="Filter concerns">
        {tabs.map((t) => (
          <Link
            key={t.value}
            href={`/admin/concerns?status=${t.value}`}
            aria-current={status === t.value ? "page" : undefined}
            className={`btn text-xs ${status === t.value ? "btn-primary" : "btn-ghost"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="card overflow-x-auto p-0">
        {concerns.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>From</th>
                <th>Topic</th>
                <th>Status</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {concerns.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/concerns/${c.id}`} className="font-medium text-ink hover:underline">#{c.ticket_no}</Link>
                  </td>
                  <td>
                    <Link href={`/admin/concerns/${c.id}`} className="font-medium text-ink hover:underline">{c.business_name || c.name || c.email}</Link>
                    <div className="max-w-[320px] truncate text-xs text-ink-weak">{c.message}</div>
                  </td>
                  <td className="whitespace-nowrap">{labelOf(CONCERN_TOPICS, c.topic)}</td>
                  <td><Badge value={statusBadge[c.status]} label={labelOf(CONCERN_STATUSES, c.status)} /></td>
                  <td className={`whitespace-nowrap ${c.status === "open" && !c.first_reply_at && Date.now() - new Date(c.created_at).getTime() > 864e5 ? "font-medium text-red-600" : ""}`}>
                    {fmtDate(c.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-5">
            <Empty>No concerns here. Share your support page ({supportUrl}) in your welcome emails, Facebook page and card packaging.</Empty>
          </div>
        )}
      </div>
    </div>
  );
}
