// Lazily reads optional dictionary JSON dumped by scripts/sync-assets.ts into
// public/assets/dictionaries/. Falls back to a static fallback when not present.
//
// All callers should use server-side functions only. We don't ship dictionaries
// to the client bundle.

import { readFile } from "node:fs/promises";
import { join } from "node:path";

const DICT_ROOT = join(process.cwd(), "public", "assets", "dictionaries");

const cache: Record<string, Record<string, string>> = {};

async function loadDict(name: string): Promise<Record<string, string>> {
  if (cache[name]) return cache[name];
  try {
    const path = join(DICT_ROOT, name);
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as Record<string, string>;
    cache[name] = parsed;
    return parsed;
  } catch {
    cache[name] = {};
    return cache[name];
  }
}

export async function getItemNameDict(): Promise<Record<string, string>> {
  return loadDict("telemetry/item/itemId.json");
}

export async function getMapNameDict(): Promise<Record<string, string>> {
  return loadDict("telemetry/mapName.json");
}

export async function getDamageCauserDict(): Promise<Record<string, string>> {
  return loadDict("telemetry/damageCauserName.json");
}
