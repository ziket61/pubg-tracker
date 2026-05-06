// Single source of truth for "the last N match details + this player's stats in each".
// Lifted out of RecentForm + RecentMatches so the page fetches once, both components share.
import { getMatch } from "./client";
import type { MatchDetails, ParticipantStats, Shard } from "./types";

export interface MatchWithMaybeStats {
  match: MatchDetails;
  stats: ParticipantStats | null;
}

/**
 * Fetch up to `limit` recent matches in parallel, attach the player's stats from each.
 * Failed/missing fetches are dropped silently — partial data is preferred over nothing.
 *
 * Next.js fetch cache deduplicates by URL within a request, so calling this twice in
 * the same render doesn't double-bill the rate-limit bucket.
 */
export async function getPlayerRecentMatches(
  shard: Shard,
  accountId: string,
  matchIds: string[],
  limit = 6,
): Promise<MatchWithMaybeStats[]> {
  if (!matchIds.length) return [];
  const ids = matchIds.slice(0, limit);
  const settled = await Promise.allSettled(ids.map((id) => getMatch(shard, id)));
  const out: MatchWithMaybeStats[] = [];
  for (const r of settled) {
    if (r.status !== "fulfilled") continue;
    const m = r.value;
    const p = m.participants.find((pp) => pp.stats.playerId === accountId) ?? null;
    out.push({ match: m, stats: p?.stats ?? null });
  }
  return out;
}
