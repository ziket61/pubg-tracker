// Per-player damage flow: chronological list of damage taken/dealt + summary.
import type { DamageEvent, KillEvent, KnockEvent, TelemetryScene } from "./types";

export interface TimelineEntry {
  time: number;
  kind: "damage-dealt" | "damage-taken" | "knock-given" | "knock-taken" | "kill" | "death";
  other: string; // other player's name (or "—")
  weapon: string;
  amount: number; // damage delta or 0 for non-damage events
  distance: number;
  isHeadshot?: boolean;
}

export interface DamageSummary {
  totalGiven: number;
  totalTaken: number;
  killsDealt: number;
  knocksDealt: number;
  diedAt: number | null;
  entries: TimelineEntry[];
}

export function buildDamageTimeline(scene: TelemetryScene, accountId: string): DamageSummary {
  const entries: TimelineEntry[] = [];
  let totalGiven = 0;
  let totalTaken = 0;
  let killsDealt = 0;
  let knocksDealt = 0;
  let diedAt: number | null = null;

  for (const d of scene.damages as DamageEvent[]) {
    if (d.attacker?.accountId === accountId && d.victim.accountId !== accountId) {
      totalGiven += d.damage;
      entries.push({
        time: d.time,
        kind: "damage-dealt",
        other: d.victim.name,
        weapon: d.damageCauserName,
        amount: d.damage,
        distance: d.distance,
      });
    } else if (d.victim.accountId === accountId) {
      totalTaken += d.damage;
      entries.push({
        time: d.time,
        kind: "damage-taken",
        other: d.attacker?.name ?? "—",
        weapon: d.damageCauserName,
        amount: d.damage,
        distance: d.distance,
      });
    }
  }

  for (const k of scene.knocks as KnockEvent[]) {
    if (k.attacker?.accountId === accountId) {
      knocksDealt += 1;
      entries.push({
        time: k.time,
        kind: "knock-given",
        other: k.victim.name,
        weapon: k.damageCauserName,
        amount: 0,
        distance: k.distance,
      });
    } else if (k.victim.accountId === accountId) {
      entries.push({
        time: k.time,
        kind: "knock-taken",
        other: k.attacker?.name ?? "—",
        weapon: k.damageCauserName,
        amount: 0,
        distance: k.distance,
      });
    }
  }

  for (const kill of scene.kills as KillEvent[]) {
    if (kill.killer?.accountId === accountId && kill.victim.accountId !== accountId) {
      killsDealt += 1;
      entries.push({
        time: kill.time,
        kind: "kill",
        other: kill.victim.name,
        weapon: kill.damageCauserName,
        amount: 0,
        distance: kill.distance,
        isHeadshot: kill.isHeadshot,
      });
    } else if (kill.victim.accountId === accountId) {
      diedAt = kill.time;
      entries.push({
        time: kill.time,
        kind: "death",
        other: kill.killer?.name ?? "—",
        weapon: kill.damageCauserName,
        amount: 0,
        distance: kill.distance,
        isHeadshot: kill.isHeadshot,
      });
    }
  }

  entries.sort((a, b) => a.time - b.time);

  return {
    totalGiven,
    totalTaken,
    killsDealt,
    knocksDealt,
    diedAt,
    entries,
  };
}
