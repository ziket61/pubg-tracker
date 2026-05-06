import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { env } from "@/lib/env";
import {
  isGameMode,
  isLeaderboardShard,
  defaultLeaderboardShard,
  type GameMode,
  type LeaderboardShard,
} from "@/lib/pubg/shards";
import { getLeaderboard, getSeasons } from "@/lib/pubg/client";
import { sortSeasonsDesc } from "@/lib/pubg/seasons";
import { Card, CardHeader } from "@/components/ui/Card";
import { LeaderboardFilters } from "@/components/leaderboards/LeaderboardFilters";
import { LeaderboardSortable } from "@/components/leaderboards/LeaderboardSortable";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function LeaderboardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ season?: string; mode?: string; region?: string }>;
}) {
  const { locale } = await params;
  const { season, mode, region } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "leaderboard" });
  const tc = await getTranslations({ locale, namespace: "common" });

  const regionShard: LeaderboardShard =
    region && isLeaderboardShard(region)
      ? region
      : defaultLeaderboardShard(env.PUBG_DEFAULT_SHARD);

  // Season identifiers come from the player-shard endpoint and are shared
  // across regions of the same platform.
  const seasons = sortSeasonsDesc(await getSeasons(env.PUBG_DEFAULT_SHARD));
  const current = seasons.find((s) => s.isCurrent);
  const seasonId =
    season && seasons.some((s) => s.id === season)
      ? season
      : current?.id ?? seasons[0]?.id;
  const gameMode: GameMode = mode && isGameMode(mode) ? mode : "squad-fpp";

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">{t("title")}</h1>
      <Card>
        {seasonId ? (
          <>
            <CardHeader
              title={t("title")}
              right={
                <LeaderboardFilters
                  seasons={seasons.map((s) => ({ id: s.id, isCurrent: s.isCurrent }))}
                  currentSeason={seasonId}
                  currentMode={gameMode}
                  currentRegion={regionShard}
                />
              }
            />
            <LeaderboardWithFallback
              locale={locale}
              region={regionShard}
              seasonId={seasonId}
              gameMode={gameMode}
            />
          </>
        ) : (
          <EmptyState title={tc("noData")} />
        )}
      </Card>
    </div>
  );
}

async function LeaderboardWithFallback({
  locale,
  region,
  seasonId,
  gameMode,
}: {
  locale: Locale;
  region: LeaderboardShard;
  seasonId: string;
  gameMode: GameMode;
}) {
  try {
    const lb = await getLeaderboard(region, seasonId, gameMode);
    if (!lb.entries.length) {
      return <EmptyState title="—" />;
    }
    return <LeaderboardSortable locale={locale} leaderboard={lb} />;
  } catch {
    return <EmptyState title="—" />;
  }
}
