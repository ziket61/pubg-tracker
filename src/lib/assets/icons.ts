// Resolves an item id (telemetry name) to an icon URL.
//
// We don't bundle the ~180 MB pubg/api-assets repo. Instead we point at
// raw.githubusercontent.com which serves the public assets via GitHub's CDN.
// Each user fetches the image once; the browser caches it.
//
// Folder layout mirrors the upstream repo:
//   https://github.com/pubg/api-assets/tree/master/Assets/Item/Weapon/Main
//
// If a particular id doesn't exist on the upstream, the <ItemIcon> component
// falls back to its placeholder ("?" tile).

const ASSET_BASE =
  "https://raw.githubusercontent.com/pubg/api-assets/master/Assets";

function url(folder: string, itemId: string): string {
  return `${ASSET_BASE}/${folder}/${itemId}.png`;
}

export function getItemIcon(itemId: string): string | null {
  if (!itemId) return null;
  if (/^Vehicle/i.test(itemId)) return url("Vehicle", itemId);
  if (/Throwable/i.test(itemId)) return url("Item/Weapon/Throwables", itemId);
  if (/Equip|Pack|Helmet|Vest/i.test(itemId)) return url("Item/Equipment", itemId);
  if (/Heal|FirstAid|Bandage|MedKit/i.test(itemId)) return url("Item/Heal", itemId);
  if (/Boost|Energy|Adrenaline|Painkiller/i.test(itemId)) return url("Item/Use", itemId);
  if (/Ammo|Magazine|Cartridge/i.test(itemId)) return url("Item/Ammunition", itemId);
  if (/Attach|Stock|Suppressor|Compensator|Grip|Sight|Scope|FlashHider/i.test(itemId)) {
    return url("Item/Weapon/Attach", itemId);
  }
  if (/Weapon|Weap_|^Item_Weapon/i.test(itemId)) {
    return url("Item/Weapon/Main", itemId);
  }
  // Last resort: try main weapon folder.
  return url("Item/Weapon/Main", itemId);
}

export function getVehicleIcon(vehicleId: string): string | null {
  if (!vehicleId) return null;
  return url("Vehicle", vehicleId);
}
