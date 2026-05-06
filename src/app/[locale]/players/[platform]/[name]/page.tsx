import { Suspense } from "react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { isShard } from "@/lib/pubg/shards";
import { searchPlayersByName } from "@/lib/pubg/client";
import { NotFoundError } from "@/lib/pubg/errors";
import { PlayerHeader } from "@/components/player/PlayerHeader";
import { LifetimeStats } from "@/components/player/LifetimeStats";
import { SeasonStatsPanel } from "@/components/player/SeasonStatsPanel";
import { RecentMatches } from "@/components/player/RecentMatches";
import { PlayerTabs } from "@/components/player/PlayerTabs";
import { Skeleton, StatGridSkeleton } from "@/components/ui/Skeleton";
import { Card, CardHeader } from "@/components/ui/Card";

export default async function PlayerOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; platform: string; name: string }>;
  searchParams: Promise<{ season?: string; mode?: string }>;
}) {
  const { locale, platform, name } = await params;
  const { season, mode } = await searchParams;
  setRequestLocale(locale);
  if (!isShard(platform)) notFound();

  const decoded = decodeURIComponent(name);

  let player;
  try {
    const players = await searchPlayersByName(platform, [decoded]);
    if (!players.length) notFound();
    player = players[0]!;
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  return (
    <div className="space-y-5">
      <PlayerHeader locale={locale} player={player} />
      <PlayerTabs locale={locale} shard={platform} name={decoded} active="overview" />

      <Suspense
        fallback={
          <Card>
            <CardHeader title="…" />
            <StatGridSkeleton />
          </Card>
        }
      >
        <LifetimeStats locale={locale} shard={platform} accountId={player.id} />
      </Suspense>

      <Suspense
        fallback={
          <Card>
            <CardHeader title="…" />
            <StatGridSkeleton />
          </Card>
        }
      >
        <SeasonStatsPanel
          locale={locale}
          shard={platform}
          accountId={player.id}
          seasonParam={season}
          modeParam={mode}
        />
      </Suspense>

      <Suspense
        fallback={
          <Card>
            <CardHeader title="…" />
            <Skeleton className="h-64 w-full" />
          </Card>
        }
      >
        <RecentMatches
          locale={locale}
          shard={platform}
          accountId={player.id}
          matchIds={player.matchIds}
        />
      </Suspense>
    </div>
  );
}
