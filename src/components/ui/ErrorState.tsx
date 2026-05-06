import type { ReactNode } from "react";

export function ErrorState({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-danger/30 bg-danger/5 p-6 text-center">
      <h3 className="text-lg font-semibold text-danger">{title}</h3>
      {description && <p className="mt-2 text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
