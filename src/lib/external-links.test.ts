import { describe, expect, it } from "vitest";
import { ownMatchUrl, ownPlayerUrl, ownReplayUrl, pubgReportLinks } from "./external-links";

describe("pubgReportLinks", () => {
  it("builds player + match URLs with proper encoding", () => {
    const r = pubgReportLinks({ shard: "steam", playerName: "shroud", matchId: "abc-123" });
    expect(r.player).toBe("https://pubg.report/players/shroud");
    expect(r.match).toBe("https://pubg.report/matches/abc-123");
  });

  it("encodes special characters in names", () => {
    const r = pubgReportLinks({ playerName: "Player With Space" });
    expect(r.player).toContain("Player%20With%20Space");
  });

  it("returns empty when nothing requested", () => {
    expect(pubgReportLinks({})).toEqual({});
  });
});

describe("own URL builders", () => {
  it("builds locale-aware player URL", () => {
    const u = ownPlayerUrl({
      origin: "https://app.example",
      locale: "ru",
      shard: "steam",
      playerName: "shroud",
    });
    expect(u).toBe("https://app.example/ru/players/steam/shroud");
  });

  it("builds match URL with shard query", () => {
    expect(
      ownMatchUrl({
        origin: "https://app.example",
        locale: "en",
        matchId: "match-1",
        shard: "psn",
      }),
    ).toBe("https://app.example/en/matches/match-1?shard=psn");
  });

  it("builds match URL without shard query when omitted", () => {
    expect(ownMatchUrl({ origin: "https://app.example", locale: "ru", matchId: "m1" })).toBe(
      "https://app.example/ru/matches/m1",
    );
  });

  it("builds replay URL", () => {
    expect(
      ownReplayUrl({ origin: "https://app.example", locale: "ru", matchId: "m1", shard: "steam" }),
    ).toBe("https://app.example/ru/matches/m1/replay?shard=steam");
  });
});
