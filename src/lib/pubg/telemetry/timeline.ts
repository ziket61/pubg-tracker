// Per-time helpers on top of `TelemetryScene` — used by the 2D replay player layer.
import type { PositionSample, TelemetryScene, ZoneSample } from "./types";

export interface PlayerSnapshot {
  accountId: string;
  name: string;
  teamId?: number;
  health: number;
  x: number; // game cm
  y: number; // game cm
  isStale: boolean; // true if the position is from > 30s ago (player likely dead/disconnected)
}

const STALE_THRESHOLD_SEC = 30;

/**
 * Returns the latest known position for every player at or before `time` seconds.
 * Players with no position events yet are omitted.
 */
export function snapshotAt(scene: TelemetryScene, time: number): PlayerSnapshot[] {
  const latest = new Map<string, PositionSample>();
  for (const sample of scene.positions) {
    if (sample.time > time) break;
    latest.set(sample.accountId, sample);
  }
  return Array.from(latest.values()).map((s) => ({
    accountId: s.accountId,
    name: s.name,
    teamId: s.teamId,
    health: s.health,
    x: s.location.x,
    y: s.location.y,
    isStale: time - s.time > STALE_THRESHOLD_SEC,
  }));
}

/**
 * Returns the active zone state at `time` (latest sample at or before that point).
 */
export function zoneAt(scene: TelemetryScene, time: number): ZoneSample | null {
  let active: ZoneSample | null = null;
  for (const z of scene.zones) {
    if (z.time > time) break;
    active = z;
  }
  return active;
}

/**
 * Player position trail — last `windowSec` seconds of movement.
 */
export function trailFor(
  scene: TelemetryScene,
  accountId: string,
  time: number,
  windowSec: number,
): Array<{ x: number; y: number; t: number }> {
  const start = time - windowSec;
  const out: Array<{ x: number; y: number; t: number }> = [];
  for (const s of scene.positions) {
    if (s.accountId !== accountId) continue;
    if (s.time < start) continue;
    if (s.time > time) break;
    out.push({ x: s.location.x, y: s.location.y, t: s.time });
  }
  return out;
}
