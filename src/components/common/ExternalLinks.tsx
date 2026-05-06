import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { CopyButton } from "./CopyButton";

interface LinkSpec {
  href: string;
  label: string;
  external?: boolean;
}

export async function ExternalLinks({
  locale,
  copyValue,
  copyLabel,
  links,
}: {
  locale: Locale;
  copyValue?: string;
  copyLabel?: string;
  links?: LinkSpec[];
}) {
  const t = await getTranslations({ locale, namespace: "common" });
  return (
    <div className="flex flex-wrap items-center gap-2">
      {copyValue && <CopyButton value={copyValue} label={copyLabel ?? t("copyLink")} />}
      {links?.map((l) => (
        <a
          key={l.href + l.label}
          href={l.href}
          target={l.external ? "_blank" : undefined}
          rel={l.external ? "noreferrer" : undefined}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-fg-muted transition-colors hover:border-brand-dim hover:bg-brand/[0.04] hover:text-brand"
        >
          {l.label}
          {l.external && <span aria-hidden>↗</span>}
        </a>
      ))}
    </div>
  );
}
