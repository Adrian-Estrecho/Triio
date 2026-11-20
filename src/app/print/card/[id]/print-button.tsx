"use client";

export function PrintButton({ disabled }: { disabled?: boolean }) {
  return (
    <button type="button" className="btn btn-primary w-full" disabled={disabled} onClick={() => window.print()}>
      Print insert
    </button>
  );
}
