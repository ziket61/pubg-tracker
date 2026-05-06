import { proxyPubgRequest, proxyTelemetry } from "./proxy";
import { findIncluded, listIncluded, relMany, type JsonApiDoc, type JsonApiResource } from "./jsonapi";
import { NotFoundError, PubgApiError, RateLimitError } from "./errors";
import type {
  GameMode,
  GameModeStats,
  Leaderboard,
  LeaderboardEntry,
  LifetimeStats,
  MatchDetails,
  Participant,
  PlayerSummary,
  Roster,
  Season,
  SeasonStats,
  Shard,
  SurvivalMasteryStats,
  WeaponMastery,
} from "./types";

async function call(path: string, query: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) params.set(k, v);
  }
  const res = await proxyPubgRequest(path, params);
  if (res.status === 429) {
    const retry = Number((res.body as { retryAfter?: number })?.retryAfter ?? 60);
    throw new RateLimitError(retry);
  }
  if (res.status === 404) throw new NotFoundError();
  if (res.status === 401) throw new PubgApiError("API key invalid or missing", 401);
  if (res.status >= 400) {
    throw new PubgApiError(
      `Upstream error ${res.status}: ${JSON.stringify(res.body)}`,
      res.status,
    );
  }
  return res.body as JsonApiDoc<JsonApiResource | JsonApiResource[]>;
}

export async function getStatus() {
  const doc = await call("/status");
  const r = (doc.data as JsonApiResource).attributes as
    | { released?: string; version?: string }
    | undefined;
  return { released: r?.released ?? "", version: r?.version ?? "" };
}

export async function searchPlayersByName(
  shard: Shard,
  names: string[],
): Promise<PlayerSummary[]> {
  const doc = await call(`/shards/${shard}/players`, {
    "filter[playerNames]": names.join(","),
  });
  const list = Array.isArray(doc.data) ? doc.data : [doc.data];
  return list.map((res) => mapPlayer(res, shard));
}

export async function getPlayerById(
  shard: Shard,
  accountId: string,
): Promise<PlayerSummary> {
  const doc = await call(`/shards/${shard}/players/${accountId}`);
  return mapPlayer(doc.data as JsonApiResource, shard);
}

function mapPlayer(res: JsonApiResource, shard: Shard): PlayerSummary {
  const attrs = (res.attributes ?? {}) as { name?: string; patchVersion?: string; bannedTypes?: string[]; shardId?: Shard };
  const matches = relMany(res, "matches");
  return {
    id: res.id,
    name: attrs.name ?? res.id,
    shardId: attrs.shardId ?? shard,
    matchIds: matches.map((m) => m.id),
    bannedTypes: attrs.bannedTypes,
    patchVersion: attrs.patchVersion,
  };
}

export async function getPlayerSeasonStats(
  shard: Shard,
  accountId: string,
  seasonId: string,
): Promise<SeasonStats> {
  const doc = await call(`/shards/${shard}/players/${accountId}/seasons/${seasonId}`);
  const data = doc.data as JsonApiResource<{
    gameModeStats: Record<string, RawModeStats>;
  }>;
  return {
    playerId: accountId,
    seasonId,
    shardId: shard,
    gameModes: mapGameModes(data.attributes?.gameModeStats ?? {}),
  };
}

export async function getPlayerLifetimeStats(
  shard: Shard,
  accountId: string,
): Promise<LifetimeStats> {
  const doc = await call(`/shards/${shard}/players/${accountId}/seasons/lifetime`);
  const data = doc.data as JsonApiResource<{
    gameModeStats: Record<string, RawModeStats>;
  }>;
  return {
    playerId: accountId,
    shardId: shard,
    gameModes: mapGameModes(data.attributes?.gameModeStats ?? {}),
  };
}

interface RawModeStats {
  assists: number;
  boosts: number;
  dBNOs: number;
  dailyKills: number;
  damageDealt: number;
  headshotKills: number;
  heals: number;
  killPoints: number;
  kills: number;
  longestKill: number;
  losses: number;
  rankPoints?: number;
  rankPointsTitle?: string;
  revives: number;
  rideDistance: number;
  roadKills: number;
  roundsPlayed: number;
  suicides: number;
  swimDistance: number;
  teamKills: number;
  timeSurvived: number;
  top10s: number;
  vehicleDestroys: number;
  walkDistance: number;
  weaponsAcquired: number;
  weeklyKills: number;
  wins: number;
}

