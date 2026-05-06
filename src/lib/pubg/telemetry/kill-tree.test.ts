import { describe, expect, it } from "vitest";
import { buildKillTree } from "./kill-tree";
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

describe("buildKillTree", () => {
  it("returns empty when scene has no kills", () => {
    expect(buildKillTree(makeScene())).toEqual([]);
  });

  it("groups victims by their team and adds knock+kill metadata", () => {
    const players = new Map([
      ["att", { accountId: "att", name: "Attacker", teamId: 1 }],
      ["assist", { accountId: "assist", name: "Assist", teamId: 1 }],
      ["vic", { accountId: "vic", name: "Victim", teamId: 7 }],
    ]);
    const scene = makeScene({
      players,
      knocks: [
        {
          time: 100,
          attacker: { accountId: "assist", name: "Assist" },
          victim: { accountId: "vic", name: "Victim" },
          damageCauserName: "WeapAK47_C",
          distance: 5000,
        },
      ],
      kills: [
        {
          time: 105,
          killer: { accountId: "att", name: "Attacker" },
          victim: { accountId: "vic", name: "Victim", location: { x: 0, y: 0, z: 0 } },
          damageCauserName: "WeapAK47_C",
          damageReason: "HeadShot",
          distance: 5500,
          isHeadshot: true,
        },
      ],
    });

    const tree = buildKillTree(scene);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.teamId).toBe(7); // victim's team
    expect(tree[0]!.victims).toHaveLength(1);
    const v = tree[0]!.victims[0]!;
    expect(v.killedBy?.name).toBe("Attacker");
    expect(v.knockedBy?.name).toBe("Assist");
    expect(v.isHeadshot).toBe(true);
  });

  it("uses earliest knock per victim when re-knocked", () => {
    const players = new Map([
      ["v", { accountId: "v", name: "V", teamId: 1 }],
    ]);
    const scene = makeScene({
      players,
      knocks: [
        {
          time: 80,
          attacker: { accountId: "a1", name: "First" },
          victim: { accountId: "v", name: "V" },
          damageCauserName: "x",
          distance: 0,
        },
        {
          time: 100,
          attacker: { accountId: "a2", name: "Second" },
          victim: { accountId: "v", name: "V" },
          damageCauserName: "x",
          distance: 0,
        },
      ],
      kills: [
        {
          time: 110,
          killer: { accountId: "a2", name: "Second" },
          victim: { accountId: "v", name: "V" },
          damageCauserName: "x",
          damageReason: "x",
          distance: 0,
          isHeadshot: false,
        },
      ],
    });

    const tree = buildKillTree(scene);
    expect(tree[0]!.victims[0]!.knockedBy?.name).toBe("First");
  });
});
