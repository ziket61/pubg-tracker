// Per-player weapon breakdown for a single match.
import type { TelemetryScene } from "./types";

export interface WeaponBreakdownEntry {
  weapon: string;
  kills: number;
  knocks: number;
  damage: number;
  headshots: number;
  longestKill: number;
}

export function buildWeaponBreakdown(
  scene: TelemetryScene,
  accountId: string,
): WeaponBreakdownEntry[] {
  const map = new Map<string, WeaponBreakdownEntry>();
  const get = (w: string): WeaponBreakdownEntry => {
    let e = map.get(w);
    if (!e) {
      e = { weapon: w, kills: 0, knocks: 0, damage: 0, headshots: 0, longestKill: 0 };
      map.set(w, e);
    }
    return e;
  };

  for (const d of scene.damages) {
    if (d.attacker?.accountId !== accountId) continue;
    if (!d.damageCauserName) continue;
    const e = get(d.damageCauserName);
    e.damage += d.damage;
  }
  for (const k of scene.knocks) {
    if (k.attacker?.accountId !== accountId) continue;
    const e = get(k.damageCauserName);
    e.knocks += 1;
  }
  for (const kill of scene.kills) {
    if (kill.killer?.accountId !== accountId) continue;
    const e = get(kill.damageCauserName);
    e.kills += 1;
    if (kill.isHeadshot) e.headshots += 1;
    if (kill.distance > e.longestKill) e.longestKill = kill.distance;
  }

  return Array.from(map.values()).sort((a, b) => b.damage - a.damage);
}
