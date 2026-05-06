import { Suspense } from "react";
import { headers } from "next/headers";
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
import { RecentForm } from "@/components/player/RecentForm";
import { PlayerTabs } from "@/components/player/PlayerTabs";
import { Skeleton, StatGridSkeleton } from "@/components/ui/Skeleton";
import { Card, CardHeader } from "@/components/ui/Card";
import { ExternalLinks } from "@/components/common/ExternalLinks";
import { ownPlayerUrl, pubgReportLinks } from "@/lib/external-links";

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

  // Build absolute profile URL for the copy button.
  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const origin = `${proto}://${host}`;
  const profileUrl = ownPlayerUrl({ origin, locale, shard: platform, playerName: player.name });
  const pr = pubgReportLinks({ shard: platform, playerName: player.name });

  return (
    <div className="space-y-5">
      <PlayerHeader locale={locale} player={player} />

      <ExternalLinks
        locale={locale}
        copyValue={profileUrl}
        links={pr.player ? [{ href: pr.player, label: "PUBG Report", external: true }] : undefined}
      />

      <PlayerTabs locale={locale} shard={platform} name={decoded} active="overview" />

      <Suspense
        fallback={
          <Card>
            <CardHeader title="…" />
            <StatGridSkeleton />
          </Card>
        }
      >
        <RecentForm
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
