import { Suspense } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { isShard } from "@/lib/pubg/shards";
import { searchPlayersByName } from "@/lib/pubg/client";
import { getPlayerRecentMatches } from "@/lib/pubg/recent-data";
import { NotFoundError } from "@/lib/pubg/errors";
import { PlayerHeader } from "@/components/player/PlayerHeader";
import { LifetimeStats } from "@/components/player/LifetimeStats";
import { SeasonStatsPanel } from "@/components/player/SeasonStatsPanel";
import { RecentMatches } from "@/components/player/RecentMatches";
import { RecentForm } from "@/components/player/RecentForm";
import { PlayerTabs } from "@/components/player/PlayerTabs";
import { StatGridSkeleton } from "@/components/ui/Skeleton";
import { Card, CardHeader } from "@/components/ui/Card";
import { ExternalLinks } from "@/components/common/ExternalLinks";
import { FavoriteButton } from "@/components/player/FavoriteButton";
import { ownPlayerUrl, pubgReportLinks } from "@/lib/external-links";

const RECENT_MATCH_FETCH_LIMIT = 6;

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

  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const origin = `${proto}://${host}`;
  const profileUrl = ownPlayerUrl({ origin, locale, shard: platform, playerName: player.name });
  const pr = pubgReportLinks({ shard: platform, playerName: player.name });

  return (
    <div className="space-y-5">
      <PlayerHeader locale={locale} player={player} />

      <div className="flex flex-wrap items-center gap-2">
        <FavoriteButton name={player.name} shard={platform} />
        <ExternalLinks
          locale={locale}
          copyValue={profileUrl}
          links={pr.player ? [{ href: pr.player, label: "PUBG Report", external: true }] : undefined}
        />
      </div>

      <PlayerTabs locale={locale} shard={platform} name={decoded} active="overview" />

      <Suspense
        fallback={
          <Card>
            <CardHeader title="…" />
            <StatGridSkeleton />
          </Card>
        }
      >
        <RecentMatchesAndForm
          locale={locale}
          shard={platform}
          accountId={player.id}
          matchIds={player.matchIds}
        />
      </Suspense>

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
    </div>
  );
}

/**
 * Fetches the recent matches once (with the player's stats attached) and renders
 * BOTH RecentForm and RecentMatches with the same data — saves N redundant
 * upstream calls when both components want overlapping match details.
 */
async function RecentMatchesAndForm({
  locale,
  shard,
  accountId,
  matchIds,
}: {
  locale: Locale;
  shard: import("@/lib/pubg/shards").Shard;
  accountId: string;
  matchIds: string[];
}) {
  const data = await getPlayerRecentMatches(shard, accountId, matchIds, RECENT_MATCH_FETCH_LIMIT);
  return (
    <div className="space-y-5">
      <RecentForm
        locale={locale}
        shard={shard}
        accountId={accountId}
        matchIds={matchIds}
        preloaded={data}
        limit={5}
      />
      <RecentMatches
        locale={locale}
        shard={shard}
        accountId={accountId}
        matchIds={matchIds}
        preloaded={data}
        limit={6}
      />
    </div>
  );
}
