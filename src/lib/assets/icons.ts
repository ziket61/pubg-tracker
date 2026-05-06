// Resolves an item id (telemetry name) to an icon URL.
//
// We don't bundle the ~180 MB pubg/api-assets repo. Instead we point at
// raw.githubusercontent.com which serves the public assets via GitHub's CDN.
// Each user fetches the image once; the browser caches it.
//
// Folder layout mirrors the upstream repo:
//   https://github.com/pubg/api-assets/tree/master/Assets/Item/Weapon/Main
//
// Telemetry uses class names like `WeapAK47_C` while assets are stored as
// `Item_Weapon_AKM_C.png`. We normalize one to the other before constructing
// the URL.

const ASSET_BASE =
  "https://raw.githubusercontent.com/pubg/api-assets/master/Assets";

function url(folder: string, itemId: string): string {
  return `${ASSET_BASE}/${folder}/${itemId}.png`;
}

// Telemetry damageCauserName → asset filename. Telemetry uses the in-game
// blueprint class name; assets use the human-readable id. The two diverged
// long ago — there's no auto-mapping, so we maintain a table by hand for
// the weapons players actually see in killfeeds.
const TELEMETRY_TO_ASSET: Record<string, string> = {
  // Assault rifles
  WeapAK47_C: "Item_Weapon_AKM_C",
  WeapM16A4_C: "Item_Weapon_M16A4_C",
  WeapHK416_C: "Item_Weapon_M416_C",
  WeapSCAR_L_C: "Item_Weapon_SCAR-L_C",
  WeapQBZ95_C: "Item_Weapon_QBZ_C",
  WeapAUG_C: "Item_Weapon_AUG_C",
  WeapBerylM762_C: "Item_Weapon_Beryl_C",
  WeapGroza_C: "Item_Weapon_Groza_C",
  WeapMk47Mutant_C: "Item_Weapon_Mk47Mutant_C",
  WeapG36C_C: "Item_Weapon_G36C_C",
  WeapK2_C: "Item_Weapon_K2_C",
  WeapACE32_C: "Item_Weapon_ACE32_C",
  WeapFAMASG2_C: "Item_Weapon_FAMASG2_C",
  // Sniper / DMR
  WeapKar98k_C: "Item_Weapon_Kar98k_C",
  WeapJuliesKar98k_C: "Item_Weapon_JuliesKar98k_C",
  WeapM24_C: "Item_Weapon_M24_C",
  WeapAWM_C: "Item_Weapon_AWM_C",
  WeapMosinNagant_C: "Item_Weapon_Mosin_C",
  WeapLynx_C: "Item_Weapon_Lynx_C",
  WeapMini14_C: "Item_Weapon_Mini14_C",
  WeapSKS_C: "Item_Weapon_SKS_C",
  WeapSLR_C: "Item_Weapon_SLR_C",
  WeapVSS_C: "Item_Weapon_VSS_C",
  WeapQBU88_C: "Item_Weapon_QBU_C",
  WeapMk14_C: "Item_Weapon_Mk14_C",
  WeapMk12_C: "Item_Weapon_Mk12_C",
  WeapDragunov_C: "Item_Weapon_Dragunov_C",
  // SMG
  WeapUMP_C: "Item_Weapon_UMP_C",
  WeapVector_C: "Item_Weapon_Vector_C",
  WeapTommyGun_C: "Item_Weapon_Tommy_C",
  WeapBizonPP19_C: "Item_Weapon_BizonPP19_C",
  WeapUZI_C: "Item_Weapon_MicroUZI_C",
  WeapMP5K_C: "Item_Weapon_MP5K_C",
  WeapJS9_C: "Item_Weapon_JS9_C",
  WeapP90_C: "Item_Weapon_P90_C",
  // LMG / Shotgun
  WeapM249_C: "Item_Weapon_M249_C",
  WeapMG3_C: "Item_Weapon_MG3_C",
  WeapDP12_C: "Item_Weapon_DP12_C",
  WeapS686_C: "Item_Weapon_S686_C",
  WeapS1897_C: "Item_Weapon_S1897_C",
  WeapS12K_C: "Item_Weapon_S12K_C",
  WeapSaiga12_C: "Item_Weapon_Saiga12_C",
  WeapSawnOff_C: "Item_Weapon_Sawnoff_C",
  WeapO12_C: "Item_Weapon_O12_C",
  // Pistol
  WeapM1911_C: "Item_Weapon_M1911_C",
  WeapM9_C: "Item_Weapon_M9_C",
  WeapNagantM1895_C: "Item_Weapon_NagantM1895_C",
  WeapR45_C: "Item_Weapon_R45_C",
  WeapRhino_C: "Item_Weapon_Rhino_C",
  WeapDeagle_C: "Item_Weapon_DesertEagle_C",
  WeapWin94_C: "Item_Weapon_Win94_C",
  // Misc
  WeapCrossbow_C: "Item_Weapon_Crossbow_C",
  WeapPan_C: "Item_Weapon_Pan_C",
  WeapSickle_C: "Item_Weapon_Sickle_C",
  WeapMachete_C: "Item_Weapon_Cowbar_C",
  WeapMortar_C: "Item_Weapon_Mortar_C",
  WeapPanzerFaust100M_C: "Item_Weapon_PanzerFaust100M_C",
  WeapFlareGun_C: "Item_Weapon_FlareGun_C",
  // Throwables (asset folder differs)
  ProjFrag_C: "Item_Weapon_Grenade_C",
  ProjMolotov_C: "Item_Weapon_Molotov_C",
  ProjStun_C: "Item_Weapon_StickyGrenade_C",
  ProjSmoke_C: "Item_Weapon_SmokeBomb_C",
  ProjC4_C: "Item_Weapon_C4_C",
  ProjBZGrenade_C: "Item_Weapon_BZGrenade_C",
};

