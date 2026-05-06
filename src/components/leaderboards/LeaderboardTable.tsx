import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import type { Leaderboard } from "@/lib/pubg/types";
import { leaderboardShardToPlayerShard } from "@/lib/pubg/shards";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Link } from "@/lib/i18n/navigation";
import { formatNumber, formatDecimal } from "@/lib/format/numbers";

function rankCell(rank: number) {
  if (rank === 1) {
    return <Badge tone="tierGold">★ {rank}</Badge>;
  }
  if (rank === 2) {
    return <Badge tone="tierSilver">★ {rank}</Badge>;
  }
  if (rank === 3) {
    return <Badge tone="tierBronze">★ {rank}</Badge>;
  }
  return (
    <span className="font-mono text-xs text-fg-subtle tabular-nums">
      #{rank}
    </span>
  );
}

export async function LeaderboardTable({
  locale,
  leaderboard,
  limit,
  compact,
}: {
  locale: Locale;
  leaderboard: Leaderboard;
  limit?: number;
  compact?: boolean;
}) {
  const t = await getTranslations({ locale, namespace: "leaderboard" });
  const entries = limit ? leaderboard.entries.slice(0, limit) : leaderboard.entries;
  const playerShard = leaderboardShardToPlayerShard(leaderboard.shardId);

  if (!entries.length) {
    return <EmptyState title={t("noEntries")} />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-bg-muted text-left font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
          <tr>
            <th className="px-4 py-3">{t("rank")}</th>
            <th className="px-4 py-3">{t("player")}</th>
            <th className="px-4 py-3 text-right">{t("rankPoints")}</th>
            {!compact && <th className="px-4 py-3 text-right">{t("wins")}</th>}
            {!compact && <th className="px-4 py-3 text-right">{t("games")}</th>}
            <th className="px-4 py-3 text-right">{t("avgDamage")}</th>
            {!compact && <th className="px-4 py-3 text-right">{t("kda")}</th>}
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr
              key={e.playerId}
              className={`border-b border-border/40 last:border-b-0 transition-colors hover:bg-surface-hover ${
                i % 2 === 1 ? "bg-bg-muted/30" : ""
              }`}
            >
              <td className="px-4 py-2.5">{rankCell(e.rank)}</td>
              <td className="px-4 py-2.5">
                <Link
                  href={`/players/${playerShard}/${encodeURIComponent(e.playerName)}`}
                  className="font-medium text-fg transition-colors hover:text-brand"
                >
                  {e.playerName}
                </Link>
                {e.tier && (
                  <span className="ml-2 font-mono text-[10px] uppercase text-fg-subtle">
                    {e.tier}
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-fg tabular-nums">
                {formatNumber(e.rankPoints, locale, { maximumFractionDigits: 0 })}
              </td>
              {!compact && (
                <td className="px-4 py-2.5 text-right font-mono text-success tabular-nums">
                  {formatNumber(e.wins, locale)}
                </td>
              )}
              {!compact && (
                <td className="px-4 py-2.5 text-right font-mono text-fg-muted tabular-nums">
                  {formatNumber(e.games, locale)}
                </td>
              )}
              <td className="px-4 py-2.5 text-right font-mono text-accent tabular-nums">
                {formatNumber(e.averageDamage, locale, { maximumFractionDigits: 0 })}
              </td>
              {!compact && (
                <td className="px-4 py-2.5 text-right font-mono text-combat tabular-nums">
                  {formatDecimal(e.killDeathRatio, locale)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
