import type { SelectHTMLAttributes, ReactNode } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  children: ReactNode;
}

export function Select({ label, className = "", children, ...rest }: SelectProps) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && (
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">
          {label}
        </span>
      )}
      <div className="relative">
        <select
          {...rest}
          className={`h-10 w-full appearance-none rounded-lg border border-border bg-bg/80 px-3 pr-9 text-sm text-fg transition-shadow focus:border-brand focus:outline-none focus:shadow-glow-sm ${className}`}
        >
          {children}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden
        >
          <path d="M3 5.5L7 9.5L11 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </label>
  );
}
