"use client";

import { useEffect, useRef } from "react";
import { Icon } from "./icons";

/** A button that opens its children in a modal (native <dialog>: Esc and the backdrop close it). */
export function DialogButton({
  label,
  title,
  className = "btn btn-primary",
  defaultOpen = false,
  children,
}: {
  label: React.ReactNode;
  title: string;
  className?: string;
  /** Open as soon as the page loads (e.g. when another page links here to create something). */
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (defaultOpen && !ref.current?.open) ref.current?.showModal();
  }, [defaultOpen]);
  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.showModal()}>
        {label}
      </button>
      <dialog
        ref={ref}
        aria-label={title}
        className="m-auto w-[min(520px,calc(100vw-2rem))] rounded-3xl bg-white p-0 text-ink shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop:bg-black/40"
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close(); // click on the backdrop
        }}
      >
        <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold">{title}</h2>
            <button
              type="button"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ink-weak hover:bg-surface-3"
              onClick={() => ref.current?.close()}
              aria-label="Close"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}
