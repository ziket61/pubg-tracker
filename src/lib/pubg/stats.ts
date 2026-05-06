import type { GameModeStats } from "./types";

export function kd(s: Pick<GameModeStats, "kills" | "roundsPlayed" | "wins">): number {
  const deaths = Math.max(s.roundsPlayed - s.wins, 1);
  return s.kills / deaths;
}

export function winRate(s: Pick<GameModeStats, "wins" | "roundsPlayed">): number {
  if (!s.roundsPlayed) return 0;
  return s.wins / s.roundsPlayed;
}

export function top10Rate(s: Pick<GameModeStats, "top10s" | "roundsPlayed">): number {
  if (!s.roundsPlayed) return 0;
  return s.top10s / s.roundsPlayed;
}

export function avgDamage(
  s: Pick<GameModeStats, "damageDealt" | "roundsPlayed">,
): number {
  if (!s.roundsPlayed) return 0;
  return s.damageDealt / s.roundsPlayed;
}

export function headshotRate(
  s: Pick<GameModeStats, "headshotKills" | "kills">,
): number {
  if (!s.kills) return 0;
  return s.headshotKills / s.kills;
}

export function aggregateLifetime(modes: Partial<Record<string, GameModeStats>>): GameModeStats {
  const empty: GameModeStats = {
    roundsPlayed: 0,
    wins: 0,
    top10s: 0,
    losses: 0,
    kills: 0,
    assists: 0,
    damageDealt: 0,
    headshotKills: 0,
    longestKill: 0,
    dailyKills: 0,
    weeklyKills: 0,
    rideDistance: 0,
    walkDistance: 0,
    swimDistance: 0,
    boosts: 0,
    heals: 0,
    revives: 0,
    teamKills: 0,
    roadKills: 0,
    vehicleDestroys: 0,
    weaponsAcquired: 0,
    timeSurvived: 0,
    killPoints: 0,
    suicides: 0,
    dBNOs: 0,
  };

  return Object.values(modes).reduce<GameModeStats>((acc, m) => {
    if (!m) return acc;
    return {
      ...acc,
      roundsPlayed: acc.roundsPlayed + m.roundsPlayed,
      wins: acc.wins + m.wins,
      top10s: acc.top10s + m.top10s,
      losses: acc.losses + m.losses,
      kills: acc.kills + m.kills,
      assists: acc.assists + m.assists,
      damageDealt: acc.damageDealt + m.damageDealt,
      headshotKills: acc.headshotKills + m.headshotKills,
      longestKill: Math.max(acc.longestKill, m.longestKill),
      rideDistance: acc.rideDistance + m.rideDistance,
      walkDistance: acc.walkDistance + m.walkDistance,
      swimDistance: acc.swimDistance + m.swimDistance,
      boosts: acc.boosts + m.boosts,
      heals: acc.heals + m.heals,
      revives: acc.revives + m.revives,
      teamKills: acc.teamKills + m.teamKills,
      roadKills: acc.roadKills + m.roadKills,
      vehicleDestroys: acc.vehicleDestroys + m.vehicleDestroys,
      weaponsAcquired: acc.weaponsAcquired + m.weaponsAcquired,
      timeSurvived: acc.timeSurvived + m.timeSurvived,
      dBNOs: acc.dBNOs + m.dBNOs,
    };
  }, empty);
}
