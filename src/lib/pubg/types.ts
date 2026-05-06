import type { Shard, GameMode } from "./shards";

export type { Shard, GameMode };

export interface PlayerSummary {
  id: string;
  name: string;
  shardId: Shard;
  matchIds: string[];
  bannedTypes?: string[];
  patchVersion?: string;
}

export interface MatchPreview {
  id: string;
  createdAt: string;
  duration: number;
  gameMode: GameMode;
  mapName: string;
  shardId: Shard;
  isCustomMatch: boolean;
}

export interface ParticipantStats {
  kills: number;
  assists: number;
  damageDealt: number;
  headshotKills: number;
  longestKill: number;
  timeSurvived: number;
  walkDistance: number;
  rideDistance: number;
  swimDistance: number;
  weaponsAcquired: number;
  boosts: number;
  heals: number;
  revives: number;
  DBNOs: number;
  winPlace: number;
  killPlace: number;
  killStreaks: number;
  vehicleDestroys: number;
  teamKills: number;
  roadKills: number;
  deathType: string;
  name: string;
  playerId: string;
}

export interface Participant {
  id: string;
  stats: ParticipantStats;
}

export interface Roster {
  id: string;
  rank: number;
  teamId: number;
  participantIds: string[];
  won: boolean;
  shardId: Shard;
}

export interface MatchDetails extends MatchPreview {
  rosters: Roster[];
  participants: Participant[];
  telemetryUrl: string | null;
  seasonState?: string;
  titleId?: string;
}

export interface GameModeStats {
  roundsPlayed: number;
  wins: number;
  top10s: number;
  losses: number;
  kills: number;
  assists: number;
  damageDealt: number;
  headshotKills: number;
  longestKill: number;
  dailyKills: number;
  weeklyKills: number;
  rideDistance: number;
  walkDistance: number;
  swimDistance: number;
  boosts: number;
  heals: number;
  revives: number;
  teamKills: number;
  roadKills: number;
  vehicleDestroys: number;
  weaponsAcquired: number;
  timeSurvived: number;
  killPoints: number;
  rankPoints?: number;
  rankPointsTitle?: string;
  suicides: number;
  dBNOs: number;
}

export type ModeStatsMap = Partial<Record<GameMode, GameModeStats>>;

export interface SeasonStats {
  playerId: string;
  seasonId: string;
  shardId: Shard;
  gameModes: ModeStatsMap;
}

export interface LifetimeStats {
  playerId: string;
  shardId: Shard;
  gameModes: ModeStatsMap;
}

export interface WeaponMasteryEntry {
  weaponId: string;
  level: number;
  xpTotal: number;
  tier?: string;
  kills: number;
  damagePlayer: number;
  headshots: number;
  longestDefeat: number;
}

export interface WeaponMastery {
  playerId: string;
  weapons: WeaponMasteryEntry[];
}

export interface SurvivalMasteryStats {
  level: number;
  xp: number;
  totalXp: number;
  tier: number;
  tierName?: string;
  stats: Record<string, number>;
}

export interface Season {
  id: string;
  isCurrent: boolean;
  isOffseason: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  rankPoints: number;
  wins: number;
  games: number;
  averageDamage: number;
  kills: number;
  killDeathRatio: number;
  averageRank: number;
  tier?: string;
}

export interface Leaderboard {
  seasonId: string;
  gameMode: GameMode;
  // Regional shard (pc-na, pc-eu, ...) rather than a player shard.
  shardId: string;
  entries: LeaderboardEntry[];
}
