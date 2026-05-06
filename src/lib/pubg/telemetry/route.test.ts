import { describe, expect, it } from "vitest";
import { extractRoute } from "./route";
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

describe("extractRoute", () => {
  it("returns empty route for player with no positions", () => {
    const r = extractRoute(makeScene(), "ghost");
    expect(r.path).toEqual([]);
    expect(r.landing).toBeNull();
    expect(r.death).toBeNull();
    expect(r.kills).toEqual([]);
  });

  it("uses first position as landing and tracks ordered path", () => {
    const scene = makeScene({
      positions: [
        { time: 5, accountId: "me", name: "Me", health: 100, location: { x: 100_000, y: 100_000, z: 0 } },
        { time: 60, accountId: "me", name: "Me", health: 100, location: { x: 200_000, y: 200_000, z: 0 } },
        { time: 30, accountId: "other", name: "O", health: 100, location: { x: 0, y: 0, z: 0 } },
      ],
      players: new Map([
        ["me", { accountId: "me", name: "Me", teamId: 3 }],
      ]),
    });
    const r = extractRoute(scene, "me");
    expect(r.name).toBe("Me");
    expect(r.teamId).toBe(3);
    expect(r.landing?.x).toBe(100_000);
    expect(r.path).toHaveLength(2);
    expect(r.path[1]!.time).toBe(60);
  });

  it("captures death location from kill events", () => {
    const scene = makeScene({
      positions: [
        { time: 5, accountId: "me", name: "Me", health: 100, location: { x: 100, y: 100, z: 0 } },
      ],
      kills: [
        {
          time: 200,
          killer: { accountId: "att", name: "Att" },
          victim: { accountId: "me", name: "Me", location: { x: 555, y: 666, z: 0 } },
          damageCauserName: "x",
          damageReason: "x",
          distance: 0,
          isHeadshot: false,
        },
      ],
    });
    const r = extractRoute(scene, "me");
    expect(r.death?.x).toBe(555);
    expect(r.death?.y).toBe(666);
  });

  it("captures kills with victim location", () => {
    const scene = makeScene({
      positions: [
        { time: 5, accountId: "me", name: "Me", health: 100, location: { x: 0, y: 0, z: 0 } },
      ],
      kills: [
        {
          time: 100,
          killer: { accountId: "me", name: "Me" },
          victim: { accountId: "v1", name: "V1", location: { x: 1000, y: 2000, z: 0 } },
          damageCauserName: "WeapAK47_C",
          damageReason: "x",
          distance: 5000,
          isHeadshot: false,
        },
        {
          time: 150,
          killer: { accountId: "me", name: "Me" },
          victim: { accountId: "v2", name: "V2" /* no location, should be skipped */ },
          damageCauserName: "x",
          damageReason: "x",
          distance: 0,
          isHeadshot: false,
        },
      ],
    });
    const r = extractRoute(scene, "me");
    expect(r.kills).toHaveLength(1);
    expect(r.kills[0]!.victim).toBe("V1");
    expect(r.kills[0]!.weapon).toBe("WeapAK47_C");
  });
});
