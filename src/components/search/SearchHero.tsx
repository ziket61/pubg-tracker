import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import type { Shard } from "@/lib/pubg/shards";
import { useMocks } from "@/lib/env";
import { PlayerSearchForm } from "./PlayerSearchForm";
import { MapGridBackground } from "@/components/icons/GameIcons";

export async function SearchHero({
  locale,
  defaultShard,
}: {
  locale: Locale;
  defaultShard: Shard;
}) {
  const t = await getTranslations({ locale, namespace: "home" });
  const ts = await getTranslations({ locale, namespace: "search" });

  return (
    <section className="surface-hero relative isolate overflow-hidden rounded-2xl border border-border-strong">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <MapGridBackground className="h-full w-full" />
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10 bg-scanlines opacity-40" aria-hidden />

      <div className="relative px-6 py-10 sm:px-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border-brand/60 bg-brand/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
            {t("heroEyebrow")}
          </div>

          <h1 className="text-display text-balance text-3xl font-bold leading-[1.05] text-fg sm:text-5xl">
            {t("heroTitle")}{" "}
            <span className="text-brand text-shadow-glow">{t("heroTitleAccent")}</span>
          </h1>

          <p className="mt-4 max-w-xl text-sm text-fg-muted sm:text-base">
            {t("heroSubtitle")}
          </p>

          <div className="mt-8 rounded-xl border border-border-strong bg-bg/60 p-4 backdrop-blur-sm sm:p-5">
            <PlayerSearchForm defaultShard={defaultShard} />
            <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
              {ts("hint")}
            </p>
          </div>

          {useMocks && (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs text-accent/90">
              <span className="font-mono text-[10px] font-bold tracking-wider rounded bg-accent/15 px-1.5 py-0.5 text-accent">
                DEMO
              </span>
              <span className="flex-1 leading-relaxed">{t("demoNote")}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
