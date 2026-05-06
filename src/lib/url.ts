import type { Shard } from "@/lib/pubg/shards";

export function playerUrl(locale: string, shard: Shard, name: string): string {
  return `/${locale}/players/${shard}/${encodeURIComponent(name)}`;
}

export function matchUrl(locale: string, matchId: string): string {
  return `/${locale}/matches/${matchId}`;
}

export function leaderboardUrl(locale: string): string {
  return `/${locale}/leaderboards`;
}

export function seasonsUrl(locale: string): string {
  return `/${locale}/seasons`;
}

const MAP_NAMES: Record<string, string> = {
  Baltic_Main: "Erangel",
  Chimera_Main: "Paramo",
  Desert_Main: "Miramar",
  DihorOtok_Main: "Vikendi",
  Erangel_Main: "Erangel",
  Heaven_Main: "Haven",
  Kiki_Main: "Deston",
  Range_Main: "Camp Jackal",
  Savage_Main: "Sanhok",
  Summerland_Main: "Karakin",
  Tiger_Main: "Taego",
  Neon_Main: "Rondo",
};

export function prettyMapName(raw: string): string {
  return MAP_NAMES[raw] ?? raw;
}
