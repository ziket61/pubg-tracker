// Permissive PUBG telemetry parser. Folds raw events into a `TelemetryScene`
// with timestamps relative to match start. Unknown event types are ignored.
import type {
  CarePackageEvent,
  DamageEvent,
  KillEvent,
  KnockEvent,
  PlayerRef,
  PositionSample,
  RawTelemetryEvent,
  TelemetryScene,
  Vec3,
  ZoneSample,
} from "./types";

interface RawCharacter {
  accountId?: string;
  name?: string;
  teamId?: number;
  health?: number;
  location?: { x?: number; y?: number; z?: number };
  ranking?: number;
}

function vec(loc: RawCharacter["location"]): Vec3 {
  return { x: loc?.x ?? 0, y: loc?.y ?? 0, z: loc?.z ?? 0 };
}

function ref(c: RawCharacter | undefined | null): PlayerRef | null {
  if (!c || !c.accountId) return null;
  return {
    accountId: c.accountId,
    name: c.name ?? c.accountId,
    teamId: c.teamId,
    health: c.health,
    location: c.location ? vec(c.location) : undefined,
  };
}

function refRequired(c: RawCharacter | undefined | null, fallbackId: string): PlayerRef {
  return (
    ref(c) ?? {
      accountId: fallbackId,
      name: c?.name ?? fallbackId,
    }
  );
}

