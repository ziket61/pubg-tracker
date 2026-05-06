// "How did I die?" — pulls the killer, weapon, distance, knock event, and
// last few damages received before the killing blow for a specific player.
import type {
  DamageEvent,
  KillEvent,
  KnockEvent,
  PlayerRef,
  TelemetryScene,
} from "./types";

export interface DeathReport {
  victim: PlayerRef;
  killedAt: number;
  killer: PlayerRef | null;
  weapon: string;
  damageReason: string;
  distance: number;
  isHeadshot: boolean;
  knock: { attacker: PlayerRef | null; weapon: string; time: number; distance: number } | null;
  damageLeadup: Array<{
    time: number;
    attacker: PlayerRef | null;
    damage: number;
    weapon: string;
    distance: number;
  }>;
  totalDamageTaken: number;
  survivedSec: number;
}

export function analyzeDeath(
  scene: TelemetryScene,
  accountId: string,
  windowSec = 30,
): DeathReport | null {
  const kill = scene.kills.find((k: KillEvent) => k.victim.accountId === accountId);
  if (!kill) return null;

  const knock = scene.knocks.find(
    (k: KnockEvent) => k.victim.accountId === accountId && k.time <= kill.time,
  );

  const damages = scene.damages.filter(
    (d: DamageEvent) =>
      d.victim.accountId === accountId &&
      d.time <= kill.time &&
      d.time >= kill.time - windowSec,
  );

  const totalDamageTaken = scene.damages
    .filter((d) => d.victim.accountId === accountId)
    .reduce((acc, d) => acc + d.damage, 0);

  return {
    victim: kill.victim,
    killedAt: kill.time,
    killer: kill.killer,
    weapon: kill.damageCauserName,
    damageReason: kill.damageReason,
    distance: kill.distance,
    isHeadshot: kill.isHeadshot,
    knock: knock
      ? {
          attacker: knock.attacker,
          weapon: knock.damageCauserName,
          time: knock.time,
          distance: knock.distance,
        }
      : null,
    damageLeadup: damages.slice(-8).map((d) => ({
      time: d.time,
      attacker: d.attacker,
      damage: d.damage,
      weapon: d.damageCauserName,
      distance: d.distance,
    })),
    totalDamageTaken,
    survivedSec: kill.time,
  };
}
