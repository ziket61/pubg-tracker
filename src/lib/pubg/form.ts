// Aggregations across the player's recent matches: form summary + best match.
// Pure functions over already-fetched MatchDetails + ParticipantStats.
import type { MatchDetails, ParticipantStats } from "./types";

export interface MatchWithStats {
  match: MatchDetails;
  stats: ParticipantStats;
}

export interface FormSummary {
  matchCount: number;
  avgKills: number;
  avgAssists: number;
  avgDamage: number;
  avgPlace: number;
  avgSurvivalSec: number;
  top10Count: number;
  top10Rate: number;
  winCount: number;
  winRate: number;
  totalDamage: number;
  totalKills: number;
  bestPlacement: number;
}

export function aggregateForm(items: MatchWithStats[]): FormSummary {
  const n = items.length;
  if (n === 0) {
    return {
      matchCount: 0,
      avgKills: 0,
      avgAssists: 0,
      avgDamage: 0,
      avgPlace: 0,
      avgSurvivalSec: 0,
      top10Count: 0,
      top10Rate: 0,
      winCount: 0,
      winRate: 0,
      totalDamage: 0,
      totalKills: 0,
      bestPlacement: 0,
    };
  }
  let kills = 0;
  let assists = 0;
  let dmg = 0;
  let place = 0;
  let surv = 0;
  let top10 = 0;
  let wins = 0;
  let bestPlace = Number.POSITIVE_INFINITY;
  for (const { stats } of items) {
    kills += stats.kills;
    assists += stats.assists;
    dmg += stats.damageDealt;
    place += stats.winPlace || 0;
    surv += stats.timeSurvived;
    if (stats.winPlace > 0 && stats.winPlace <= 10) top10 += 1;
    if (stats.winPlace === 1) wins += 1;
    if (stats.winPlace > 0 && stats.winPlace < bestPlace) bestPlace = stats.winPlace;
  }
  return {
    matchCount: n,
    avgKills: kills / n,
    avgAssists: assists / n,
    avgDamage: dmg / n,
    avgPlace: place / n,
    avgSurvivalSec: surv / n,
    top10Count: top10,
    top10Rate: top10 / n,
    winCount: wins,
    winRate: wins / n,
    totalDamage: dmg,
    totalKills: kills,
    bestPlacement: Number.isFinite(bestPlace) ? bestPlace : 0,
  };
}

export type BestCriterion = "kills" | "damage" | "placement" | "score";

export function pickBestMatch(
  items: MatchWithStats[],
  criterion: BestCriterion = "score",
): MatchWithStats | null {
  if (!items.length) return null;
  return items.reduce<MatchWithStats | null>((best, item) => {
    if (!best) return item;
    return scoreFor(item, criterion) > scoreFor(best, criterion) ? item : best;
  }, null);
}

function scoreFor(item: MatchWithStats, c: BestCriterion): number {
  const s = item.stats;
  switch (c) {
    case "kills":
      return s.kills;
    case "damage":
      return s.damageDealt;
    case "placement":
      // lower placement is better (1 = win); invert so higher score = better
      return s.winPlace > 0 ? 101 - s.winPlace : 0;
    case "score":
    default: {
      // Composite "best" — kills weighted heavily, damage normalized, placement bonus for top 10
      const placement = s.winPlace > 0 ? Math.max(0, 11 - s.winPlace) : 0;
      return s.kills * 100 + s.damageDealt + placement * 50;
    }
  }
}
