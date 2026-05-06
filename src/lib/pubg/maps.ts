// PUBG map metadata — bounds in game units (centimeters from origin) for
// coordinate normalization in the 2D replay. Sizes per public PUBG asset specs.
// Map images come from pubg/api-assets via the raw GitHub CDN (Low_Res, ~1 MB).

const MAP_IMAGE_BASE =
  "https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Maps";

export interface MapMeta {
  id: string;
  displayName: string;
  sizeKm: number;
  // PUBG game-coordinate space spans 0..maxCm on each axis.
  maxCm: number;
  /**
   * URL to a low-res PNG of the map (no labels, suitable as a background
   * layer). Null when no upstream image exists for this id.
   */
  imageUrl: string | null;
}

function imageFor(asset: string | null): string | null {
  return asset ? `${MAP_IMAGE_BASE}/${asset}_No_Text_Low_Res.png` : null;
}

const M = (
  id: string,
  displayName: string,
  sizeKm: number,
  asset: string | null,
): MapMeta => ({
  id,
  displayName,
  sizeKm,
  maxCm: sizeKm * 100_000,
  imageUrl: imageFor(asset),
});

// `id` = telemetry/match `mapName` value
// `asset` = filename stem in pubg/api-assets/Assets/Maps (without _No_Text_Low_Res.png)
const REGISTRY: Record<string, MapMeta> = {
  Baltic_Main: M("Baltic_Main", "Erangel", 8, "Erangel_Main"),
  Erangel_Main: M("Erangel_Main", "Erangel", 8, "Erangel_Main"),
  Desert_Main: M("Desert_Main", "Miramar", 8, "Miramar_Main"),
  Savage_Main: M("Savage_Main", "Sanhok", 4, "Sanhok_Main"),
  DihorOtok_Main: M("DihorOtok_Main", "Vikendi", 6, "Vikendi_Main"),
  Heaven_Main: M("Heaven_Main", "Haven", 1, "Haven_Main"),
  Summerland_Main: M("Summerland_Main", "Karakin", 2, "Karakin_Main"),
  Tiger_Main: M("Tiger_Main", "Taego", 8, "Taego_Main"),
  Kiki_Main: M("Kiki_Main", "Deston", 8, "Deston_Main"),
  Neon_Main: M("Neon_Main", "Rondo", 8, "Rondo_Main"),
  Range_Main: M("Range_Main", "Camp Jackal", 2, "Camp_Jackal_Main"),
  Chimera_Main: M("Chimera_Main", "Paramo", 3, "Paramo_Main"),
};

export function getMapMeta(mapName: string): MapMeta {
  return REGISTRY[mapName] ?? M(mapName, mapName, 8, null);
}
