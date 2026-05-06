import { describe, expect, it } from "vitest";
import { buildDamageTimeline } from "./damage-timeline";
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

describe("buildDamageTimeline", () => {
  it("returns zeros for player with no events", () => {
    const s = buildDamageTimeline(makeScene(), "ghost");
    expect(s.totalGiven).toBe(0);
    expect(s.totalTaken).toBe(0);
    expect(s.diedAt).toBeNull();
    expect(s.entries).toEqual([]);
  });

  it("sums damage given vs taken correctly", () => {
    const scene = makeScene({
      damages: [
        {
          time: 10,
          attacker: { accountId: "me", name: "Me" },
          victim: { accountId: "v", name: "Vic" },
          damage: 50,
          damageType: "x",
          damageReason: "x",
          damageCauserName: "x",
          distance: 0,
        },
        {
          time: 20,
          attacker: { accountId: "v", name: "Vic" },
          victim: { accountId: "me", name: "Me" },
          damage: 25,
          damageType: "x",
          damageReason: "x",
          damageCauserName: "x",
          distance: 0,
        },
      ],
    });
    const s = buildDamageTimeline(scene, "me");
    expect(s.totalGiven).toBe(50);
    expect(s.totalTaken).toBe(25);
    expect(s.entries).toHaveLength(2);
    expect(s.entries[0]!.kind).toBe("damage-dealt");
    expect(s.entries[1]!.kind).toBe("damage-taken");
  });

  it("counts knocks dealt and kills dealt; flags death", () => {
    const scene = makeScene({
      knocks: [
        {
          time: 30,
          attacker: { accountId: "me", name: "Me" },
          victim: { accountId: "v", name: "V" },
          damageCauserName: "x",
          distance: 0,
        },
      ],
      kills: [
        {
          time: 40,
          killer: { accountId: "me", name: "Me" },
          victim: { accountId: "v", name: "V" },
          damageCauserName: "x",
          damageReason: "x",
          distance: 0,
          isHeadshot: false,
        },
        {
          time: 60,
          killer: { accountId: "x", name: "X" },
          victim: { accountId: "me", name: "Me" },
          damageCauserName: "x",
          damageReason: "x",
          distance: 0,
          isHeadshot: false,
        },
      ],
    });
    const s = buildDamageTimeline(scene, "me");
    expect(s.knocksDealt).toBe(1);
    expect(s.killsDealt).toBe(1);
    expect(s.diedAt).toBe(60);
    expect(s.entries.find((e) => e.kind === "death")?.time).toBe(60);
  });

  it("entries are sorted chronologically", () => {
    const scene = makeScene({
      damages: [
        {
          time: 100,
          attacker: { accountId: "me", name: "Me" },
          victim: { accountId: "v", name: "V" },
          damage: 10,
          damageType: "x",
          damageReason: "x",
          damageCauserName: "x",
          distance: 0,
        },
      ],
      knocks: [
        {
          time: 50,
          attacker: { accountId: "me", name: "Me" },
          victim: { accountId: "v", name: "V" },
          damageCauserName: "x",
          distance: 0,
        },
      ],
    });
    const s = buildDamageTimeline(scene, "me");
    expect(s.entries.map((e) => e.time)).toEqual([50, 100]);
  });
});
