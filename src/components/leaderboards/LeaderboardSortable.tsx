"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n/routing";
import type { Leaderboard, LeaderboardEntry } from "@/lib/pubg/types";
import { leaderboardShardToPlayerShard } from "@/lib/pubg/shards";
import { Badge } from "@/components/ui/Badge";
import { Link } from "@/lib/i18n/navigation";
import { formatNumber, formatDecimal } from "@/lib/format/numbers";

type SortKey = "rank" | "rankPoints" | "wins" | "games" | "averageDamage" | "killDeathRatio";

function rankCell(rank: number) {
  if (rank === 1) return <Badge tone="tierGold">★ {rank}</Badge>;
  if (rank === 2) return <Badge tone="tierSilver">★ {rank}</Badge>;
  if (rank === 3) return <Badge tone="tierBronze">★ {rank}</Badge>;
  return <span className="font-mono text-xs text-fg-subtle tabular-nums">#{rank}</span>;
}

export function LeaderboardSortable({
  locale,
  leaderboard,
}: {
  locale: Locale;
  leaderboard: Leaderboard;
}) {
  const t = useTranslations("leaderboard");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");

  const playerShard = useMemo(
    () => leaderboardShardToPlayerShard(leaderboard.shardId),
    [leaderboard.shardId],
  );

  const sorted = useMemo(() => {
    const arr = [...leaderboard.entries];
    arr.sort((a, b) => {
      const av = readKey(a, sortKey);
      const bv = readKey(b, sortKey);
      const diff = av === bv ? a.rank - b.rank : av - bv;
      return direction === "asc" ? diff : -diff;
    });
    return arr;
  }, [leaderboard.entries, sortKey, direction]);

  function clickHeader(key: SortKey) {
    if (key === sortKey) {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Default direction: rank ascending (1, 2, 3...), everything else descending (most → least).
      setDirection(key === "rank" ? "asc" : "desc");
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-bg-muted text-left font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
          <tr>
            <Th sortKey="rank" current={sortKey} dir={direction} onClick={clickHeader} label={t("rank")} />
            <th className="px-4 py-3">{t("player")}</th>
            <Th sortKey="rankPoints" current={sortKey} dir={direction} onClick={clickHeader} label={t("rankPoints")} alignRight />
            <Th sortKey="wins" current={sortKey} dir={direction} onClick={clickHeader} label={t("wins")} alignRight />
            <Th sortKey="games" current={sortKey} dir={direction} onClick={clickHeader} label={t("games")} alignRight />
            <Th sortKey="averageDamage" current={sortKey} dir={direction} onClick={clickHeader} label={t("avgDamage")} alignRight />
            <Th sortKey="killDeathRatio" current={sortKey} dir={direction} onClick={clickHeader} label={t("kda")} alignRight />
          </tr>
        </thead>
        <tbody>
          {sorted.map((e, i) => (
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
              <td className="px-4 py-2.5 text-right font-mono text-success tabular-nums">
                {formatNumber(e.wins, locale)}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-fg-muted tabular-nums">
                {formatNumber(e.games, locale)}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-accent tabular-nums">
                {formatNumber(e.averageDamage, locale, { maximumFractionDigits: 0 })}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-combat tabular-nums">
                {formatDecimal(e.killDeathRatio, locale)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!sorted.length && (
        <div className="px-4 py-8 text-center text-sm text-fg-subtle">{t("noEntries")}</div>
      )}
    </div>
  );
}

function readKey(e: LeaderboardEntry, key: SortKey): number {
  switch (key) {
    case "rank":
      return e.rank;
    case "rankPoints":
      return e.rankPoints;
    case "wins":
      return e.wins;
    case "games":
      return e.games;
    case "averageDamage":
      return e.averageDamage;
    case "killDeathRatio":
      return e.killDeathRatio;
  }
}

function Th({
  sortKey,
  current,
  dir,
  onClick,
  label,
  alignRight,
}: {
  sortKey: SortKey;
  current: SortKey;
  dir: "asc" | "desc";
  onClick: (k: SortKey) => void;
  label: string;
  alignRight?: boolean;
}) {
  const isActive = current === sortKey;
  return (
    <th className={`px-4 py-3 ${alignRight ? "text-right" : ""}`}>
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className={`inline-flex items-center gap-1 transition-colors ${
          isActive ? "text-brand" : "text-fg-subtle hover:text-fg"
        }`}
      >
        {label}
        <span className="opacity-60">{isActive ? (dir === "asc" ? "↑" : "↓") : ""}</span>
      </button>
    </th>
  );
}
