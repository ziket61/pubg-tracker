// Per-team kill flow: who knocked, who killed, who got revenge.
import type { KillEvent, KnockEvent, PlayerRef, TelemetryScene } from "./types";

export interface VictimEntry {
  victim: PlayerRef;
  knockedBy: PlayerRef | null;
  knockedAt: number | null;
  killedBy: PlayerRef | null;
  killedAt: number | null;
  weapon: string;
  distance: number;
  isHeadshot: boolean;
}

export interface TeamKillFlow {
  teamId: number;
  victims: VictimEntry[];
}

export function buildKillTree(scene: TelemetryScene): TeamKillFlow[] {
  const knocksByVictim = new Map<string, KnockEvent>();
  for (const k of scene.knocks) {
    // Keep the first (last-in-time may be a re-knock; first is usually canonical)
    const existing = knocksByVictim.get(k.victim.accountId);
    if (!existing || k.time < existing.time) {
      knocksByVictim.set(k.victim.accountId, k);
    }
  }

  const entries: VictimEntry[] = scene.kills.map((kill: KillEvent) => {
    const knock = knocksByVictim.get(kill.victim.accountId) ?? null;
    return {
      victim: kill.victim,
      knockedBy: knock?.attacker ?? null,
      knockedAt: knock?.time ?? null,
      killedBy: kill.killer,
      killedAt: kill.time,
      weapon: kill.damageCauserName,
      distance: kill.distance,
      isHeadshot: kill.isHeadshot,
    };
  });

  // Group by victim teamId (so a team's row shows everyone who died in that team)
  const groups = new Map<number, VictimEntry[]>();
  for (const e of entries) {
    const teamId = scene.players.get(e.victim.accountId)?.teamId ?? -1;
    const arr = groups.get(teamId) ?? [];
    arr.push(e);
    groups.set(teamId, arr);
  }

  return Array.from(groups.entries())
    .map(([teamId, victims]) => ({ teamId, victims: victims.sort((a, b) => (a.killedAt ?? 0) - (b.killedAt ?? 0)) }))
    .sort((a, b) => a.teamId - b.teamId);
}
