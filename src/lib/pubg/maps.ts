// PUBG map metadata — bounds in game units (centimeters from origin) for
// coordinate normalization in the 2D replay. Sizes per public PUBG asset specs.
// Map asset images are not bundled; the replay falls back to a tactical grid.

export interface MapMeta {
  id: string;
  displayName: string;
  sizeKm: number;
  // PUBG game-coordinate space spans 0..maxCm on each axis.
  maxCm: number;
}

const M = (id: string, displayName: string, sizeKm: number): MapMeta => ({
  id,
  displayName,
  sizeKm,
  maxCm: sizeKm * 100_000,
});

const REGISTRY: Record<string, MapMeta> = {
  Baltic_Main: M("Baltic_Main", "Erangel", 8),
  Erangel_Main: M("Erangel_Main", "Erangel (legacy)", 8),
  Desert_Main: M("Desert_Main", "Miramar", 8),
  Savage_Main: M("Savage_Main", "Sanhok", 4),
  DihorOtok_Main: M("DihorOtok_Main", "Vikendi", 6),
  Heaven_Main: M("Heaven_Main", "Karakin", 2),
  Tiger_Main: M("Tiger_Main", "Taego", 8),
  Kiki_Main: M("Kiki_Main", "Deston", 8),
  Neon_Main: M("Neon_Main", "Rondo", 8),
  Range_Main: M("Range_Main", "Camp Jackal", 2),
  Summerland_Main: M("Summerland_Main", "Karakin", 2),
  Chimera_Main: M("Chimera_Main", "Paramo", 3),
};

export function getMapMeta(mapName: string): MapMeta {
  return REGISTRY[mapName] ?? M(mapName, mapName, 8);
}
