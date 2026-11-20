"use client";

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-xl space-y-3">
      <h2 className="text-lg font-bold text-red-700">Something went wrong</h2>
      <p className="whitespace-pre-wrap text-sm text-ink">{error.message}</p>
      <p className="text-xs text-ink-weak">
        If this mentions a missing table or function, run <code>supabase/schema.sql</code> in the Supabase SQL Editor.
      </p>
      <button className="btn btn-primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
