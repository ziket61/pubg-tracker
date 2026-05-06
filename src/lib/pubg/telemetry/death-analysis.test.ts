import { describe, expect, it } from "vitest";
import { analyzeDeath } from "./death-analysis";
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

describe("analyzeDeath", () => {
  it("returns null when player did not die", () => {
    expect(analyzeDeath(makeScene(), "alive")).toBeNull();
  });

  it("returns full report with knock + leadup", () => {
    const scene = makeScene({
      kills: [
        {
          time: 200,
          killer: { accountId: "att", name: "Attacker" },
          victim: { accountId: "me", name: "Me" },
          damageCauserName: "WeapKar98k_C",
          damageReason: "HeadShot",
          distance: 12500,
          isHeadshot: true,
        },
      ],
      knocks: [
        {
          time: 180,
          attacker: { accountId: "att2", name: "Pal" },
          victim: { accountId: "me", name: "Me" },
          damageCauserName: "WeapAK47_C",
          distance: 4000,
        },
      ],
      damages: [
        {
          time: 175,
          attacker: { accountId: "att", name: "Attacker" },
          victim: { accountId: "me", name: "Me" },
          damage: 30,
          damageType: "Damage_Gun",
          damageReason: "ChestShot",
          damageCauserName: "WeapAK47_C",
          distance: 4000,
        },
      ],
    });

    const r = analyzeDeath(scene, "me");
    expect(r).not.toBeNull();
    expect(r!.killer?.name).toBe("Attacker");
    expect(r!.isHeadshot).toBe(true);
    expect(r!.knock?.attacker?.name).toBe("Pal");
    expect(r!.damageLeadup).toHaveLength(1);
    expect(r!.totalDamageTaken).toBe(30);
  });
});
