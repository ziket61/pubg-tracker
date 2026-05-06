// Tiny localStorage wrapper for "recent" + "favorite" players.
// Client-only — the server never sees this data.

import type { Shard } from "./pubg/shards";

export interface PlayerEntry {
  name: string;
  shard: Shard;
  visitedAt: number; // unix ms
}

const RECENT_KEY = "pubg-tracker:recent-players";
const FAVORITE_KEY = "pubg-tracker:favorite-players";
const MAX_RECENT = 8;
const MAX_FAVORITE = 24;

function isClient(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

function read(key: string): PlayerEntry[] {
  if (!isClient()) return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is PlayerEntry =>
        !!e && typeof e === "object" && typeof (e as PlayerEntry).name === "string",
    );
  } catch {
    return [];
  }
}

function write(key: string, list: PlayerEntry[]) {
  if (!isClient()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(`${key}:change`));
  } catch {
    /* quota exceeded — silently drop */
  }
}

function dedupKey(e: PlayerEntry) {
  return `${e.shard}:${e.name.toLowerCase()}`;
}

export function getRecent(): PlayerEntry[] {
  return read(RECENT_KEY).sort((a, b) => b.visitedAt - a.visitedAt);
}

export function pushRecent(entry: Omit<PlayerEntry, "visitedAt">): void {
  if (!isClient()) return;
  const now = Date.now();
  const seen = read(RECENT_KEY);
  const k = dedupKey({ ...entry, visitedAt: now });
  const filtered = seen.filter((e) => dedupKey(e) !== k);
  filtered.unshift({ ...entry, visitedAt: now });
  write(RECENT_KEY, filtered.slice(0, MAX_RECENT));
}

export function getFavorites(): PlayerEntry[] {
  return read(FAVORITE_KEY).sort((a, b) => b.visitedAt - a.visitedAt);
}

export function isFavorite(entry: Omit<PlayerEntry, "visitedAt">): boolean {
  const k = dedupKey({ ...entry, visitedAt: 0 });
  return read(FAVORITE_KEY).some((e) => dedupKey(e) === k);
}

export function toggleFavorite(entry: Omit<PlayerEntry, "visitedAt">): boolean {
  if (!isClient()) return false;
  const list = read(FAVORITE_KEY);
  const k = dedupKey({ ...entry, visitedAt: 0 });
  const existingIdx = list.findIndex((e) => dedupKey(e) === k);
  if (existingIdx >= 0) {
    list.splice(existingIdx, 1);
    write(FAVORITE_KEY, list);
    return false;
  }
  list.unshift({ ...entry, visitedAt: Date.now() });
  write(FAVORITE_KEY, list.slice(0, MAX_FAVORITE));
  return true;
}

export function subscribe(key: "recent" | "favorite", cb: () => void): () => void {
  if (!isClient()) return () => {};
  const evt = `${key === "recent" ? RECENT_KEY : FAVORITE_KEY}:change`;
  const handler = () => cb();
  window.addEventListener(evt, handler);
  // Also subscribe to cross-tab updates via storage event
  const storageHandler = (e: StorageEvent) => {
    if (e.key === (key === "recent" ? RECENT_KEY : FAVORITE_KEY)) cb();
  };
  window.addEventListener("storage", storageHandler);
  return () => {
    window.removeEventListener(evt, handler);
    window.removeEventListener("storage", storageHandler);
  };
}