function mapGameModes(
  raw: Record<string, RawModeStats>,
): Partial<Record<GameMode, GameModeStats>> {
  const out: Partial<Record<GameMode, GameModeStats>> = {};
  for (const [mode, s] of Object.entries(raw)) {
    const key = mode as GameMode;
    out[key] = {
      roundsPlayed: s.roundsPlayed,
      wins: s.wins,
      top10s: s.top10s,
      losses: s.losses,
      kills: s.kills,
      assists: s.assists,
      damageDealt: s.damageDealt,
      headshotKills: s.headshotKills,
      longestKill: s.longestKill,
      dailyKills: s.dailyKills,
      weeklyKills: s.weeklyKills,
      rideDistance: s.rideDistance,
      walkDistance: s.walkDistance,
      swimDistance: s.swimDistance,
      boosts: s.boosts,
      heals: s.heals,
      revives: s.revives,
      teamKills: s.teamKills,
      roadKills: s.roadKills,
      vehicleDestroys: s.vehicleDestroys,
      weaponsAcquired: s.weaponsAcquired,
      timeSurvived: s.timeSurvived,
      killPoints: s.killPoints,
      rankPoints: s.rankPoints,
      rankPointsTitle: s.rankPointsTitle,
      suicides: s.suicides,
      dBNOs: s.dBNOs,
    };
  }
  return out;
}

export async function getPlayerWeaponMastery(
  shard: Shard,
  accountId: string,
): Promise<WeaponMastery> {
  const doc = await call(`/shards/${shard}/players/${accountId}/weapon_mastery`);
  const data = doc.data as JsonApiResource<{
    weaponSummaries: Record<
      string,
      {
        LevelCurrent: number;
        XPTotal: number;
        TierCurrent?: number;
        StatsTotal: {
          Kills?: number;
          DamagePlayer?: number;
          HeadShots?: number;
          LongestDefeat?: number;
        };
      }
    >;
  }>;
  const summaries = data.attributes?.weaponSummaries ?? {};
  return {
    playerId: accountId,
    weapons: Object.entries(summaries).map(([id, s]) => ({
      weaponId: id,
      level: s.LevelCurrent,
      xpTotal: s.XPTotal,
      tier: s.TierCurrent !== undefined ? String(s.TierCurrent) : undefined,
      kills: s.StatsTotal?.Kills ?? 0,
      damagePlayer: s.StatsTotal?.DamagePlayer ?? 0,
      headshots: s.StatsTotal?.HeadShots ?? 0,
      longestDefeat: s.StatsTotal?.LongestDefeat ?? 0,
    })),
  };
}

export async function getPlayerSurvivalMastery(
  shard: Shard,
  accountId: string,
): Promise<SurvivalMasteryStats> {
  const doc = await call(`/shards/${shard}/players/${accountId}/survival_mastery`);
  const data = doc.data as JsonApiResource<{
    level: number;
    xp: number;
    totalXp: number;
    tier: number;
    tierSubLevel?: number;
    stats: Record<string, { total?: number; best?: number }>;
  }>;
  const a = data.attributes ?? ({} as { level: number; xp: number; totalXp: number; tier: number; stats: Record<string, { total?: number; best?: number }> });
  const flat: Record<string, number> = {};
  for (const [k, v] of Object.entries(a.stats ?? {})) {
    if (typeof v?.total === "number") flat[k] = v.total;
    else if (typeof v?.best === "number") flat[k] = v.best;
  }
  return {
    level: a.level ?? 0,
    xp: a.xp ?? 0,
    totalXp: a.totalXp ?? 0,
    tier: a.tier ?? 0,
    stats: flat,
  };
}

