/** Shows the ?msg= / ?err= message an action redirected back with. */
export function Flash({ msg, err }: { msg?: string; err?: string }) {
  if (!msg && !err) return null;
  return (
    <div
      role={err ? "alert" : "status"}
      className={`rounded-2xl px-4 py-3 text-sm font-medium ${err ? "bg-red-50 text-red-800 ring-1 ring-red-200" : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"}`}
    >
      {err ?? msg}
    </div>
  );
}
