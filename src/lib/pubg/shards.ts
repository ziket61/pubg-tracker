export const PLATFORMS = [
  "steam",
  "psn",
  "xbox",
  "kakao",
  "console",
  "stadia",
] as const;

export type Shard = (typeof PLATFORMS)[number];

export function isShard(value: string): value is Shard {
  return (PLATFORMS as readonly string[]).includes(value);
}

export const GAME_MODES = [
  "solo",
  "duo",
  "squad",
  "solo-fpp",
  "duo-fpp",
  "squad-fpp",
] as const;

export type GameMode = (typeof GAME_MODES)[number];

export function isGameMode(value: string): value is GameMode {
  return (GAME_MODES as readonly string[]).includes(value);
}
