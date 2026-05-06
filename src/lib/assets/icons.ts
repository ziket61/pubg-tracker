// Resolves an item id (telemetry name) to an icon URL.
//
// We don't bundle the ~180 MB pubg/api-assets repo. Instead we point at
// raw.githubusercontent.com which serves the public assets via GitHub's CDN.
// Each user fetches the image once; the browser caches it.
//
// We use the `Icons/` tree (UI-optimized variants) rather than `Item/`
// (full art) because the killfeed wants compact glyphs.
//
//   Assets/Icons/Item/Weapon/Main      — rifles, snipers, DMRs, SMGs, shotguns, LMGs
//   Assets/Icons/Item/Weapon/Handgun   — pistols, flare gun, sawnoff, vz61
//   Assets/Icons/Item/Weapon/Melee     — pan, sickle, machete, crowbar
//   Assets/Icons/Killfeed              — environmental causes (BlueZone, Fall, Drown, etc.)
//   Assets/Vehicle                     — vehicles
//
// Telemetry uses the in-game blueprint names with a `Weap` prefix
// (`WeapAK47_C`); assets use `Item_Weapon_` prefix (`Item_Weapon_AK47_C.png`).
// The naming is mostly mechanical — strip `Weap`, prepend `Item_Weapon_` —
// but a handful drift (e.g. telemetry `WeapDeagle_C` → asset
// `Item_Weapon_DesertEagle_C`). The override table below catches those.

const ASSET_BASE =
  "https://raw.githubusercontent.com/pubg/api-assets/master/Assets";

function url(folder: string, itemId: string): string {
  return `${ASSET_BASE}/${folder}/${itemId}.png`;
}

// Telemetry id → asset id, for the cases where mechanical substitution
// (`Weap*_C` → `Item_Weapon_*_C`) doesn't produce the right filename.
// These were found by cross-referencing pubg/api-assets directory listings.
const ASSET_OVERRIDES: Record<string, string> = {
  WeapDeagle_C: "Item_Weapon_DesertEagle_C",
  WeapMosinNagant_C: "Item_Weapon_Mosin_C",
  WeapMosin_C: "Item_Weapon_Mosin_C",
  WeapSawnOff_C: "Item_Weapon_Sawnoff_C",
  WeapAKM_C: "Item_Weapon_AK47_C",
  WeapM416_C: "Item_Weapon_HK416_C",
  WeapBeryl_C: "Item_Weapon_BerylM762_C",
  WeapTommyGun_C: "Item_Weapon_Thompson_C",
  WeapMicroUZI_C: "Item_Weapon_UZI_C",
  WeapWin94_C: "Item_Weapon_Win1894_C",
  WeapS686_C: "Item_Weapon_Berreta686_C",
  WeapS12K_C: "Item_Weapon_OriginS12_C",
  WeapO12_C: "Item_Weapon_Saiga12_C",
  // Asset-style telemetry that uses a name different from the asset filename
  Item_Weapon_AKM_C: "Item_Weapon_AK47_C",
  Item_Weapon_M416_C: "Item_Weapon_HK416_C",
  Item_Weapon_Beryl_C: "Item_Weapon_BerylM762_C",
  Item_Weapon_SCAR_L_C: "Item_Weapon_SCAR-L_C",
  Item_Weapon_Tommy_C: "Item_Weapon_Thompson_C",
  Item_Weapon_MicroUZI_C: "Item_Weapon_UZI_C",
  Item_Weapon_Win94_C: "Item_Weapon_Win1894_C",
};

// Pistols + a handful of utility "handguns". Kept as an explicit set
// because the Handgun folder lives under a different path than Main.
const HANDGUN_IDS: ReadonlySet<string> = new Set([
  "Item_Weapon_M1911_C",
  "Item_Weapon_M9_C",
  "Item_Weapon_NagantM1895_C",
  "Item_Weapon_Rhino_C",
  "Item_Weapon_DesertEagle_C",
  "Item_Weapon_G18_C",
  "Item_Weapon_FlareGun_C",
  "Item_Weapon_M79_C",
  "Item_Weapon_Sawnoff_C",
  "Item_Weapon_vz61Skorpion_C",
  "Item_Weapon_R45_C",
  "Item_Weapon_Win1894_C",
]);

