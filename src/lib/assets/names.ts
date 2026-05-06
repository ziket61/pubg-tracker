// Map raw telemetry/match item ids to short human-readable names.
// Covers the most common weapons; everything else falls back to a cleaned-up id.

const WEAPON_NAMES: Record<string, string> = {
  Item_Weapon_AK47_C: "AK-47",
  Item_Weapon_AKM_C: "AKM",
  WeapAK47_C: "AKM",
  Item_Weapon_M16A4_C: "M16A4",
  WeapM16A4_C: "M16A4",
  Item_Weapon_M416_C: "M416",
  WeapHK416_C: "M416",
  Item_Weapon_SCAR_L_C: "SCAR-L",
  "Item_Weapon_SCAR-L_C": "SCAR-L",
  WeapSCAR_L_C: "SCAR-L",
  Item_Weapon_QBZ_C: "QBZ",
  WeapQBZ95_C: "QBZ95",
  Item_Weapon_AUG_C: "AUG A3",
  WeapAUG_C: "AUG A3",
  Item_Weapon_Mk47Mutant_C: "Mk47 Mutant",
  Item_Weapon_Beryl_C: "Beryl M762",
  WeapBerylM762_C: "Beryl M762",
  Item_Weapon_Groza_C: "Groza",
  WeapGroza_C: "Groza",
  Item_Weapon_G36C_C: "G36C",
  Item_Weapon_K2_C: "K2",
  Item_Weapon_Kar98k_C: "Kar98k",
  WeapKar98k_C: "Kar98k",
  Item_Weapon_M24_C: "M24",
  WeapM24_C: "M24",
  Item_Weapon_AWM_C: "AWM",
  WeapAWM_C: "AWM",
  Item_Weapon_Mosin_C: "Mosin-Nagant",
  Item_Weapon_Lynx_C: "Lynx AMR",
  Item_Weapon_Mini14_C: "Mini-14",
  WeapMini14_C: "Mini-14",
  Item_Weapon_SKS_C: "SKS",
  WeapSKS_C: "SKS",
  Item_Weapon_SLR_C: "SLR",
  Item_Weapon_VSS_C: "VSS",
  Item_Weapon_QBU_C: "QBU88",
  Item_Weapon_Mk14_C: "Mk14 EBR",
  Item_Weapon_Mk12_C: "Mk12",
  Item_Weapon_UMP_C: "UMP45",
  WeapUMP_C: "UMP45",
  Item_Weapon_Vector_C: "Vector",
  WeapVector_C: "Vector",
  Item_Weapon_Tommy_C: "Tommy Gun",
  WeapTommyGun_C: "Tommy Gun",
  Item_Weapon_BizonPP19_C: "PP-19 Bizon",
  Item_Weapon_MicroUZI_C: "Micro UZI",
  WeapUZI_C: "Micro UZI",
  Item_Weapon_MP5K_C: "MP5K",
  Item_Weapon_M249_C: "M249",
  WeapM249_C: "M249",
  Item_Weapon_DP12_C: "DP-12",
  Item_Weapon_S686_C: "S686",
  Item_Weapon_S1897_C: "S1897",
  Item_Weapon_S12K_C: "S12K",
  Item_Weapon_R45_C: "R45",
  Item_Weapon_R1895_C: "R1895",
  Item_Weapon_M1911_C: "P1911",
  Item_Weapon_M9_C: "P92",
  Item_Weapon_NagantM1895_C: "R1895",
  Item_Weapon_Saiga12_C: "O12",
  Item_Weapon_Crossbow_C: "Crossbow",
  Item_Weapon_Win94_C: "Win94",
  Item_Weapon_Mortar_C: "Mortar",
  Item_Weapon_PanzerFaust100M_C: "Panzerfaust",
  Item_Weapon_FlareGun_C: "Flare Gun",
};

const MAP_NAMES: Record<string, string> = {
  Baltic_Main: "Erangel",
  Chimera_Main: "Paramo",
  Desert_Main: "Miramar",
  DihorOtok_Main: "Vikendi",
  Erangel_Main: "Erangel",
  Heaven_Main: "Haven",
  Kiki_Main: "Deston",
  Range_Main: "Camp Jackal",
  Savage_Main: "Sanhok",
  Summerland_Main: "Karakin",
  Tiger_Main: "Taego",
  Neon_Main: "Rondo",
};

export function getItemName(itemId: string): string {
  if (!itemId) return "—";
  if (WEAPON_NAMES[itemId]) return WEAPON_NAMES[itemId]!;
  // Strip common prefixes/suffixes for unknown ids.
  return itemId
    .replace(/^Item_Weapon_/, "")
    .replace(/^Weap/, "")
    .replace(/^Item_/, "")
    .replace(/_C$/, "")
    .replace(/_/g, " ")
    .trim();
}

export function getMapName(rawId: string): string {
  if (!rawId) return "—";
  return MAP_NAMES[rawId] ?? rawId.replace(/_Main$/, "");
}
