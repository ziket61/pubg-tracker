// External link builders — open profiles/matches in third-party trackers.
// Pattern is well-known but the third-party can change at any time. Marked
// `// needs live verification` where the URL shape isn't part of a public contract.
import type { Shard } from "./pubg/shards";

export interface PubgReportLinks {
  player?: string;
  match?: string;
}

export function pubgReportLinks(opts: {
  shard?: Shard;
  playerName?: string;
  matchId?: string;
}): PubgReportLinks {
  // needs live verification: pubg.report URL shape (currently uses player name + match id).
  const out: PubgReportLinks = {};
  if (opts.playerName) {
    out.player = `https://pubg.report/players/${encodeURIComponent(opts.playerName)}`;
  }
  if (opts.matchId) {
    out.match = `https://pubg.report/matches/${encodeURIComponent(opts.matchId)}`;
  }
  return out;
}

export function ownPlayerUrl(opts: {
  origin: string;
  locale: string;
  shard: Shard;
  playerName: string;
}): string {
  return `${opts.origin}/${opts.locale}/players/${opts.shard}/${encodeURIComponent(opts.playerName)}`;
}

export function ownMatchUrl(opts: {
  origin: string;
  locale: string;
  matchId: string;
  shard?: Shard;
}): string {
  const params = opts.shard ? `?shard=${opts.shard}` : "";
  return `${opts.origin}/${opts.locale}/matches/${encodeURIComponent(opts.matchId)}${params}`;
}

export function ownReplayUrl(opts: {
  origin: string;
  locale: string;
  matchId: string;
  shard?: Shard;
}): string {
  const params = opts.shard ? `?shard=${opts.shard}` : "";
  return `${opts.origin}/${opts.locale}/matches/${encodeURIComponent(opts.matchId)}/replay${params}`;
}
