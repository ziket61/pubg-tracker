import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import type { GameModeStats } from "@/lib/pubg/types";
import { StatCard, StatGrid } from "@/components/ui/StatCard";
import { kd, winRate, avgDamage, headshotRate, top10Rate } from "@/lib/pubg/stats";
import {
  formatDecimal,
  formatDistanceMeters,
  formatNumber,
  formatPercent,
} from "@/lib/format/numbers";

export async function StatsBlock({
  locale,
  stats,
}: {
  locale: Locale;
  stats: GameModeStats;
}) {
  const t = await getTranslations({ locale, namespace: "stats" });

  return (
    <StatGrid>
      <StatCard label={t("rounds")} value={formatNumber(stats.roundsPlayed, locale)} />
      <StatCard
        label={t("wins")}
        value={formatNumber(stats.wins, locale)}
        sub={formatPercent(winRate(stats), locale)}
        tone="success"
      />
      <StatCard
        label={t("top10s")}
        value={formatNumber(stats.top10s, locale)}
        sub={formatPercent(top10Rate(stats), locale)}
        tone="brand"
      />
      <StatCard
        label={t("kd")}
        value={formatDecimal(kd(stats), locale)}
        tone="combat"
      />
      <StatCard
        label={t("kills")}
        value={formatNumber(stats.kills, locale)}
        tone="combat"
      />
      <StatCard
        label={t("avgDamage")}
        value={formatNumber(avgDamage(stats), locale, { maximumFractionDigits: 0 })}
        tone="accent"
      />
      <StatCard
        label={t("headshotRate")}
        value={formatPercent(headshotRate(stats), locale)}
        sub={`${stats.headshotKills} ${t("headshots").toLowerCase()}`}
      />
      <StatCard
        label={t("longestKill")}
        value={formatDistanceMeters(stats.longestKill, locale)}
      />
      <StatCard label={t("assists")} value={formatNumber(stats.assists, locale)} />
      <StatCard label={t("dbnos")} value={formatNumber(stats.dBNOs, locale)} />
      <StatCard label={t("revives")} value={formatNumber(stats.revives, locale)} />
      <StatCard label={t("heals")} value={formatNumber(stats.heals, locale)} />
    </StatGrid>
  );
}
