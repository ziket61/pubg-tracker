import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { isShard } from "@/lib/pubg/shards";
import { getClan } from "@/lib/pubg/client";
import { NotFoundError } from "@/lib/pubg/errors";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard, StatGrid } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { HelmetIcon } from "@/components/icons/GameIcons";

export default async function ClanPage({
  params,
}: {
  params: Promise<{ locale: Locale; platform: string; id: string }>;
}) {
  const { locale, platform, id } = await params;
  setRequestLocale(locale);
  if (!isShard(platform)) notFound();
  const t = await getTranslations({ locale, namespace: "clan" });
  const tp = await getTranslations({ locale, namespace: "platforms" });

  let clan;
  try {
    clan = await getClan(platform, id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  return (
    <div className="space-y-5">
      <header className="surface-raised flex flex-wrap items-center gap-4 rounded-2xl border border-border-strong p-5 sm:p-6">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-xl border border-brand/40 bg-bg/80">
          <HelmetIcon size={28} className="absolute text-brand-dim opacity-30" />
          <span className="relative font-display text-lg font-bold uppercase text-brand">
            {clan.tag.slice(0, 4) || "CLAN"}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-fg sm:text-3xl">
              {clan.name || clan.tag || t("untitled")}
            </h1>
            {clan.tag && <Badge tone="brand">[{clan.tag}]</Badge>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
            <span className="font-mono uppercase tracking-wider">{tp(platform)}</span>
            <span className="text-fg-subtle">·</span>
            <span className="font-mono text-[11px] text-fg-subtle truncate" title={clan.id}>
              {clan.id}
            </span>
          </div>
        </div>
      </header>

      <Card variant="raised">
        <CardHeader title={t("overview")} accent="brand" />
        <StatGrid>
          <StatCard label={t("level")} value={clan.level || "—"} tone="brand" />
          <StatCard label={t("memberCount")} value={clan.memberCount || 0} tone="accent" />
          <StatCard label={t("tag")} value={clan.tag || "—"} />
        </StatGrid>

        <p className="mt-5 text-xs text-fg-muted">{t("apiLimit")}</p>
      </Card>
    </div>
  );
}
