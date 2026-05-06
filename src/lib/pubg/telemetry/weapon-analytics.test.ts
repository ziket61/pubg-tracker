import { describe, expect, it } from "vitest";
import { buildWeaponBreakdown } from "./weapon-analytics";
import type { TelemetryScene } from "./types";

function makeScene(over: Partial<TelemetryScene> = {}): TelemetryScene {
  return {
    matchStartTime: 0,
    matchEndTime: 1_800_000,
    durationSec: 1800,
    mapName: "Baltic_Main",
    positions: [],
    kills: [],
    knocks: [],
    damages: [],
    carePackages: [],
    zones: [],
    players: new Map(),
    ...over,
  };
}

describe("buildWeaponBreakdown", () => {
  it("returns empty when no events", () => {
    expect(buildWeaponBreakdown(makeScene(), "me")).toEqual([]);
  });

  it("aggregates damage / kills / knocks / headshots / longest kill per weapon", () => {
    const scene = makeScene({
      damages: [
        { time: 5, attacker: { accountId: "me", name: "Me" }, victim: { accountId: "v", name: "V" }, damage: 30, damageType: "x", damageReason: "x", damageCauserName: "WeapAK47_C", distance: 1000 },
        { time: 6, attacker: { accountId: "me", name: "Me" }, victim: { accountId: "v", name: "V" }, damage: 20, damageType: "x", damageReason: "x", damageCauserName: "WeapAK47_C", distance: 1000 },
        { time: 50, attacker: { accountId: "me", name: "Me" }, victim: { accountId: "x", name: "X" }, damage: 80, damageType: "x", damageReason: "x", damageCauserName: "WeapKar98k_C", distance: 12000 },
      ],
      knocks: [
        { time: 7, attacker: { accountId: "me", name: "Me" }, victim: { accountId: "v", name: "V" }, damageCauserName: "WeapAK47_C", distance: 1000 },
      ],
      kills: [
        { time: 10, killer: { accountId: "me", name: "Me" }, victim: { accountId: "v", name: "V" }, damageCauserName: "WeapAK47_C", damageReason: "ChestShot", distance: 1500, isHeadshot: false },
        { time: 60, killer: { accountId: "me", name: "Me" }, victim: { accountId: "x", name: "X" }, damageCauserName: "WeapKar98k_C", damageReason: "HeadShot", distance: 18500, isHeadshot: true },
      ],
    });

    const rows = buildWeaponBreakdown(scene, "me");
    // Sorted by damage desc
    expect(rows[0]!.weapon).toBe("WeapKar98k_C");
    expect(rows[0]!.damage).toBe(80);
    expect(rows[0]!.kills).toBe(1);
    expect(rows[0]!.headshots).toBe(1);
    expect(rows[0]!.longestKill).toBe(18500);

    expect(rows[1]!.weapon).toBe("WeapAK47_C");
    expect(rows[1]!.damage).toBe(50);
    expect(rows[1]!.kills).toBe(1);
    expect(rows[1]!.knocks).toBe(1);
  });

  it("ignores damage/kills where the player is the victim", () => {
    const scene = makeScene({
      damages: [
        { time: 1, attacker: { accountId: "x", name: "X" }, victim: { accountId: "me", name: "Me" }, damage: 100, damageType: "x", damageReason: "x", damageCauserName: "WeapAK47_C", distance: 100 },
      ],
      kills: [
        { time: 2, killer: { accountId: "x", name: "X" }, victim: { accountId: "me", name: "Me" }, damageCauserName: "WeapAK47_C", damageReason: "x", distance: 100, isHeadshot: false },
      ],
    });
    expect(buildWeaponBreakdown(scene, "me")).toEqual([]);
  });
});
