import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
  variant?: "default" | "raised";
}

export function Card({
  children,
  className = "",
  as: Tag = "div",
  variant = "default",
}: CardProps) {
  const base =
    variant === "raised"
      ? "surface-raised shadow-card-raised border border-border-strong"
      : "bg-surface border border-border";
  return (
    <Tag className={`rounded-xl ${base} p-4 sm:p-5 ${className}`}>{children}</Tag>
  );
}

export function CardHeader({
  title,
  right,
  accent,
}: {
  title: ReactNode;
  right?: ReactNode;
  accent?: "brand" | "accent" | "combat";
}) {
  const dotColor =
    accent === "accent"
      ? "bg-accent"
      : accent === "combat"
      ? "bg-combat"
      : "bg-brand";
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-muted">
        {accent && <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />}
        {title}
      </h2>
      {right}
    </div>
  );
}
