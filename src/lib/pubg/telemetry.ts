export interface KillEvent {
  killerName: string;
  killerId: string;
  victimName: string;
  victimId: string;
  weapon: string;
  distanceMeters: number;
  isHeadshot: boolean;
  timestamp: string;
}

export interface MatchHighlights {
  longestKill: KillEvent | null;
  totalKillEvents: number;
  totalEvents: number;
}

interface RawKillV2 {
  _D: string;
  _T: string;
  killer?: { name?: string; accountId?: string };
  victim?: { name?: string; accountId?: string };
  damageCauserName?: string;
  damageReason?: string;
  distance?: number;
}

export function extractHighlights(events: unknown[]): MatchHighlights {
  let longest: KillEvent | null = null;
  let killCount = 0;

  for (const ev of events) {
    if (!ev || typeof ev !== "object") continue;
    const e = ev as RawKillV2;
    if (e._T !== "LogPlayerKillV2") continue;
    if (!e.killer?.name || !e.victim?.name) continue;

    killCount += 1;

    const distance = (e.distance ?? 0) / 100; // PUBG telemetry uses cm
    const kill: KillEvent = {
      killerName: e.killer.name,
      killerId: e.killer.accountId ?? "",
      victimName: e.victim.name,
      victimId: e.victim.accountId ?? "",
      weapon: e.damageCauserName ?? "",
      distanceMeters: Math.round(distance),
      isHeadshot: e.damageReason === "HeadShot",
      timestamp: e._D,
    };

    if (!longest || kill.distanceMeters > longest.distanceMeters) {
      longest = kill;
    }
  }

  return {
    longestKill: longest,
    totalKillEvents: killCount,
    totalEvents: events.length,
  };
}
