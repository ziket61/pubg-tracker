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

// Leaderboards use a separate, region-scoped shard space (e.g. `pc-na`,
// `pc-eu`, `xbox-as`). The player/match endpoints use the platform shard
// (`steam`, `psn`, ...). These two namespaces are NOT interchangeable.
// Reference: https://documentation.pubg.com/en/leaderboards-endpoint.html
export const LEADERBOARD_SHARDS = [
  "pc-as",
  "pc-eu",
  "pc-jp",
  "pc-kakao",
  "pc-krjp",
  "pc-na",
  "pc-oc",
  "pc-ru",
  "pc-sa",
  "pc-sea",
  "pc-tour",
  "psn-as",
  "psn-eu",
  "psn-na",
  "psn-oc",
  "xbox-as",
  "xbox-eu",
  "xbox-na",
  "xbox-oc",
  "xbox-sa",
] as const;

export type LeaderboardShard = (typeof LEADERBOARD_SHARDS)[number];

export function isLeaderboardShard(value: string): value is LeaderboardShard {
  return (LEADERBOARD_SHARDS as readonly string[]).includes(value);
}

/**
 * Best-effort mapping from a player shard to a default leaderboard shard.
 * Picks a popular region per platform; the leaderboards page lets the user
 * change it.
 */
export function defaultLeaderboardShard(player: Shard): LeaderboardShard {
  switch (player) {
    case "steam":
    case "stadia":
      return "pc-na";
    case "kakao":
      return "pc-kakao";
    case "psn":
      return "psn-na";
    case "xbox":
      return "xbox-na";
    case "console":
      return "psn-na";
  }
}

/**
 * Reverse: a leaderboard shard maps back to the player platform shard so
 * links from a leaderboard row to the player's profile use the correct route.
 */
export function leaderboardShardToPlayerShard(region: string): Shard {
  if (region.startsWith("pc-kakao")) return "kakao";
  if (region.startsWith("pc-")) return "steam";
  if (region.startsWith("psn-")) return "psn";
  if (region.startsWith("xbox-")) return "xbox";
  return "steam";
}
