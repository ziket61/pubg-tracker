// Player route extraction — landing point, full path, kill spots, death spot.
import type { PlayerSnapshot } from "./timeline";
import type { TelemetryScene, Vec3 } from "./types";

export interface RoutePoint {
  time: number;
  x: number;
  y: number;
}

export interface PlayerRoute {
  accountId: string;
  name: string;
  teamId?: number;
  landing: RoutePoint | null;
  death: RoutePoint | null;
  path: RoutePoint[];
  kills: Array<RoutePoint & { victim: string; weapon: string }>;
  damaged: Array<RoutePoint & { victim: string; weapon: string }>;
}

export function extractRoute(scene: TelemetryScene, accountId: string): PlayerRoute {
  const path: RoutePoint[] = [];
  for (const s of scene.positions) {
    if (s.accountId !== accountId) continue;
    path.push({ time: s.time, x: s.location.x, y: s.location.y });
  }

  // Landing = first known position (usually the parachute drop)
  const landing = path[0] ?? null;

  // Death = position where this player was killed (taken from kill events)
  const deathEvent = scene.kills.find((k) => k.victim.accountId === accountId);
  const death: RoutePoint | null =
    deathEvent && deathEvent.victim.location
      ? { time: deathEvent.time, x: deathEvent.victim.location.x, y: deathEvent.victim.location.y }
      : null;

  // Kills the player got — use victim location (where they fell)
  const kills = scene.kills
    .filter((k) => k.killer?.accountId === accountId && k.victim.location)
    .map((k) => ({
      time: k.time,
      x: (k.victim.location as Vec3).x,
      y: (k.victim.location as Vec3).y,
      victim: k.victim.name,
      weapon: k.damageCauserName,
    }));

  // Damages the player dealt (location of victim)
  const damaged = scene.damages
    .filter((d) => d.attacker?.accountId === accountId && d.victim.location)
    .map((d) => ({
      time: d.time,
      x: (d.victim.location as Vec3).x,
      y: (d.victim.location as Vec3).y,
      victim: d.victim.name,
      weapon: d.damageCauserName,
    }));

  const player = scene.players.get(accountId);

  return {
    accountId,
    name: player?.name ?? accountId,
    teamId: player?.teamId,
    landing,
    death,
    path,
    kills,
    damaged,
  };
}

// Re-export for callers that bundle telemetry helpers
export type { PlayerSnapshot };
