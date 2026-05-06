import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
}: {
  title: ReactNode;
  description?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-muted p-6 text-center">
      <p className="text-sm font-medium text-fg-muted">{title}</p>
      {description && <p className="mt-1 text-xs text-fg-subtle">{description}</p>}
    </div>
  );
}
