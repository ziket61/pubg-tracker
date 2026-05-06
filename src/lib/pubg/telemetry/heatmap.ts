// Quantize game-coordinate hot points into a sparse grid for SVG rendering.
import type { TelemetryScene } from "./types";

export interface HeatBucket {
  x: number; // canvas-fraction 0..1
  y: number; // canvas-fraction 0..1
  count: number;
}

const GRID = 36;

function bucketize(
  points: Array<{ x: number; y: number }>,
  maxCm: number,
): HeatBucket[] {
  if (!points.length) return [];
  const cells = new Map<string, number>();
  for (const p of points) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    const cx = Math.max(0, Math.min(GRID - 1, Math.floor((p.x / maxCm) * GRID)));
    const cy = Math.max(0, Math.min(GRID - 1, Math.floor((p.y / maxCm) * GRID)));
    const k = `${cx}:${cy}`;
    cells.set(k, (cells.get(k) ?? 0) + 1);
  }
  const max = Math.max(...cells.values());
  return Array.from(cells.entries()).map(([k, count]) => {
    const [cx, cy] = k.split(":").map(Number) as [number, number];
    return {
      x: (cx + 0.5) / GRID,
      y: (cy + 0.5) / GRID,
      count: count / max, // normalize to 0..1
    };
  });
}

export function killHeat(scene: TelemetryScene, maxCm: number): HeatBucket[] {
  return bucketize(
    scene.kills
      .filter((k) => k.victim.location)
      .map((k) => ({ x: k.victim.location!.x, y: k.victim.location!.y })),
    maxCm,
  );
}

export function landingHeat(scene: TelemetryScene, maxCm: number): HeatBucket[] {
  // Prefer the explicit `LogParachuteLanding` event when telemetry has it.
  // Without it, "first position" sits on the plane's flight path, not where
  // players actually touched ground, which is what the user wants to see.
  const points: Array<{ x: number; y: number }> = [];

  if (scene.parachuteLandings && scene.parachuteLandings.length > 0) {
    const seen = new Set<string>();
    for (const land of scene.parachuteLandings) {
      if (seen.has(land.accountId)) continue;
      seen.add(land.accountId);
      points.push({ x: land.location.x, y: land.location.y });
    }
  } else {
    // Fallback: use the LATEST position within the first 60 seconds — by
    // then the parachuting is over and the player is on the ground.
    const SETTLE_TIME = 60;
    const settled = new Map<string, { x: number; y: number; t: number }>();
    for (const p of scene.positions) {
      if (p.time > SETTLE_TIME) continue;
      const cur = settled.get(p.accountId);
      if (!cur || p.time > cur.t) {
        settled.set(p.accountId, { x: p.location.x, y: p.location.y, t: p.time });
      }
    }
    points.push(...Array.from(settled.values()).map((s) => ({ x: s.x, y: s.y })));
  }

  return bucketize(points, maxCm);
}
