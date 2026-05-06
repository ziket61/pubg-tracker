import type { Season } from "./types";

export function findCurrentSeason(seasons: Season[]): Season | undefined {
  return seasons.find((s) => s.isCurrent);
}

export function sortSeasonsDesc(seasons: Season[]): Season[] {
  return [...seasons].sort((a, b) => b.id.localeCompare(a.id));
}