export async function getMatch(shard: Shard, matchId: string): Promise<MatchDetails> {
  const doc = await call(`/shards/${shard}/matches/${matchId}`);
  const data = doc.data as JsonApiResource<{
    createdAt: string;
    duration: number;
    gameMode: GameMode;
    mapName: string;
    isCustomMatch: boolean;
    seasonState?: string;
    shardId: Shard;
    titleId?: string;
  }>;
  const attrs = data.attributes!;

  const rosters: Roster[] = listIncluded<{
    won: string;
    stats: { rank: number; teamId: number };
    shardId: Shard;
  }>(doc.included, "roster").map((r) => ({
    id: r.id,
    rank: r.attributes?.stats.rank ?? 0,
    teamId: r.attributes?.stats.teamId ?? 0,
    won: r.attributes?.won === "true",
    shardId: r.attributes?.shardId ?? shard,
    participantIds: relMany(r, "participants").map((p) => p.id),
  }));

  const participants: Participant[] = listIncluded<{
    stats: {
      DBNOs: number;
      assists: number;
      boosts: number;
      damageDealt: number;
      deathType: string;
      headshotKills: number;
      heals: number;
      killPlace: number;
      killPoints: number;
      killStreaks: number;
      kills: number;
      longestKill: number;
      name: string;
      playerId: string;
      revives: number;
      rideDistance: number;
      roadKills: number;
      swimDistance: number;
      teamKills: number;
      timeSurvived: number;
      vehicleDestroys: number;
      walkDistance: number;
      weaponsAcquired: number;
      winPlace: number;
    };
  }>(doc.included, "participant").map((p) => {
    const s = p.attributes!.stats;
    return {
      id: p.id,
      stats: {
        kills: s.kills,
        assists: s.assists,
        damageDealt: s.damageDealt,
        headshotKills: s.headshotKills,
        longestKill: s.longestKill,
        timeSurvived: s.timeSurvived,
        walkDistance: s.walkDistance,
        rideDistance: s.rideDistance,
        swimDistance: s.swimDistance,
        weaponsAcquired: s.weaponsAcquired,
        boosts: s.boosts,
        heals: s.heals,
        revives: s.revives,
        DBNOs: s.DBNOs,
        winPlace: s.winPlace,
        killPlace: s.killPlace,
        killStreaks: s.killStreaks,
        vehicleDestroys: s.vehicleDestroys,
        teamKills: s.teamKills,
        roadKills: s.roadKills,
        deathType: s.deathType,
        name: s.name,
        playerId: s.playerId,
      },
    };
  });

  const telemetryAsset = listIncluded<{ name: string; URL: string }>(doc.included, "asset").find(
    (a) => a.attributes?.name === "telemetry",
  );
  const telemetryUrl = telemetryAsset?.attributes?.URL ?? null;

  return {
    id: data.id,
    createdAt: attrs.createdAt,
    duration: attrs.duration,
    gameMode: attrs.gameMode,
    mapName: attrs.mapName,
    isCustomMatch: attrs.isCustomMatch,
    seasonState: attrs.seasonState,
    shardId: attrs.shardId,
    titleId: attrs.titleId,
    rosters,
    participants,
    telemetryUrl,
  };
}

export async function getSeasons(shard: Shard): Promise<Season[]> {
  const doc = await call(`/shards/${shard}/seasons`);
  const arr = Array.isArray(doc.data) ? doc.data : [doc.data];
  return arr.map((r) => {
    const attrs = (r as JsonApiResource).attributes as
      | { isCurrentSeason?: boolean; isOffseason?: boolean }
      | undefined;
    return {
      id: r.id,
      isCurrent: !!attrs?.isCurrentSeason,
      isOffseason: !!attrs?.isOffseason,
    };
  });
}

export async function getCurrentSeason(shard: Shard): Promise<Season | null> {
  const seasons = await getSeasons(shard);
  return seasons.find((s) => s.isCurrent) ?? null;
}

export async function getLeaderboard(
  shard: Shard | string,
  seasonId: string,
  gameMode: GameMode,
): Promise<Leaderboard> {
  // Leaderboards live under a regional shard (pc-na/pc-eu/etc.), not the
  // player shard (steam/psn/xbox). See LEADERBOARD_SHARDS in shards.ts.
  const doc = await call(`/shards/${shard}/leaderboards/${seasonId}/${gameMode}`);
  const data = doc.data as JsonApiResource;
  const players = relMany(data, "players");

  const entries: LeaderboardEntry[] = players
    .map((p, idx): LeaderboardEntry | null => {
      const inc = findIncluded<{
        name: string;
        rank: number;
        stats: {
          rankPoints: number;
          wins: number;
          games: number;
          averageDamage: number;
          kills: number;
          killDeathRatio: number;
          averageRank: number;
          tier?: string;
          subTier?: string;
        };
      }>(doc.included, "player", p.id);
      if (!inc) return null;
      const a = inc.attributes!;
      return {
        rank: a.rank ?? idx + 1,
        playerId: inc.id,
        playerName: a.name,
        rankPoints: a.stats.rankPoints,
        wins: a.stats.wins,
        games: a.stats.games,
        averageDamage: a.stats.averageDamage,
        kills: a.stats.kills,
        killDeathRatio: a.stats.killDeathRatio,
        averageRank: a.stats.averageRank,
        tier: a.stats.tier,
      };
    })
    .filter((x): x is LeaderboardEntry => x !== null)
    .sort((a, b) => a.rank - b.rank);

  return { seasonId, gameMode, shardId: shard, entries };
}

export async function getTelemetry(url: string): Promise<unknown[]> {
  if (!url) return [];
  const res = await proxyTelemetry(url);
  if (res.status >= 400) return [];
  return Array.isArray(res.body) ? (res.body as unknown[]) : [];
}
