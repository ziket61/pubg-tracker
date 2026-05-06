import type { ReactNode } from "react";

type Tone = "default" | "brand" | "accent" | "combat" | "success";

const toneRing: Record<Tone, string> = {
  default: "border-border",
  brand: "border-brand-dim/60 bg-brand/[0.04]",
  accent: "border-accent-dim/60 bg-accent/[0.04]",
  combat: "border-combat-dim/60 bg-combat/[0.04]",
  success: "border-success-dim/60 bg-success/[0.04]",
};

const toneText: Record<Tone, string> = {
  default: "text-fg",
  brand: "text-brand",
  accent: "text-accent",
  combat: "text-combat",
  success: "text-success",
};

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
}

export function StatCard({ label, value, sub, tone = "default" }: StatCardProps) {
  return (
    <div
      className={`group relative overflow-hidden rounded-lg border bg-bg-muted px-3 py-3.5 transition-colors hover:bg-bg-subtle ${toneRing[tone]}`}
    >
      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">
        {label}
      </div>
      <div
        className={`mt-1.5 font-display text-2xl font-bold leading-none tabular-nums sm:text-3xl ${toneText[tone]}`}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1.5 font-mono text-[11px] text-fg-muted">{sub}</div>
      )}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {children}
    </div>
  );
}
