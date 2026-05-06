// Convert PUBG game coordinates (cm from origin) to canvas pixel coordinates.
// PUBG world Y axis grows DOWNWARD when looking top-down — that matches SVG/canvas.
import type { MapMeta } from "../maps";
import type { Vec3 } from "./types";

export interface CanvasSize {
  width: number;
  height: number;
}

export function gameToCanvas(
  pos: Vec3,
  map: MapMeta,
  canvas: CanvasSize,
): { x: number; y: number } {
  const xPct = clamp01(pos.x / map.maxCm);
  const yPct = clamp01(pos.y / map.maxCm);
  return {
    x: xPct * canvas.width,
    y: yPct * canvas.height,
  };
}

export function radiusToCanvas(radiusCm: number, map: MapMeta, canvas: CanvasSize): number {
  return (radiusCm / map.maxCm) * Math.min(canvas.width, canvas.height);
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}
