import { describe, expect, it } from "vitest";
import { aggregateForm, pickBestMatch, type MatchWithStats } from "./form";
import type { MatchDetails, ParticipantStats } from "./types";

const stats = (over: Partial<ParticipantStats>): ParticipantStats => ({
  kills: 0,
  assists: 0,
  damageDealt: 0,
  headshotKills: 0,
  longestKill: 0,
  timeSurvived: 0,
  walkDistance: 0,
  rideDistance: 0,
  swimDistance: 0,
  weaponsAcquired: 0,
  boosts: 0,
  heals: 0,
  revives: 0,
  DBNOs: 0,
  winPlace: 0,
  killPlace: 0,
  killStreaks: 0,
  vehicleDestroys: 0,
  teamKills: 0,
  roadKills: 0,
  deathType: "byplayer",
  name: "p",
  playerId: "p1",
  ...over,
});

const match = (id: string): MatchDetails => ({
  id,
  createdAt: "2026-05-01T00:00:00Z",
  duration: 1800,
  gameMode: "squad-fpp",
  mapName: "Baltic_Main",
  isCustomMatch: false,
  shardId: "steam",
  rosters: [],
  participants: [],
  telemetryUrl: null,
});

const mws = (id: string, s: Partial<ParticipantStats>): MatchWithStats => ({
  match: match(id),
  stats: stats(s),
});

describe("aggregateForm", () => {
  it("returns zeros for empty input", () => {
    const a = aggregateForm([]);
    expect(a.matchCount).toBe(0);
    expect(a.avgKills).toBe(0);
    expect(a.bestPlacement).toBe(0);
  });

  it("computes averages and counts top10/wins", () => {
    const a = aggregateForm([
      mws("m1", { kills: 5, damageDealt: 600, winPlace: 1, timeSurvived: 1500 }),
      mws("m2", { kills: 3, damageDealt: 400, winPlace: 8, timeSurvived: 900 }),
      mws("m3", { kills: 1, damageDealt: 100, winPlace: 50, timeSurvived: 600 }),
      mws("m4", { kills: 7, damageDealt: 900, winPlace: 3, timeSurvived: 1700 }),
    ]);
    expect(a.matchCount).toBe(4);
    expect(a.avgKills).toBe(4);
    expect(a.avgDamage).toBe(500);
    expect(a.top10Count).toBe(3); // m1(1), m2(8), m4(3)
    expect(a.winCount).toBe(1);
    expect(a.bestPlacement).toBe(1);
  });

  it("ignores winPlace=0 (didn't finish) when picking bestPlacement", () => {
    const a = aggregateForm([
      mws("m1", { winPlace: 0 }),
      mws("m2", { winPlace: 12 }),
    ]);
    expect(a.bestPlacement).toBe(12);
  });
});

describe("pickBestMatch", () => {
  const items = [
    mws("a", { kills: 10, damageDealt: 800, winPlace: 5 }),
    mws("b", { kills: 4, damageDealt: 1200, winPlace: 1 }), // win + high damage
    mws("c", { kills: 8, damageDealt: 600, winPlace: 15 }),
  ];

  it("picks by kills", () => {
    expect(pickBestMatch(items, "kills")?.match.id).toBe("a");
  });

  it("picks by damage", () => {
    expect(pickBestMatch(items, "damage")?.match.id).toBe("b");
  });

  it("picks by placement (lower is better)", () => {
    expect(pickBestMatch(items, "placement")?.match.id).toBe("b");
  });

  it("composite score balances kills, damage, placement", () => {
    expect(pickBestMatch(items, "score")?.match.id).toBeTruthy();
  });

  it("returns null for empty input", () => {
    expect(pickBestMatch([])).toBeNull();
  });
});
