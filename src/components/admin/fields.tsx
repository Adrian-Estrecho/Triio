type Option = { value: string; label: string } | string;

function opt(o: Option) {
  return typeof o === "string" ? { value: o, label: o } : o;
}

export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
  hint,
  className = "",
  step,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  className?: string;
  step?: string;
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={name}>
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      <input
        className="input"
        id={name}
        name={name}
        type={type}
        step={step ?? (type === "number" ? "any" : undefined)}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={required}
      />
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

export function TextArea({
  label,
  name,
  defaultValue,
  placeholder,
  rows = 3,
  hint,
  className = "",
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  rows?: number;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <textarea className="input" id={name} name={name} rows={rows} defaultValue={defaultValue ?? ""} placeholder={placeholder} />
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

export function Select({
  label,
  name,
  options,
  defaultValue,
  emptyLabel,
  required,
  className = "",
  hint,
}: {
  label: string;
  name: string;
  options: readonly Option[];
  defaultValue?: string | null;
  emptyLabel?: string;
  required?: boolean;
  className?: string;
  hint?: string;
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={name}>
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      <select className="input" id={name} name={name} defaultValue={defaultValue ?? ""} required={required}>
        {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
        {options.map((o) => {
          const { value, label } = opt(o);
          return (
            <option key={value} value={value}>
              {label}
            </option>
          );
        })}
      </select>
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

export function Checkbox({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 rounded accent-sky-600" />
      {label}
    </label>
  );
}

const badgeColors: Record<string, string> = {
  // orders
  new: "bg-slate-100 text-slate-700",
  awaiting_payment: "bg-amber-100 text-amber-800",
  designing: "bg-violet-100 text-violet-800",
  for_approval: "bg-fuchsia-100 text-fuchsia-800",
  production: "bg-blue-100 text-blue-800",
  quality_check: "bg-cyan-100 text-cyan-800",
  ready: "bg-teal-100 text-teal-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-700",
  // payments
  unpaid: "bg-red-100 text-red-700",
  partial: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  refunded: "bg-slate-200 text-slate-700",
  // cards
  pending: "bg-slate-100 text-slate-700",
  programmed: "bg-blue-100 text-blue-800",
  tested: "bg-cyan-100 text-cyan-800",
  delivered: "bg-emerald-100 text-emerald-800",
  disabled: "bg-red-100 text-red-700",
  // leads
  contacted: "bg-blue-100 text-blue-800",
  interested: "bg-amber-100 text-amber-800",
  demo: "bg-violet-100 text-violet-800",
  won: "bg-emerald-100 text-emerald-800",
  lost: "bg-red-100 text-red-700",
  A: "bg-emerald-100 text-emerald-800",
  B: "bg-sky-100 text-sky-800",
  C: "bg-slate-100 text-slate-700",
};

/** Reddit-style flair: small rounded pill. */
export function Badge({ value, label }: { value: string | null | undefined; label?: string }) {
  if (!value) return <span className="text-ink-faint">—</span>;
  return (
    <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-semibold ${badgeColors[value] ?? "bg-slate-100 text-slate-700"}`}>
      {label ?? value}
    </span>
  );
}

/** Page title, set like a Reddit community header: big bold name, quiet subtitle, pill actions, hairline below. */
export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div className="min-w-0">
        <h1 className="text-[28px] leading-tight font-bold tracking-[-0.01em] text-ink">{title}</h1>
        {subtitle && <p className="mt-1 break-words text-sm text-ink-weak">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-4 transition-colors hover:bg-surface-3/70">
      <p className="text-xs font-semibold text-ink-weak">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tracking-tight text-ink tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs leading-snug text-ink-weak">{sub}</p>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line-strong bg-white/60 p-6 text-center text-sm text-ink-weak">{children}</p>;
}
