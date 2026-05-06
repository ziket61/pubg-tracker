"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { routing, type Locale } from "@/lib/i18n/routing";

export function LocaleSwitcher({ current }: { current: Locale }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === current) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div className="inline-flex rounded-lg border border-border bg-surface p-0.5 text-xs">
      {routing.locales.map((loc) => (
        <button
          key={loc}
          type="button"
          disabled={isPending}
          onClick={() => switchTo(loc)}
          className={`rounded-md px-2.5 py-1 font-semibold uppercase transition-colors ${
            loc === current
              ? "bg-brand text-bg"
              : "text-fg-muted hover:text-fg"
          }`}
          aria-pressed={loc === current}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}
