import {
  leaderboardFixture,
  matchFixtures,
  playerFixture,
  playerLifetimeStatsFixture,
  playerSeasonStatsFixture,
  playersSearchFixture,
  seasonsFixture,
  survivalMasteryFixture,
  weaponMasteryFixture,
} from "./fixtures";

export interface MockResult {
  body: unknown;
  status?: number;
}

const RE = {
  status: /^\/status$/,
  seasons: /^\/shards\/[^/]+\/seasons$/,
  playerById: /^\/shards\/[^/]+\/players\/([^/]+)$/,
  playerSeason:
    /^\/shards\/[^/]+\/players\/([^/]+)\/seasons\/([^/]+)$/,
  weaponMastery: /^\/shards\/[^/]+\/players\/([^/]+)\/weapon_mastery$/,
  survivalMastery: /^\/shards\/[^/]+\/players\/([^/]+)\/survival_mastery$/,
  match: /^\/shards\/[^/]+\/matches\/([^/]+)$/,
  leaderboard:
    /^\/shards\/[^/]+\/leaderboards\/([^/]+)\/([^/]+)$/,
  players: /^\/shards\/[^/]+\/players$/,
};

export function getMock(path: string, query: URLSearchParams): MockResult | null {
  // Status
  if (RE.status.test(path)) {
    return { body: { data: { type: "status", attributes: { released: "2024-08-12", version: "mock" } } } };
  }

  // Seasons
  if (RE.seasons.test(path)) {
    return { body: seasonsFixture };
  }

  // Players search by name: /shards/:shard/players?filter[playerNames]=NAME
  if (RE.players.test(path)) {
    const names = query.get("filter[playerNames]") || "";
    const first = names.split(",")[0]?.trim() || "shroud";
    return { body: playersSearchFixture(first) };
  }

  // Lifetime: /shards/:shard/players/:id/seasons/lifetime
  const lifetime = path.match(/^\/shards\/[^/]+\/players\/[^/]+\/seasons\/lifetime$/);
  if (lifetime) {
    return { body: playerLifetimeStatsFixture };
  }

  // Per-season player stats
  const playerSeason = path.match(RE.playerSeason);
  if (playerSeason) {
    return { body: playerSeasonStatsFixture };
  }

  // Player by id (must be checked before /players?filter)
  if (RE.playerById.test(path)) {
    return { body: playerFixture };
  }

  if (RE.weaponMastery.test(path)) {
    return { body: weaponMasteryFixture };
  }

  if (RE.survivalMastery.test(path)) {
    return { body: survivalMasteryFixture };
  }

  const match = path.match(RE.match);
  if (match) {
    const id = match[1]!;
    const fixture = matchFixtures[id] ?? Object.values(matchFixtures)[0];
    return { body: fixture };
  }

  if (RE.leaderboard.test(path)) {
    return { body: leaderboardFixture };
  }

  return null;
}
