import { describe, expect, it } from "vitest";
import { detectAnomalies } from "./anomalies";
import type { GameModeStats } from "./types";

const base = (over: Partial<GameModeStats>): GameModeStats => ({
  roundsPlayed: 0,
  wins: 0,
  top10s: 0,
  losses: 0,
  kills: 0,
  assists: 0,
  damageDealt: 0,
  headshotKills: 0,
  longestKill: 0,
  dailyKills: 0,
  weeklyKills: 0,
  rideDistance: 0,
  walkDistance: 0,
  swimDistance: 0,
  boosts: 0,
  heals: 0,
  revives: 0,
  teamKills: 0,
  roadKills: 0,
  vehicleDestroys: 0,
  weaponsAcquired: 0,
  timeSurvived: 0,
  killPoints: 0,
  suicides: 0,
  dBNOs: 0,
  ...over,
});

describe("detectAnomalies", () => {
  it("returns no flags for empty stats", () => {
    expect(detectAnomalies(base({}))).toEqual([]);
  });

  it("flags low-sample (< 30 rounds) as info-level only", () => {
    const out = detectAnomalies(base({ roundsPlayed: 5, kills: 100 }));
    expect(out).toHaveLength(1);
    expect(out[0]!.key).toBe("low_sample");
    expect(out[0]!.severity).toBe("info");
  });

  it("flags KD ≥ 6 with enough rounds", () => {
    const out = detectAnomalies(base({ roundsPlayed: 100, wins: 10, kills: 700 }));
    expect(out.find((a) => a.key === "kd_extreme")?.severity).toBe("high");
  });

  it("flags headshot rate ≥ 70%", () => {
    const out = detectAnomalies(base({ roundsPlayed: 100, kills: 50, headshotKills: 40 }));
    expect(out.find((a) => a.key === "headshot_extreme")?.severity).toBe("high");
  });

  it("flags win rate ≥ 40%", () => {
    const out = detectAnomalies(base({ roundsPlayed: 100, wins: 50 }));
    expect(out.find((a) => a.key === "winrate_extreme")).toBeTruthy();
  });

  it("does not flag normal-skill stats", () => {
    const out = detectAnomalies(
      base({ roundsPlayed: 200, wins: 4, kills: 250, headshotKills: 20, top10s: 50 }),
    );
    expect(out.filter((a) => a.severity === "high")).toEqual([]);
  });
});
