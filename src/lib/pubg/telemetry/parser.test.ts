import { describe, expect, it } from "vitest";
import { parseTelemetry } from "./parser";

const STARTED = "2026-05-01T12:00:00.000Z";
const t = (sec: number) => new Date(Date.parse(STARTED) + sec * 1000).toISOString();

describe("parseTelemetry", () => {
  it("returns an empty scene for empty input", () => {
    const s = parseTelemetry([]);
    expect(s.positions).toEqual([]);
    expect(s.kills).toEqual([]);
    expect(s.durationSec).toBe(0);
  });

  it("computes match duration from start/end events", () => {
    const s = parseTelemetry([
      { _T: "LogMatchStart", _D: STARTED, mapName: "Baltic_Main" },
      { _T: "LogMatchEnd", _D: t(180) },
    ]);
    expect(s.durationSec).toBe(180);
    expect(s.mapName).toBe("Baltic_Main");
  });

  it("normalizes a position event with relative time", () => {
    const s = parseTelemetry([
      { _T: "LogMatchStart", _D: STARTED, mapName: "Baltic_Main" },
      {
        _T: "LogPlayerPosition",
        _D: t(45),
        character: {
          accountId: "acc-shroud",
          name: "shroud",
          teamId: 7,
          health: 100,
          location: { x: 200_000, y: 300_000, z: 0 },
        },
      },
      { _T: "LogMatchEnd", _D: t(200) },
    ]);
    expect(s.positions).toHaveLength(1);
    expect(s.positions[0]!.time).toBe(45);
    expect(s.positions[0]!.location.x).toBe(200_000);
    expect(s.players.get("acc-shroud")?.teamId).toBe(7);
  });

  it("parses kill events from V2 and legacy shapes", () => {
    const s = parseTelemetry([
      { _T: "LogMatchStart", _D: STARTED, mapName: "Baltic_Main" },
      {
        _T: "LogPlayerKillV2",
        _D: t(60),
        finisher: { accountId: "kill-er", name: "killer" },
        victim: { accountId: "vic-1", name: "victim" },
        finishDamageInfo: { damageReason: "HeadShot", distance: 12500, damageCauserName: "WeapAK47_C" },
      },
      { _T: "LogMatchEnd", _D: t(200) },
    ]);
    expect(s.kills).toHaveLength(1);
    expect(s.kills[0]!.killer?.name).toBe("killer");
    expect(s.kills[0]!.isHeadshot).toBe(true);
    expect(s.kills[0]!.distance).toBe(12500);
    expect(s.kills[0]!.damageCauserName).toBe("WeapAK47_C");
  });

  it("ignores unknown event types", () => {
    const s = parseTelemetry([
      { _T: "LogMatchStart", _D: STARTED },
      { _T: "LogTotallyMadeUp", _D: t(10), foo: "bar" },
      { _T: "LogMatchEnd", _D: t(20) },
    ]);
    expect(s.kills).toEqual([]);
    expect(s.positions).toEqual([]);
  });

  it("captures knock and damage events", () => {
    const s = parseTelemetry([
      { _T: "LogMatchStart", _D: STARTED },
      {
        _T: "LogPlayerMakeGroggy",
        _D: t(30),
        attacker: { accountId: "a1", name: "att" },
        victim: { accountId: "v1", name: "vic" },
        damageCauserName: "WeapM416_C",
        distance: 5000,
      },
      {
        _T: "LogPlayerTakeDamage",
        _D: t(40),
        attacker: { accountId: "a1", name: "att" },
        victim: { accountId: "v1", name: "vic" },
        damage: 25,
        damageTypeCategory: "Damage_Gun",
        damageReason: "ArmShot",
        damageCauserName: "WeapM416_C",
        distance: 5000,
      },
      { _T: "LogMatchEnd", _D: t(60) },
    ]);
    expect(s.knocks).toHaveLength(1);
    expect(s.damages).toHaveLength(1);
    expect(s.damages[0]!.damage).toBe(25);
  });
});