const MELEE_IDS: ReadonlySet<string> = new Set([
  "Item_Weapon_Pan_C",
  "Item_Weapon_Sickle_C",
  "Item_Weapon_Cowbar_C",
  "Item_Weapon_Machete_C",
]);

// Map telemetry damage causes that aren't weapons to the dedicated
// killfeed icons in `Assets/Icons/Killfeed`. Keeps environmental damage
// (zone, fall, drown, vehicle) out of the broken-image fallback.
const KILLFEED_ICONS: Record<string, string> = {
  BlueZone: "Bluezone",
  RedZone: "Redzone",
  Bluezonegrenade_C: "Bluezone",
  Damage_Explosion_BlackZone_C: "Blackzone",
  Falling: "Fall",
  Drown: "Drown",
  VehicleHit: "Vehicle",
  VehicleDamage: "Vehicle",
  ProjVehicle_C: "Vehicle_Explosion",
  Buff_DecreaseBreathInApnea_C: "Drown",
  Punch: "Punch",
  Melee_Throw: "Melee_Throw",
  Train: "Train",
  Ferry: "Ferry",
};

/**
 * Normalize a raw telemetry / match item id to the asset filename used in
 * pubg/api-assets. We:
 *   1. Apply explicit overrides for naming drift (Deagle, Mosin, etc).
 *   2. If the id is in telemetry-style `Weap*_C`, swap the prefix to
 *      `Item_Weapon_*_C`.
 *   3. Otherwise return as-is.
 */
export function normalizeItemId(itemId: string): string {
  if (ASSET_OVERRIDES[itemId]) return ASSET_OVERRIDES[itemId]!;
  if (itemId.startsWith("Weap") && !itemId.startsWith("Weapon")) {
    return `Item_Weapon_${itemId.slice(4)}`;
  }
  return itemId;
}

/** Returns true if `itemId` represents environmental damage (no weapon icon). */
export function isNonWeapon(itemId: string): boolean {
  return KILLFEED_ICONS[itemId] != null;
}

/**
 * Resolves an icon URL for a damage-causer or item id. Looks up:
 *   1. Killfeed glyphs for environmental causes (zone, falling, drown, …)
 *   2. Vehicle / handgun / melee folders for the specialized weapon paths
 *   3. Main weapon folder for everything else
 *
 * Returns null only for empty input. For unknown ids we still construct
 * a Main-folder URL — the consumer's <img> can use onError to fall back.
 */
export function getItemIcon(itemId: string): string | null {
  if (!itemId) return null;
  // Environmental damage → killfeed glyphs
  const kf = KILLFEED_ICONS[itemId];
  if (kf) return url("Icons/Killfeed", kf);
  const id = normalizeItemId(itemId);
  // Vehicles
  if (/^Vehicle/i.test(id)) return url("Vehicle", id);
  // Pistols & flare gun
  if (HANDGUN_IDS.has(id)) return url("Icons/Item/Weapon/Handgun", id);
  // Melee
  if (MELEE_IDS.has(id)) return url("Icons/Item/Weapon/Melee", id);
  // Equipment / armor / packs
  if (/Equip|Pack|Helmet|Vest/i.test(id)) return url("Icons/Item/Equipment", id);
  // Default: main weapon folder. Catches everything that starts with
  // `Item_Weapon_…` after normalization.
  return url("Icons/Item/Weapon/Main", id);
}

export function getVehicleIcon(vehicleId: string): string | null {
  if (!vehicleId) return null;
  return url("Vehicle", vehicleId);
}
