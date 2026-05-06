import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { getPlayerSeasonStats, getSeasons } from "@/lib/pubg/client";
import { isGameMode, type GameMode, type Shard } from "@/lib/pubg/shards";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatsBlock } from "./StatsBlock";
import { EmptyState } from "@/components/ui/EmptyState";
import { SeasonModeSelector } from "./SeasonModeSelector";
import { sortSeasonsDesc } from "@/lib/pubg/seasons";

export async function SeasonStatsPanel({
  locale,
  shard,
  accountId,
  seasonParam,
  modeParam,
}: {
  locale: Locale;
  shard: Shard;
  accountId: string;
  seasonParam?: string;
  modeParam?: string;
}) {
  const t = await getTranslations({ locale, namespace: "player" });
  const tc = await getTranslations({ locale, namespace: "common" });

  try {
    const seasons = sortSeasonsDesc(await getSeasons(shard));
    const current = seasons.find((s) => s.isCurrent);
    const seasonId = seasonParam && seasons.some((s) => s.id === seasonParam)
      ? seasonParam
      : current?.id ?? seasons[0]?.id;
    if (!seasonId) {
      return (
        <Card>
          <CardHeader title={t("season")} />
          <EmptyState title={tc("noData")} />
        </Card>
      );
    }
    const mode: GameMode =
      modeParam && isGameMode(modeParam) ? modeParam : "squad-fpp";
    const data = await getPlayerSeasonStats(shard, accountId, seasonId);
    const stats = data.gameModes[mode];

    return (
      <Card>
        <CardHeader
          title={t("season")}
          right={
            <SeasonModeSelector
              seasons={seasons.map((s) => ({ id: s.id, isCurrent: s.isCurrent }))}
              currentSeason={seasonId}
              currentMode={mode}
            />
          }
        />
        {stats ? (
          <StatsBlock locale={locale} stats={stats} />
        ) : (
          <EmptyState title={tc("noData")} />
        )}
      </Card>
    );
  } catch {
    return (
      <Card>
        <CardHeader title={t("season")} />
        <EmptyState title={tc("noData")} />
      </Card>
    );
  }
}