export function parseTelemetry(raw: unknown[], mapNameHint?: string): TelemetryScene {
  const events = (raw ?? []) as RawTelemetryEvent[];

  // Match boundaries
  let matchStartTime = 0;
  let matchEndTime = 0;
  let mapName = mapNameHint ?? "";

  for (const e of events) {
    if (e._T === "LogMatchStart" && !matchStartTime) {
      matchStartTime = Date.parse(e._D);
      const m = (e as RawTelemetryEvent & { mapName?: string }).mapName;
      if (m) mapName = m;
    }
    if (e._T === "LogMatchEnd") {
      matchEndTime = Date.parse(e._D);
    }
  }

  if (!matchStartTime && events.length) {
    matchStartTime = Date.parse(events[0]!._D);
  }
  if (!matchEndTime && events.length) {
    matchEndTime = Date.parse(events[events.length - 1]!._D);
  }
  const durationSec = Math.max(0, Math.floor((matchEndTime - matchStartTime) / 1000));

  const positions: PositionSample[] = [];
  const kills: KillEvent[] = [];
  const knocks: KnockEvent[] = [];
  const damages: DamageEvent[] = [];
  const carePackages: CarePackageEvent[] = [];
  const zones: ZoneSample[] = [];
  const players = new Map<string, PlayerRef>();

  const seenPlayer = (p: PlayerRef | null) => {
    if (!p) return;
    const existing = players.get(p.accountId);
    if (!existing) {
      players.set(p.accountId, { ...p });
    } else {
      players.set(p.accountId, {
        ...existing,
        ...p,
        teamId: p.teamId ?? existing.teamId,
        location: p.location ?? existing.location,
      });
    }
  };

  const tOf = (e: RawTelemetryEvent): number =>
    Math.max(0, Math.round((Date.parse(e._D) - matchStartTime) / 1000));

  for (const e of events) {
    switch (e._T) {
      case "LogPlayerPosition": {
        const c = (e as RawTelemetryEvent & { character?: RawCharacter }).character;
        if (!c?.accountId || !c.location) continue;
        const t = tOf(e);
        const sample: PositionSample = {
          time: t,
          accountId: c.accountId,
          name: c.name ?? c.accountId,
          teamId: c.teamId,
          health: c.health ?? 100,
          location: vec(c.location),
        };
        positions.push(sample);
        seenPlayer({
          accountId: sample.accountId,
          name: sample.name,
          teamId: sample.teamId,
          health: sample.health,
          location: sample.location,
        });
        break;
      }
      case "LogPlayerKillV2":
      case "LogPlayerKill": {
        const ev = e as RawTelemetryEvent & {
          killer?: RawCharacter;
          victim?: RawCharacter;
          finisher?: RawCharacter;
          damageCauserName?: string;
          damageReason?: string;
          distance?: number;
          finishDamageInfo?: { damageReason?: string; distance?: number; damageCauserName?: string };
        };
        const killer = ref(ev.finisher ?? ev.killer);
        const victim = refRequired(ev.victim, "unknown-victim");
        seenPlayer(killer);
        seenPlayer(victim);
        const reason =
          ev.finishDamageInfo?.damageReason ?? ev.damageReason ?? "ArmShot";
        const distance =
          ev.finishDamageInfo?.distance ?? ev.distance ?? 0;
        kills.push({
          time: tOf(e),
          killer,
          victim,
          damageCauserName:
            ev.finishDamageInfo?.damageCauserName ??
            ev.damageCauserName ??
            "unknown",
          damageReason: reason,
          distance,
          isHeadshot: reason === "HeadShot",
        });
        break;
      }
      case "LogPlayerMakeGroggy": {
        const ev = e as RawTelemetryEvent & {
          attacker?: RawCharacter;
          victim?: RawCharacter;
          damageCauserName?: string;
          distance?: number;
        };
        const attacker = ref(ev.attacker);
        const victim = refRequired(ev.victim, "unknown-victim");
        seenPlayer(attacker);
        seenPlayer(victim);
        knocks.push({
          time: tOf(e),
          attacker,
          victim,
          damageCauserName: ev.damageCauserName ?? "unknown",
          distance: ev.distance ?? 0,
        });
        break;
      }
      case "LogPlayerTakeDamage": {
        const ev = e as RawTelemetryEvent & {
          attacker?: RawCharacter;
          victim?: RawCharacter;
          damage?: number;
          damageTypeCategory?: string;
          damageReason?: string;
          damageCauserName?: string;
          distance?: number;
        };
        const attacker = ref(ev.attacker);
        const victim = refRequired(ev.victim, "unknown-victim");
        seenPlayer(attacker);
        seenPlayer(victim);
        damages.push({
          time: tOf(e),
          attacker,
          victim,
          damage: ev.damage ?? 0,
          damageType: ev.damageTypeCategory ?? "unknown",
          damageReason: ev.damageReason ?? "unknown",
          damageCauserName: ev.damageCauserName ?? "unknown",
          distance: ev.distance ?? 0,
        });
        break;
      }
      case "LogCarePackageLand": {
        const ev = e as RawTelemetryEvent & {
          itemPackage?: { itemPackageId?: string; location?: { x?: number; y?: number; z?: number } };
        };
        const pkg = ev.itemPackage;
        if (!pkg?.location) continue;
        carePackages.push({
          time: tOf(e),
          itemPackageId: pkg.itemPackageId ?? "unknown",
          location: vec(pkg.location),
        });
        break;
      }
      case "LogGameStatePeriodic": {
        const ev = e as RawTelemetryEvent & {
          gameState?: {
            poisonGasWarningPosition?: { x?: number; y?: number; z?: number };
            poisonGasWarningRadius?: number;
            safetyZonePosition?: { x?: number; y?: number; z?: number };
            safetyZoneRadius?: number;
          };
        };
        const g = ev.gameState;
        if (!g) continue;
        zones.push({
          time: tOf(e),
          poisonGasWarningPosition: g.poisonGasWarningPosition
            ? vec(g.poisonGasWarningPosition)
            : undefined,
          poisonGasWarningRadius: g.poisonGasWarningRadius,
          safetyZonePosition: g.safetyZonePosition ? vec(g.safetyZonePosition) : undefined,
          safetyZoneRadius: g.safetyZoneRadius,
        });
        break;
      }
      // Unknown / unused events are ignored on purpose.
    }
  }

  positions.sort((a, b) => a.time - b.time);
  kills.sort((a, b) => a.time - b.time);
  knocks.sort((a, b) => a.time - b.time);
  damages.sort((a, b) => a.time - b.time);
  carePackages.sort((a, b) => a.time - b.time);
  zones.sort((a, b) => a.time - b.time);

  return {
    matchStartTime,
    matchEndTime,
    durationSec,
    mapName,
    positions,
    kills,
    knocks,
    damages,
    carePackages,
    zones,
    players,
  };
}
