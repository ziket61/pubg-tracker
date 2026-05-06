// Resolves an item id (telemetry name) to a public asset path.
// Returns null when no matching icon has been synced via scripts/sync-assets.ts.
//
// We don't have a directory listing at runtime, so this just builds a path
// using a few known sub-folders. If the file isn't present, the <ItemIcon>
// component shows a placeholder. Add more folders here as needed.

const FOLDERS = [
  "Item/Weapon/Main",
  "Item/Weapon/Attach",
  "Item/Weapon/Throwables",
  "Item/Equipment",
  "Item/Heal",
  "Item/Use",
  "Item/Ammunition",
  "Vehicle",
];

export function getItemIcon(itemId: string): string | null {
  if (!itemId) return null;
  // Heuristic: try the most likely folder by id prefix.
  if (/^Vehicle/i.test(itemId)) return `/assets/Vehicle/${itemId}.png`;
  if (/Throwable/i.test(itemId)) return `/assets/Item/Weapon/Throwables/${itemId}.png`;
  if (/Equip|Pack|Helmet|Vest/i.test(itemId)) return `/assets/Item/Equipment/${itemId}.png`;
  if (/Heal|FirstAid|Bandage|MedKit/i.test(itemId)) return `/assets/Item/Heal/${itemId}.png`;
  if (/Boost|Energy|Adrenaline|Painkiller/i.test(itemId)) return `/assets/Item/Use/${itemId}.png`;
  if (/Ammo|Magazine|Cartridge/i.test(itemId)) return `/assets/Item/Ammunition/${itemId}.png`;
  if (/Attach|Stock|Suppressor|Compensator|Grip|Sight|Scope|FlashHider/i.test(itemId)) {
    return `/assets/Item/Weapon/Attach/${itemId}.png`;
  }
  if (/Weapon|Weap_|^Item_Weapon/i.test(itemId)) {
    return `/assets/Item/Weapon/Main/${itemId}.png`;
  }
  // Last resort: try main weapon folder.
  return `/assets/Item/Weapon/Main/${itemId}.png`;
}

export function getVehicleIcon(vehicleId: string): string | null {
  if (!vehicleId) return null;
  return `/assets/Vehicle/${vehicleId}.png`;
}

export const ASSET_FOLDERS = FOLDERS;
