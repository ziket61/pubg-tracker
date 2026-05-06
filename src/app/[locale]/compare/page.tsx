import { Suspense } from "react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { isShard, type Shard } from "@/lib/pubg/shards";
import { searchPlayersByName, getPlayerLifetimeStats } from "@/lib/pubg/client";
import { aggregateLifetime } from "@/lib/pubg/stats";
import { getPlayerRecentMatches } from "@/lib/pubg/recent-data";
import { aggregateForm, type MatchWithStats } from "@/lib/pubg/form";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { CompareForm } from "@/components/compare/CompareForm";
import { CompareTable } from "@/components/compare/CompareTable";
import { env } from "@/lib/env";

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ a?: string; b?: string; platform?: string }>;
}) {
  const { locale } = await params;
  const { a, b, platform: platformParam } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "compare" });

  const shard: Shard =
    platformParam && isShard(platformParam) ? platformParam : env.PUBG_DEFAULT_SHARD;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-fg sm:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-fg-muted">{t("subtitle")}</p>
      </div>

      <CompareForm locale={locale} defaultShard={shard} initialA={a ?? ""} initialB={b ?? ""} />

      {a && b && (
        <Suspense
          fallback={
            <Card>
              <CardHeader title={t("loadingTitle")} />
              <Skeleton className="h-64 w-full" />
            </Card>
          }
        >
          <CompareData locale={locale} shard={shard} a={a} b={b} />
        </Suspense>
      )}
    </div>
  );
}

async function CompareData({
  locale,
  shard,
  a,
  b,
}: {
  locale: Locale;
  shard: Shard;
  a: string;
  b: string;
}) {
  const t = await getTranslations({ locale, namespace: "compare" });
  const tc = await getTranslations({ locale, namespace: "common" });

  // Single batch search of both names (PUBG accepts comma-separated up to 10).
  let players;
  try {
    players = await searchPlayersByName(shard, [a, b]);
  } catch {
    return (
      <Card>
        <CardHeader title={t("notFoundTitle")} accent="combat" />
        <p className="text-sm text-fg-muted">{tc("notFound")}</p>
      </Card>
    );
  }

  const playerA = players.find((p) => p.name.toLowerCase() === a.toLowerCase());
  const playerB = players.find((p) => p.name.toLowerCase() === b.toLowerCase());

  if (!playerA || !playerB) {
    const missing = [!playerA && a, !playerB && b].filter(Boolean).join(", ");
    return (
      <Card>
        <CardHeader title={t("notFoundTitle")} accent="combat" />
        <p className="text-sm text-fg-muted">{t("notFoundDetail", { who: missing })}</p>
      </Card>
    );
  }

  // Fetch lifetime + recent form for both in parallel.
  const [lifeA, lifeB, recentA, recentB] = await Promise.all([
    getPlayerLifetimeStats(shard, playerA.id).catch(() => null),
    getPlayerLifetimeStats(shard, playerB.id).catch(() => null),
    getPlayerRecentMatches(shard, playerA.id, playerA.matchIds, 5),
    getPlayerRecentMatches(shard, playerB.id, playerB.matchIds, 5),
  ]);

  const totalA = lifeA ? aggregateLifetime(lifeA.gameModes) : null;
  const totalB = lifeB ? aggregateLifetime(lifeB.gameModes) : null;

  const formItemsA: MatchWithStats[] = recentA
    .filter((d): d is typeof d & { stats: NonNullable<typeof d.stats> } => d.stats !== null)
    .map((d) => ({ match: d.match, stats: d.stats }));
  const formItemsB: MatchWithStats[] = recentB
    .filter((d): d is typeof d & { stats: NonNullable<typeof d.stats> } => d.stats !== null)
    .map((d) => ({ match: d.match, stats: d.stats }));

  const formA = aggregateForm(formItemsA);
  const formB = aggregateForm(formItemsB);

  return (
    <CompareTable
      locale={locale}
      a={{ name: playerA.name, lifetime: totalA, form: formA }}
      b={{ name: playerB.name, lifetime: totalB, form: formB }}
    />
  );
}
