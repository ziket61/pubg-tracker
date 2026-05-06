import { describe, expect, it } from "vitest";
import { killHeat, landingHeat } from "./heatmap";
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

const MAP_CM = 8 * 100_000; // 8km

describe("killHeat", () => {
  it("returns empty for no kills", () => {
    expect(killHeat(makeScene(), MAP_CM)).toEqual([]);
  });

  it("buckets kill locations and normalizes counts", () => {
    const scene = makeScene({
      kills: [
        { time: 1, killer: null, victim: { accountId: "a", name: "A", location: { x: 100, y: 100, z: 0 } }, damageCauserName: "x", damageReason: "x", distance: 0, isHeadshot: false },
        { time: 2, killer: null, victim: { accountId: "b", name: "B", location: { x: 200, y: 200, z: 0 } }, damageCauserName: "x", damageReason: "x", distance: 0, isHeadshot: false },
        { time: 3, killer: null, victim: { accountId: "c", name: "C", location: { x: MAP_CM - 1, y: MAP_CM - 1, z: 0 } }, damageCauserName: "x", damageReason: "x", distance: 0, isHeadshot: false },
      ],
    });
    const buckets = killHeat(scene, MAP_CM);
    expect(buckets.length).toBeGreaterThan(0);
    // All counts in 0..1
    for (const b of buckets) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x).toBeLessThanOrEqual(1);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeLessThanOrEqual(1);
      expect(b.count).toBeGreaterThan(0);
      expect(b.count).toBeLessThanOrEqual(1);
    }
  });

  it("ignores kills without victim location", () => {
    const scene = makeScene({
      kills: [
        { time: 1, killer: null, victim: { accountId: "a", name: "A" }, damageCauserName: "x", damageReason: "x", distance: 0, isHeadshot: false },
      ],
    });
    expect(killHeat(scene, MAP_CM)).toEqual([]);
  });
});

describe("landingHeat", () => {
  it("uses first position per player as landing", () => {
    const scene = makeScene({
      positions: [
        { time: 5, accountId: "p1", name: "P1", health: 100, location: { x: 100_000, y: 100_000, z: 0 } },
        { time: 60, accountId: "p1", name: "P1", health: 100, location: { x: 500_000, y: 500_000, z: 0 } },
        { time: 5, accountId: "p2", name: "P2", health: 100, location: { x: 200_000, y: 200_000, z: 0 } },
      ],
    });
    const buckets = landingHeat(scene, MAP_CM);
    expect(buckets.length).toBeGreaterThan(0);
    // Expect landings near low coords (we used 100k and 200k out of 800k)
    const xs = buckets.map((b) => b.x);
    expect(Math.min(...xs)).toBeLessThan(0.5);
  });
});