// Damage causes that aren't items at all — environmental, vehicle, zone, etc.
// We render these as plain text instead of a broken image.
const NON_WEAPON: ReadonlySet<string> = new Set([
  "BlueZone",
  "RedZone",
  "Bluezonegrenade_C",
  "Falling",
  "Drown",
  "VehicleDamage",
  "VehicleHit",
  "ProjVehicle_C",
  "Buff_DecreaseBreathInApnea_C",
  "None",
  "Damage_Explosion_BlackZone_C",
]);

/**
 * Returns the asset id we should use to look up an icon for `itemId`. If
 * `itemId` is already in asset format we return it unchanged. Used by both
 * `getItemIcon` and consumers that need to match an icon to a non-icon
 * representation (legend, autocomplete, etc).
 */
export function normalizeItemId(itemId: string): string {
  return TELEMETRY_TO_ASSET[itemId] ?? itemId;
}

/** Returns true if `itemId` represents environmental damage (no icon expected). */
export function isNonWeapon(itemId: string): boolean {
  return NON_WEAPON.has(itemId);
}

export function getItemIcon(itemId: string): string | null {
  if (!itemId) return null;
  if (NON_WEAPON.has(itemId)) return null;
  const id = normalizeItemId(itemId);
  // Vehicles
  if (/^Vehicle/i.test(id)) return url("Vehicle", id);
  // Throwables (grenades, molotovs, stuns, smokes, C4, BZ)
  if (/Throwable|Grenade|Molotov|SmokeBomb|StickyGrenade|^Item_Weapon_C4_C$|BZGrenade/i.test(id)) {
    return url("Item/Weapon/Throwables", id);
  }
  // Equipment / armor / packs
  if (/Equip|Pack|Helmet|Vest/i.test(id)) return url("Item/Equipment", id);
  // Heals & boosts
  if (/Heal|FirstAid|Bandage|MedKit/i.test(id)) return url("Item/Heal", id);
  if (/Boost|Energy|Adrenaline|Painkiller/i.test(id)) return url("Item/Use", id);
  // Ammo
  if (/Ammo|Magazine|Cartridge/i.test(id)) return url("Item/Ammunition", id);
  // Attachments
  if (/Attach|Stock|Suppressor|Compensator|Grip|Sight|Scope|FlashHider/i.test(id)) {
    return url("Item/Weapon/Attach", id);
  }
  // Default: main weapon folder. Catches everything that starts with
  // Item_Weapon_… (after normalization, almost all telemetry causers do).
  if (/Weapon|Weap_|^Item_Weapon/i.test(id)) {
    return url("Item/Weapon/Main", id);
  }
  return url("Item/Weapon/Main", id);
}

export function getVehicleIcon(vehicleId: string): string | null {
  if (!vehicleId) return null;
  return url("Vehicle", vehicleId);
}
