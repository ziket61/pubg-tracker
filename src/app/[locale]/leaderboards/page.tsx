import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { env } from "@/lib/env";
import { isGameMode, isShard, type GameMode, type Shard } from "@/lib/pubg/shards";
import { getLeaderboard, getSeasons } from "@/lib/pubg/client";
import { sortSeasonsDesc } from "@/lib/pubg/seasons";
import { Card, CardHeader } from "@/components/ui/Card";
import { LeaderboardFilters } from "@/components/leaderboards/LeaderboardFilters";
import { LeaderboardTable } from "@/components/leaderboards/LeaderboardTable";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function LeaderboardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ season?: string; mode?: string; platform?: string }>;
}) {
  const { locale } = await params;
  const { season, mode, platform } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "leaderboard" });
  const tc = await getTranslations({ locale, namespace: "common" });

  const shard: Shard =
    platform && isShard(platform) ? platform : env.PUBG_DEFAULT_SHARD;

  const seasons = sortSeasonsDesc(await getSeasons(shard));
  const current = seasons.find((s) => s.isCurrent);
  const seasonId =
    season && seasons.some((s) => s.id === season)
      ? season
      : current?.id ?? seasons[0]?.id;
  const gameMode: GameMode = mode && isGameMode(mode) ? mode : "squad-fpp";

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
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
                  currentPlatform={shard}
                />
              }
            />
            <LeaderboardWithFallback
              locale={locale}
              shard={shard}
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
  shard,
  seasonId,
  gameMode,
}: {
  locale: Locale;
  shard: Shard;
  seasonId: string;
  gameMode: GameMode;
}) {
  try {
    const lb = await getLeaderboard(shard, seasonId, gameMode);
    return <LeaderboardTable locale={locale} leaderboard={lb} />;
  } catch {
    return <EmptyState title="—" />;
  }
}
