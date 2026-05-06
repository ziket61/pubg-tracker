import type { ReactNode } from "react";

type Tone =
  | "default"
  | "brand"
  | "danger"
  | "success"
  | "muted"
  | "accent"
  | "combat"
  | "tierGold"
  | "tierSilver"
  | "tierBronze";

const tones: Record<Tone, string> = {
  default: "bg-surface-hover text-fg border-border",
  brand: "bg-brand/10 text-brand border-brand-dim/60",
  danger: "bg-danger/15 text-danger border-danger/40",
  success: "bg-success/15 text-success border-success/40",
  muted: "bg-bg-subtle text-fg-muted border-border",
  accent: "bg-accent/10 text-accent border-accent-dim/60",
  combat: "bg-combat/15 text-combat border-combat-dim/60",
  tierGold: "bg-tier-gold/15 text-tier-gold border-tier-gold/40",
  tierSilver: "bg-tier-silver/15 text-tier-silver border-tier-silver/40",
  tierBronze: "bg-tier-bronze/15 text-tier-bronze border-tier-bronze/50",
};

export function Badge({
  children,
  tone = "default",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
