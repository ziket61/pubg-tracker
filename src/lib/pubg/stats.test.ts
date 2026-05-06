import { describe, expect, it } from "vitest";
import {
  aggregateLifetime,
  avgDamage,
  headshotRate,
  kd,
  top10Rate,
  winRate,
} from "./stats";
import type { GameModeStats } from "./types";

const baseStats = (over: Partial<GameModeStats>): GameModeStats => ({
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

describe("kd", () => {
  it("returns kills/(rounds-wins) when there are deaths", () => {
    expect(kd({ kills: 20, roundsPlayed: 10, wins: 0 })).toBe(2);
    expect(kd({ kills: 30, roundsPlayed: 10, wins: 5 })).toBe(6);
  });

  it("treats a perfect undefeated player as 1 death (not Infinity)", () => {
    expect(kd({ kills: 7, roundsPlayed: 1, wins: 1 })).toBe(7);
  });

  it("returns 0 when zero kills regardless of rounds", () => {
    expect(kd({ kills: 0, roundsPlayed: 50, wins: 5 })).toBe(0);
  });
});

describe("winRate / top10Rate / avgDamage", () => {
  it("returns 0 when roundsPlayed is 0 (no division by zero)", () => {
    expect(winRate({ wins: 0, roundsPlayed: 0 })).toBe(0);
    expect(top10Rate({ top10s: 0, roundsPlayed: 0 })).toBe(0);
    expect(avgDamage({ damageDealt: 9999, roundsPlayed: 0 })).toBe(0);
  });

  it("computes correct ratios", () => {
    expect(winRate({ wins: 3, roundsPlayed: 12 })).toBe(0.25);
    expect(top10Rate({ top10s: 6, roundsPlayed: 10 })).toBe(0.6);
    expect(avgDamage({ damageDealt: 5000, roundsPlayed: 10 })).toBe(500);
  });
});

describe("headshotRate", () => {
  it("returns 0 when no kills (avoid Infinity/NaN)", () => {
    expect(headshotRate({ headshotKills: 0, kills: 0 })).toBe(0);
  });

  it("computes ratio correctly", () => {
    expect(headshotRate({ headshotKills: 3, kills: 10 })).toBe(0.3);
  });
});

describe("aggregateLifetime", () => {
  it("returns zero-filled stats for empty input", () => {
    const total = aggregateLifetime({});
    expect(total.roundsPlayed).toBe(0);
    expect(total.kills).toBe(0);
    expect(total.longestKill).toBe(0);
  });

  it("sums numeric fields across modes and uses max for longestKill", () => {
    const total = aggregateLifetime({
      solo: baseStats({ roundsPlayed: 10, kills: 20, wins: 1, longestKill: 350 }),
      duo: baseStats({ roundsPlayed: 5, kills: 8, wins: 0, longestKill: 612 }),
      "squad-fpp": baseStats({ roundsPlayed: 3, kills: 4, wins: 1, longestKill: 120 }),
    });

    expect(total.roundsPlayed).toBe(18);
    expect(total.kills).toBe(32);
    expect(total.wins).toBe(2);
    expect(total.longestKill).toBe(612);
  });

  it("ignores undefined modes (mode object that's missing in API response)", () => {
    const total = aggregateLifetime({
      solo: baseStats({ roundsPlayed: 5, kills: 10 }),
      duo: undefined,
    });
    expect(total.roundsPlayed).toBe(5);
    expect(total.kills).toBe(10);
  });
});
