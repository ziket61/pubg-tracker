// Per-player loot timeline. PUBG telemetry includes item pickup/drop/equip/use
// events; we render the most informative ones.
import type { TelemetryScene } from "./types";

export interface LootEntry {
  time: number;
  kind: "pickup" | "equip" | "use" | "drop";
  itemId: string;
  category: "weapon" | "armor" | "heal" | "boost" | "ammo" | "attachment" | "other";
}

export function buildLootTimeline(
  rawEvents: Array<{ _T: string; _D: string; character?: { accountId?: string }; item?: { itemId?: string; category?: string; subCategory?: string } }>,
  scene: TelemetryScene,
  accountId: string,
): LootEntry[] {
  const startMs = scene.matchStartTime || Date.parse(rawEvents[0]?._D ?? new Date().toISOString());
  const out: LootEntry[] = [];

  const KIND_BY_T: Record<string, LootEntry["kind"]> = {
    LogItemPickup: "pickup",
    LogItemPickupFromCarePackage: "pickup",
    LogItemPickupFromLootBox: "pickup",
    LogItemEquip: "equip",
    LogItemUse: "use",
    LogItemDrop: "drop",
  };

  for (const e of rawEvents) {
    const kind = KIND_BY_T[e._T];
    if (!kind) continue;
    if (e.character?.accountId !== accountId) continue;
    if (!e.item?.itemId) continue;
    out.push({
      time: Math.max(0, Math.round((Date.parse(e._D) - startMs) / 1000)),
      kind,
      itemId: e.item.itemId,
      category: classifyCategory(e.item.itemId, e.item.category, e.item.subCategory),
    });
  }
  return out.sort((a, b) => a.time - b.time);
}

function classifyCategory(
  itemId: string,
  category?: string,
  _subCategory?: string,
): LootEntry["category"] {
  if (category === "Weapon") return "weapon";
  if (/Item_Armor|Helmet|Vest/i.test(itemId)) return "armor";
  if (/Heal|Med|FirstAid|Bandage/i.test(itemId)) return "heal";
  if (/Boost|Energy|Adrenaline|Painkiller/i.test(itemId)) return "boost";
  if (/Ammo/i.test(itemId)) return "ammo";
  if (/Attach|Magazine|Scope|Sight|Stock|Suppressor|Compensator/i.test(itemId)) return "attachment";
  return "other";
}
