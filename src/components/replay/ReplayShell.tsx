"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import type {
  CarePackageEvent,
  DamageEvent,
  KillEvent,
  ParachuteLandingEvent,
  PlayerRef,
  TelemetryScene,
  VehicleEvent,
} from "@/lib/pubg/telemetry/types";
import { snapshotAt, trailFor, zoneAt } from "@/lib/pubg/telemetry/timeline";
import { gameToCanvas, radiusToCanvas } from "@/lib/pubg/telemetry/coordinates";
import {
  killHeat,
  knockHeat,
  damageHeat,
  landingHeat,
  type HeatBucket,
} from "@/lib/pubg/telemetry/heatmap";
import type { MapMeta } from "@/lib/pubg/maps";
import type { Shard } from "@/lib/pubg/shards";
import { getItemName } from "@/lib/assets/names";
import { getItemIcon } from "@/lib/assets/icons";
import { PlayerLink } from "@/components/common/PlayerLink";
import { MapCanvas } from "./MapCanvas";
import Link from "next/link";

const CANVAS_SIZE = 720;
const TRAIL_WINDOW = 60; // seconds
const ZOOM_MIN = 1;
const ZOOM_MAX = 5;
const ZOOM_STEP = 0.25;
const TEAM_COLORS = [
  "#f3a536", // brand
  "#38bdf8", // accent
  "#22c55e", // success
  "#ef4444", // combat
  "#a855f7", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#facc15", // yellow
  "#fb7185", // rose
  "#60a5fa", // blue
];

function teamColor(teamId: number | undefined): string {
  if (teamId == null) return "#a3a7b8";
  return TEAM_COLORS[teamId % TEAM_COLORS.length]!;
}

export interface SerializableScene {
  durationSec: number;
  mapName: string;
  positions: TelemetryScene["positions"];
  kills: TelemetryScene["kills"];
  knocks: TelemetryScene["knocks"];
  zones: TelemetryScene["zones"];
  carePackages: TelemetryScene["carePackages"];
  parachuteLandings?: ParachuteLandingEvent[];
  vehicleSpawns?: VehicleEvent[];
  /**
   * Subset of damage events with attacker + victim locations attached, for
   * the tracer animation. Filtered to damage >= 5 to skip noise.
   */
  damageHits: DamageEvent[];
  // players is a Map — pre-serialize as array of [id, ref] for client transport
  playerEntries: Array<[string, PlayerRef]>;
}

// Marker on the scrubber the user can hover for a richer tooltip.
type ScrubberMarker =
  | { kind: "kill"; frac: number; time: number; data: KillEvent }
  | { kind: "damage"; frac: number; time: number; data: DamageEvent }
  | { kind: "death"; frac: number; time: number; data: KillEvent };

export function ReplayShell({
  scene: serialized,
  map,
  shard,
  defaultFocusId,
  autoPlay = false,
  compact = false,
  clickThroughHref,
}: {
  scene: SerializableScene;
  map: MapMeta;
  /** Player shard for nickname links in the sidebar. */
  shard: Shard;
  defaultFocusId?: string;
  /** Start playing immediately on mount. Defaults to false. */
  autoPlay?: boolean;
  /** Hide the side panel + scrubber + extras. The map auto-loops at 8x. */
  compact?: boolean;
  /** When set, the map area is wrapped in a Link to this href (for "open full replay"). */
  clickThroughHref?: string;
}) {
  const t = useTranslations("replay");
  const tc = useTranslations("common");

  // Reconstruct the full TelemetryScene with the players Map.
  const scene: TelemetryScene = useMemo(
    () => ({
      matchStartTime: 0,
      matchEndTime: serialized.durationSec * 1000,
      durationSec: serialized.durationSec,
      mapName: serialized.mapName,
      positions: serialized.positions,
      kills: serialized.kills,
      knocks: serialized.knocks,
      damages: serialized.damageHits,
      carePackages: serialized.carePackages,
      parachuteLandings: serialized.parachuteLandings ?? [],
      vehicleSpawns: serialized.vehicleSpawns ?? [],
      zones: serialized.zones,
      players: new Map(serialized.playerEntries),
    }),
    [serialized],
  );

  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState(compact ? 8 : 1);
  const [focusId, setFocusId] = useState<string | null>(defaultFocusId ?? null);
  const [showTrails, setShowTrails] = useState(true);
  const [showZone, setShowZone] = useState(true);
  const [showKills, setShowKills] = useState(true);
  const [showDrops, setShowDrops] = useState(true);
  const [showTracers, setShowTracers] = useState(true);
  const [heatMode, setHeatMode] = useState<"off" | "kills" | "damage" | "knocks" | "landings">("off");
  const [hoverId, setHoverId] = useState<string | null>(null);
  // Continuous zoom (1.0 .. 5.0) and pan offset (px, applied as translate).
  // Pan is reset whenever zoom drops back to 1×.
  // When entering with a focus player (e.g. /replay?player=z1qt) start
  // zoomed in 2× so the camera tracks them right away.
  const [zoom, setZoom] = useState(defaultFocusId ? 2 : 1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [fullscreen, setFullscreen] = useState(false);
  // Sidebar sort mode (#6 feedback). Default = team grouping.
  type SortMode = "team" | "alpha" | "alive" | "kills";
  const [sortMode, setSortMode] = useState<SortMode>("team");

  // Track when each player died so the sidebar can grey their row out.
  const deathByAccount = useMemo(() => {
    const m = new Map<string, number>();
    for (const k of scene.kills) {
      if (!m.has(k.victim.accountId)) m.set(k.victim.accountId, k.time);
    }
    return m;
  }, [scene.kills]);

  const isDead = useCallback(
    (accountId: string): boolean => {
      const tDeath = deathByAccount.get(accountId);
      return tDeath != null && tDeath <= time;
    },
    [deathByAccount, time],
  );

  // Pre-compute heatmap buckets — they don't depend on `time`.
  const killHeatBuckets = useMemo<HeatBucket[]>(() => killHeat(scene, map.maxCm), [scene, map]);
  const damageHeatBuckets = useMemo<HeatBucket[]>(() => damageHeat(scene, map.maxCm), [scene, map]);
  const knockHeatBuckets = useMemo<HeatBucket[]>(() => knockHeat(scene, map.maxCm), [scene, map]);
  const landingHeatBuckets = useMemo<HeatBucket[]>(() => landingHeat(scene, map.maxCm), [scene, map]);
  const activeHeat =
    heatMode === "kills"
      ? killHeatBuckets
      : heatMode === "damage"
      ? damageHeatBuckets
      : heatMode === "knocks"
      ? knockHeatBuckets
      : heatMode === "landings"
      ? landingHeatBuckets
      : [];
  const heatColor =
    heatMode === "kills"
      ? "#ef4444"
      : heatMode === "damage"
      ? "#fb923c"
      : heatMode === "knocks"
      ? "#a855f7"
      : heatMode === "landings"
      ? "#38bdf8"
      : "#ef4444";

  // Smooth playback via requestAnimationFrame.
  // In compact mode the playback loops back to 0 instead of stopping.
  const lastTickRef = useRef<number | null>(null);
  useEffect(() => {
    if (!playing) {
      lastTickRef.current = null;
      return;
    }
    let frame = 0;
    const tick = (now: number) => {
      const last = lastTickRef.current ?? now;
      const dtMs = now - last;
      lastTickRef.current = now;
      setTime((cur) => {
        const next = cur + (dtMs / 1000) * speed;
        if (next >= scene.durationSec) {
          if (compact) {
            return 0; // loop
          }
          setPlaying(false);
          return scene.durationSec;
        }
        return next;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, scene.durationSec, compact]);

  // Snapshots
  const snapshots = useMemo(() => snapshotAt(scene, Math.floor(time)), [scene, time]);
  const zone = useMemo(() => (showZone ? zoneAt(scene, Math.floor(time)) : null), [scene, time, showZone]);
  const focusTrail = useMemo(() => {
    if (!showTrails || !focusId) return [];
    return trailFor(scene, focusId, Math.floor(time), TRAIL_WINDOW);
  }, [scene, time, focusId, showTrails]);

  const visibleKills = useMemo(() => {
    if (!showKills) return [];
    return scene.kills.filter((k) => k.time <= time + 0.001);
  }, [scene.kills, time, showKills]);

  // Care packages that have already dropped at the current playback time.
  const visibleDrops = useMemo<CarePackageEvent[]>(() => {
    if (!showDrops) return [];
    return scene.carePackages.filter((c) => c.time <= time + 0.001);
  }, [scene.carePackages, time, showDrops]);

  // Cluster nearby drops so multiple stacks don't crowd a single landing
  // pad. Two drops within ~150 m of each other share an icon, with a small
  // ×N badge to signal "more than one here". Special-flare drops force the
  // cluster icon to the special variant so the marquee item never goes
  // hidden behind a regular crate.
  const dropClusters = useMemo(() => {
    const CLUSTER_RADIUS_CM = 150_00; // 150 m in centimeters
    const CLUSTER_R_SQ = CLUSTER_RADIUS_CM * CLUSTER_RADIUS_CM;
    const out: Array<{
      x: number;
      y: number;
      time: number;
      count: number;
      anySpecial: boolean;
    }> = [];
    for (const d of visibleDrops) {
      let merged = false;
      for (const c of out) {
        const dx = c.x - d.location.x;
        const dy = c.y - d.location.y;
        if (dx * dx + dy * dy < CLUSTER_R_SQ) {
          c.count += 1;
          c.time = Math.max(c.time, d.time);
          c.anySpecial = c.anySpecial || d.kind === "special";
          merged = true;
          break;
        }
      }
      if (!merged) {
        out.push({
          x: d.location.x,
          y: d.location.y,
          time: d.time,
          count: 1,
          anySpecial: d.kind === "special",
        });
      }
    }
    return out;
  }, [visibleDrops]);

  // Vehicle spawns that have appeared by now (BRDMs etc).
  const visibleVehicles = useMemo<VehicleEvent[]>(() => {
    return (scene.vehicleSpawns ?? []).filter((v) => v.time <= time + 0.001);
  }, [scene.vehicleSpawns, time]);

  // Focus player's own events for the scrubber timeline markers — now with
  // full event payload so we can show rich tooltips on hover.
  const focusMarkers = useMemo<ScrubberMarker[]>(() => {
    if (!focusId || !scene.durationSec) return [];
    const dur = scene.durationSec;
    const out: ScrubberMarker[] = [];
    for (const kill of scene.kills) {
      if (kill.killer?.accountId === focusId) {
        out.push({ kind: "kill", frac: kill.time / dur, time: kill.time, data: kill });
      }
      if (kill.victim.accountId === focusId) {
        out.push({ kind: "death", frac: kill.time / dur, time: kill.time, data: kill });
      }
    }
    for (const dmg of scene.damages) {
      if (dmg.victim.accountId === focusId && dmg.damage >= 30) {
        out.push({ kind: "damage", frac: dmg.time / dur, time: dmg.time, data: dmg });
      }
    }
    return out.sort((a, b) => a.time - b.time);
  }, [focusId, scene.kills, scene.damages, scene.durationSec]);

  // Damage tracers — only damages happening within ±1.5 sec of current time.
  // Filtered to events that have BOTH attacker and victim location.
  const TRACER_WINDOW = 1.5;
  const activeTracers = useMemo(() => {
    if (!showTracers || compact) return [];
    return scene.damages.filter(
      (d) =>
        d.attackerLocation &&
        d.victimLocation &&
        Math.abs(d.time - time) <= TRACER_WINDOW,
    );
  }, [scene.damages, time, showTracers, compact]);

  // Killfeed: last 5 kills that have happened at or before the current time.
  // Capped tighter than before (was 6) to keep the on-map overlay slim.
  const killfeed = useMemo(() => {
    return scene.kills.filter((k) => k.time <= time + 0.001).slice(-5).reverse();
  }, [scene.kills, time]);

  // Killfeed history — full list of every kill that's happened up to current time.
  const killfeedFull = useMemo(() => {
    return scene.kills
      .filter((k) => k.time <= time + 0.001)
      .slice()
      .reverse();
  }, [scene.kills, time]);

  // Per-player kill counter — accumulates kills up to the current playback
  // time so the sidebar can show "Name · 3K" (#8). Recomputed only when
  // `time` or kills change.
  const killsByAccount = useMemo(() => {
    const m = new Map<string, number>();
    for (const k of scene.kills) {
      if (k.time > time) break;
      const a = k.killer?.accountId;
      if (!a) continue;
      m.set(a, (m.get(a) ?? 0) + 1);
    }
    return m;
  }, [scene.kills, time]);

  // Group players by team. Untrustworthy team ids (undefined) all go in the
  // "—" bucket. Sorted by team rank if we know it (closer to # 1 = higher).
  // The base shape stays grouped — non-team sorts are applied at render
  // time on a flattened list (see PlayerSidebar).
  const teamGroups = useMemo(() => {
    const groups = new Map<number, Array<{ id: string; p: PlayerRef }>>();
    for (const [id, p] of scene.players.entries()) {
      const tid = p.teamId ?? -1;
      const arr = groups.get(tid) ?? [];
      arr.push({ id, p });
      groups.set(tid, arr);
    }
    for (const arr of groups.values()) {
      arr.sort((a, b) => (a.p.name ?? "").localeCompare(b.p.name ?? ""));
    }
    return Array.from(groups.entries())
      .map(([teamId, members]) => ({ teamId, members }))
      .sort((a, b) => a.teamId - b.teamId);
  }, [scene.players]);

  // Pan offset so that when zoomed in, the focus player stays centered.
  const focusPos = focusId ? snapshots.find((s) => s.accountId === focusId) : null;
  const focusCanvas = focusPos
    ? gameToCanvas({ x: focusPos.x, y: focusPos.y, z: 0 }, map, {
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
      })
    : null;

  // Reset pan when zoom drops back to 1× (no panning at base zoom).
  useEffect(() => {
    if (zoom <= 1) {
      setPan({ x: 0, y: 0 });
    }
  }, [zoom]);

  // Pan-drag while zoomed. We use Pointer Events with setPointerCapture
  // instead of window-level mouse listeners — the previous round-2 setup
  // had a bug where the drag got "stuck" if mouseup fired while the cursor
  // was outside the browser viewport. Pointer capture guarantees we hear
  // pointerup / pointercancel even when the cursor leaves the element.
  const mapWrapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<
    { startX: number; startY: number; panX: number; panY: number; pointerId: number } | null
  >(null);
  const [isDragging, setIsDragging] = useState(false);

  // Track the on-screen size of the map container so we can clamp the pan
  // offset — without clamping, dragging at 2× could push the map clean off
  // the canvas and reveal the page background.
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = mapWrapRef.current;
    if (!el) return;
    const update = () => setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const clampPan = useCallback(
    (px: number, py: number) => {
      const maxX = Math.max(0, (containerSize.w * (zoom - 1)) / 2);
      const maxY = Math.max(0, (containerSize.h * (zoom - 1)) / 2);
      return {
        x: Math.max(-maxX, Math.min(maxX, px)),
        y: Math.max(-maxY, Math.min(maxY, py)),
      };
    },
    [containerSize, zoom],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (zoom <= 1 || e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        panX: pan.x,
        panY: pan.y,
        pointerId: e.pointerId,
      };
      setIsDragging(true);
    },
    [zoom, pan],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (!d || d.pointerId !== e.pointerId) return;
      setPan(clampPan(d.panX + (e.clientX - d.startX), d.panY + (e.clientY - d.startY)));
    },
    [clampPan],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  // When zoom shrinks (e.g. user clicks "1.0×" reset), re-clamp the existing
  // pan so we don't end up with a stale offset that's now out of bounds.
  useEffect(() => {
    setPan((p) => clampPan(p.x, p.y));
  }, [zoom, clampPan]);

  // Scroll-wheel zoom on the map area (pubg.sh-style).
  const onWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) return; // leave browser zoom alone
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(z + delta).toFixed(2))));
  }, []);
  useEffect(() => {
    const el = mapWrapRef.current;
    if (!el || compact) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel, compact]);

  const mapInner = (
    <MapCanvas map={map} size={CANVAS_SIZE}>
          {/* Heatmap layer (rendered first so it sits behind everything else) */}
          {activeHeat.map((b, i) => (
            <circle
              key={`heat-${i}`}
              cx={b.x * CANVAS_SIZE}
              cy={b.y * CANVAS_SIZE}
              r={CANVAS_SIZE / 36}
              fill={heatColor}
              opacity={Math.max(0.08, b.count * 0.5)}
            />
          ))}
          {/* Per user feedback round-3: white = play zone (current safe
              area), blue = next-zone target. We had them swapped. The
              `poisonGasWarningPosition` is actually the WHITE circle players
              see in-game (the next zone target), and `safetyZonePosition`
              is the current play-area boundary that the blue wall enforces. */}
          {zone?.poisonGasWarningPosition && zone.poisonGasWarningRadius && (
            <ZoneCircle
              cx={gameToCanvas(zone.poisonGasWarningPosition, map, { width: CANVAS_SIZE, height: CANVAS_SIZE }).x}
              cy={gameToCanvas(zone.poisonGasWarningPosition, map, { width: CANVAS_SIZE, height: CANVAS_SIZE }).y}
              r={radiusToCanvas(zone.poisonGasWarningRadius, map, { width: CANVAS_SIZE, height: CANVAS_SIZE })}
              tone="play"
            />
          )}
          {zone?.safetyZonePosition && zone.safetyZoneRadius && (
            <ZoneCircle
              cx={gameToCanvas(zone.safetyZonePosition, map, { width: CANVAS_SIZE, height: CANVAS_SIZE }).x}
              cy={gameToCanvas(zone.safetyZonePosition, map, { width: CANVAS_SIZE, height: CANVAS_SIZE }).y}
              r={radiusToCanvas(zone.safetyZoneRadius, map, { width: CANVAS_SIZE, height: CANVAS_SIZE })}
              tone="blue"
            />
          )}
          {/* Red zone (bombardment area) — dashed red ring, only visible
              while active. Now extracted from telemetry. */}
          {zone?.redZonePosition && zone.redZoneRadius && (
            <ZoneCircle
              cx={gameToCanvas(zone.redZonePosition, map, { width: CANVAS_SIZE, height: CANVAS_SIZE }).x}
              cy={gameToCanvas(zone.redZonePosition, map, { width: CANVAS_SIZE, height: CANVAS_SIZE }).y}
              r={radiusToCanvas(zone.redZoneRadius, map, { width: CANVAS_SIZE, height: CANVAS_SIZE })}
              tone="red"
            />
          )}

          {focusTrail.length > 1 &&
            focusTrail.slice(1).map((p, i) => {
              const prev = focusTrail[i]!;
              const a = gameToCanvas({ x: prev.x, y: prev.y, z: 0 }, map, { width: CANVAS_SIZE, height: CANVAS_SIZE });
              const b = gameToCanvas({ x: p.x, y: p.y, z: 0 }, map, { width: CANVAS_SIZE, height: CANVAS_SIZE });
              const opacity = ((i + 1) / focusTrail.length) * 0.9;
              return (
                <line
                  key={p.t}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#f3a536"
                  strokeWidth="2"
                  opacity={opacity}
                  strokeLinecap="round"
                />
              );
            })}

          {/* BRDM markers — flare-called armored vehicles. Rendered as a
              small blocky vehicle silhouette with a subtle blue tint so it
              reads differently from drops/kills. */}
          {visibleVehicles.map((v) => {
            const p = gameToCanvas(v.location, map, { width: CANVAS_SIZE, height: CANVAS_SIZE });
            return (
              <g key={`veh-${v.vehicleId}`} transform={`translate(${p.x} ${p.y})`}>
                <circle r="9" fill="rgba(8,9,12,0.7)" stroke="#38bdf8" strokeWidth="1.4" />
                <text
                  fontFamily="var(--font-mono)"
                  fontSize="6"
                  fill="#38bdf8"
                  textAnchor="middle"
                  y="2"
                  style={{ paintOrder: "stroke", stroke: "rgba(8,9,12,0.9)", strokeWidth: 2 } as React.CSSProperties}
                >
                  BRDM
                </text>
              </g>
            );
          })}

          {/* Drops — clustered so multiple drops near each other show as a
              single icon with a "×N" badge. Special (flare-called) drops
              promote the cluster to the larger crate variant. */}
          {dropClusters.map((c, idx) => {
            const p = gameToCanvas({ x: c.x, y: c.y, z: 0 }, map, { width: CANVAS_SIZE, height: CANVAS_SIZE });
            const fresh = time - c.time < 6;
            const special = c.anySpecial;
            return (
              <g key={`drop-${idx}`} transform={`translate(${p.x} ${p.y})`}>
                {fresh && (
                  <circle
                    r="11"
                    fill="none"
                    stroke={special ? "#ef4444" : "#fbbf24"}
                    strokeWidth="1.6"
                    opacity="0.85"
                  >
                    <animate attributeName="r" from="6" to={special ? "30" : "22"} dur="1.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.85" to="0" dur="1.4s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* parachute canopy */}
                <path
                  d={
                    special
                      ? `M -10 -4 A 10 7 0 0 1 10 -4 L 7 -2 A 7 5 0 0 0 -7 -2 Z`
                      : `M -7 -3 A 7 5 0 0 1 7 -3 L 5 -1 A 5 3.5 0 0 0 -5 -1 Z`
                  }
                  fill={special ? "#ef4444" : "#fbbf24"}
                  stroke="rgba(8,9,12,0.9)"
                  strokeWidth="0.8"
                />
                {/* lines */}
                <line
                  x1={special ? -7 : -5}
                  y1={special ? -2 : -1}
                  x2={special ? -2 : -1.5}
                  y2={special ? 3 : 2}
                  stroke="rgba(8,9,12,0.9)"
                  strokeWidth="0.8"
                />
                <line
                  x1={special ? 7 : 5}
                  y1={special ? -2 : -1}
                  x2={special ? 2 : 1.5}
                  y2={special ? 3 : 2}
                  stroke="rgba(8,9,12,0.9)"
                  strokeWidth="0.8"
                />
                {/* crate */}
                <rect
                  x={special ? -4 : -2.5}
                  y={special ? 3 : 2}
                  width={special ? 8 : 5}
                  height={special ? 6 : 4}
                  fill="#92611f"
                  stroke={special ? "#fbbf24" : "rgba(8,9,12,0.9)"}
                  strokeWidth={special ? 1 : 0.8}
                />
                {special && (
                  <text
                    fontFamily="var(--font-mono)"
                    fontSize="4"
                    fill="#fbbf24"
                    textAnchor="middle"
                    y="7.5"
                    style={{ paintOrder: "stroke", stroke: "rgba(8,9,12,0.95)", strokeWidth: 1.2 } as React.CSSProperties}
                  >
                    !
                  </text>
                )}
                {c.count > 1 && (
                  // ×N badge to the upper-right of the crate
                  <g transform="translate(8 -7)">
                    <circle r="4.5" fill="rgba(8,9,12,0.95)" stroke="#fbbf24" strokeWidth="0.8" />
                    <text
                      fontFamily="var(--font-mono)"
                      fontSize="5"
                      fill="#fbbf24"
                      textAnchor="middle"
                      y="1.7"
                    >
                      ×{c.count}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Damage tracers — line from attacker to victim, fading by time delta */}
          {activeTracers.map((d: DamageEvent, i) => {
            if (!d.attackerLocation || !d.victimLocation) return null;
            const a = gameToCanvas(d.attackerLocation, map, { width: CANVAS_SIZE, height: CANVAS_SIZE });
            const b = gameToCanvas(d.victimLocation, map, { width: CANVAS_SIZE, height: CANVAS_SIZE });
            const age = Math.abs(time - d.time);
            const opacity = Math.max(0.05, 1 - age / TRACER_WINDOW);
            const intensity = Math.min(1, d.damage / 50);
            return (
              <g key={`tracer-${i}`}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#fb923c"
                  strokeWidth={1 + intensity * 1.5}
                  opacity={opacity}
                  strokeLinecap="round"
                />
                <circle
                  cx={b.x}
                  cy={b.y}
                  r={2 + intensity * 2}
                  fill="#ef4444"
                  opacity={opacity}
                />
              </g>
            );
          })}

          {visibleKills.map((k, idx) => {
            if (!k.victim.location) return null;
            const p = gameToCanvas(k.victim.location, map, { width: CANVAS_SIZE, height: CANVAS_SIZE });
            const recent = time - k.time < 8;
            return (
              <g key={`kill-${idx}`} opacity={recent ? 1 : 0.45}>
                <line x1={p.x - 4} y1={p.y - 4} x2={p.x + 4} y2={p.y + 4} stroke="#ef4444" strokeWidth="2" />
                <line x1={p.x + 4} y1={p.y - 4} x2={p.x - 4} y2={p.y + 4} stroke="#ef4444" strokeWidth="2" />
                {recent && <circle cx={p.x} cy={p.y} r="10" fill="none" stroke="#ef4444" strokeWidth="1" opacity="0.7" />}
              </g>
            );
          })}

          {snapshots.map((s) => {
            const c = gameToCanvas({ x: s.x, y: s.y, z: 0 }, map, { width: CANVAS_SIZE, height: CANVAS_SIZE });
            const isFocus = s.accountId === focusId;
            const isHover = s.accountId === hoverId;
            const color = teamColor(s.teamId);
            const dead = s.health <= 0;
            const alpha = s.isStale ? 0.35 : 1;
            return (
              <g key={s.accountId} opacity={alpha}>
                {/* Drop shadow under live dot — adds 3D depth on flat 2D map */}
                {!dead && (
                  <ellipse
                    cx={c.x}
                    cy={c.y + 2.5}
                    rx={isFocus ? 5 : 3.5}
                    ry={2}
                    fill="rgba(8,9,12,0.7)"
                  />
                )}
                {(isFocus || isHover) && (
                  <circle cx={c.x} cy={c.y} r="9" fill="none" stroke={color} strokeWidth="1" opacity="0.5" />
                )}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isFocus || isHover ? 5 : 3.5}
                  fill={dead ? "#3a3f55" : color}
                  stroke="rgba(8,9,12,0.95)"
                  strokeWidth="1.25"
                  onMouseEnter={() => !compact && setHoverId(s.accountId)}
                  onMouseLeave={() => !compact && setHoverId(null)}
                  style={{ cursor: compact ? "inherit" : "pointer" }}
                />
                {(isFocus || isHover) && (
                  <text
                    x={c.x + 8}
                    y={c.y + 3}
                    fontFamily="var(--font-mono)"
                    fontSize="9"
                    fill={color}
                    style={{ paintOrder: "stroke", stroke: "rgba(8,9,12,0.95)", strokeWidth: 3 } as React.CSSProperties}
                  >
                    {s.name}
                    {isHover && !isFocus ? ` · ${s.health.toFixed(0)}HP` : ""}
                  </text>
                )}
              </g>
            );
          })}
        </MapCanvas>
  );

  // Compact mode: just an auto-looping map, optional click-through to /replay.
  if (compact) {
    const mapBlock = (
      <div className="relative">
        {mapInner}
        {clickThroughHref && (
          <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-md border border-brand-dim/60 bg-brand/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-brand backdrop-blur-sm">
            {t("openReplay")} ↗
          </span>
        )}
      </div>
    );
    return clickThroughHref ? (
      <Link href={clickThroughHref} className="block transition-transform hover:scale-[1.005]" aria-label={t("openReplay")}>
        {mapBlock}
      </Link>
    ) : (
      mapBlock
    );
  }

  // Zoom origin: focus player when zoomed (and no manual pan); else center.
  // When the user has manually dragged, we keep the origin centered and rely
  // on the translate offset to position the view.
  const userPanned = pan.x !== 0 || pan.y !== 0;
  const zoomOriginX =
    !userPanned && focusCanvas && zoom > 1
      ? `${(focusCanvas.x / CANVAS_SIZE) * 100}%`
      : "50%";
  const zoomOriginY =
    !userPanned && focusCanvas && zoom > 1
      ? `${(focusCanvas.y / CANVAS_SIZE) * 100}%`
      : "50%";

  // Map block + side overlays (fullscreen toggle + killfeed).
  const mapWithOverlays = (
    <div ref={mapWrapRef} className="relative h-full w-full">
      {/* Zoom container — outer box stays fixed-size, inner is scaled +
          translated for pan. Pointer events with setPointerCapture keep
          the drag glued to the cursor even when it leaves the map area. */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{
          cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
          touchAction: zoom > 1 ? "none" : "auto",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="transition-transform duration-150 ease-out"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: `${zoomOriginX} ${zoomOriginY}`,
            // Disable transition during active drag so the map tracks the cursor 1:1.
            transitionDuration: isDragging ? "0ms" : undefined,
          }}
        >
          {mapInner}
        </div>
      </div>

      {/* Compact killfeed — slimmer than before, sized to ~210px width with
          weapon icons instead of text labels (per #11/#12 feedback). */}
      {killfeed.length > 0 && (
        <div className="pointer-events-none absolute right-3 top-12 w-[210px] space-y-0.5">
          {killfeed.map((k, i) => {
            const age = time - k.time;
            const fresh = age < 5;
            const opacity = age < 30 ? Math.max(0.5, 1 - age / 30) : 0.4;
            return (
              <div
                key={`kf-${i}-${k.time}`}
                className={`flex items-center gap-1 rounded border border-border/70 bg-bg/85 px-1.5 py-0.5 font-mono text-[10px] backdrop-blur-sm ${
                  fresh ? "border-combat/60" : ""
                }`}
                style={{ opacity }}
              >
                <span className="truncate text-fg-muted">{k.killer?.name ?? "—"}</span>
                <WeaponBadge id={k.damageCauserName} />
                {k.isHeadshot && (
                  <span className="rounded bg-combat/20 px-1 text-[8px] font-bold uppercase text-combat">
                    HS
                  </span>
                )}
                <span className="truncate text-fg">{k.victim.name}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating fullscreen toggle (top-left) — single small button only. */}
      <div className="absolute left-3 top-12">
        <button
          type="button"
          onClick={() => setFullscreen((f) => !f)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border-strong bg-bg/80 text-fg-muted backdrop-blur-sm transition-colors hover:text-fg"
          aria-label={fullscreen ? t("exitFullscreen") : t("enterFullscreen")}
          title={fullscreen ? t("exitFullscreen") : t("enterFullscreen")}
        >
          {fullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
        </button>
      </div>
    </div>
  );

  // Fullscreen layout: the map gets a square box sized to fit BOTH the
  // viewport width and the remaining height (after controls / legend).
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col gap-3 overflow-y-auto bg-bg p-3 md:p-5">
        <div className="flex flex-1 items-center justify-center">
          <div
            className="aspect-square w-full"
            style={{
              maxWidth: "min(100vw - 24px, 100vh - 240px)",
              maxHeight: "min(100vw - 24px, 100vh - 240px)",
            }}
          >
            {mapWithOverlays}
          </div>
        </div>
        <ControlsBar
          playing={playing}
          onTogglePlay={() => setPlaying((p) => !p)}
          onRestart={() => {
            setTime(0);
            setPlaying(false);
          }}
          speed={speed}
          onSpeed={setSpeed}
          time={time}
          duration={scene.durationSec}
          onTimeChange={setTime}
          showTrails={showTrails}
          showZone={showZone}
          showKills={showKills}
          showDrops={showDrops}
          showTracers={showTracers}
          onTrails={setShowTrails}
          onZone={setShowZone}
          onKills={setShowKills}
          onDrops={setShowDrops}
          onTracers={setShowTracers}
          heatMode={heatMode}
          onHeatMode={setHeatMode}
          markers={focusMarkers}
          zoom={zoom}
          onZoom={(z) => setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +z.toFixed(2))))}
          t={t}
        />
        <Legend t={t} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="aspect-square w-full">
          {mapWithOverlays}
        </div>
        <ControlsBar
          playing={playing}
          onTogglePlay={() => setPlaying((p) => !p)}
          onRestart={() => {
            setTime(0);
            setPlaying(false);
          }}
          speed={speed}
          onSpeed={setSpeed}
          time={time}
          duration={scene.durationSec}
          onTimeChange={setTime}
          showTrails={showTrails}
          showZone={showZone}
          showKills={showKills}
          showDrops={showDrops}
          showTracers={showTracers}
          onTrails={setShowTrails}
          onZone={setShowZone}
          onKills={setShowKills}
          onDrops={setShowDrops}
          onTracers={setShowTracers}
          heatMode={heatMode}
          onHeatMode={setHeatMode}
          markers={focusMarkers}
          zoom={zoom}
          onZoom={(z) => setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +z.toFixed(2))))}
          t={t}
        />
        <Legend t={t} />
      </div>

      <aside className="space-y-3">
        <PlayerSidebar
          teamGroups={teamGroups}
          focusId={focusId}
          onFocus={setFocusId}
          isDead={isDead}
          killsByAccount={killsByAccount}
          shard={shard}
          totalCount={scene.players.size}
          sortMode={sortMode}
          onSortMode={setSortMode}
          t={t}
          tc={tc}
        />

        {killfeedFull.length > 0 && (
          <KillfeedHistory
            entries={killfeedFull}
            shard={shard}
            t={t}
          />
        )}
      </aside>
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────

function ControlsBar({
  playing,
  onTogglePlay,
  onRestart,
  speed,
  onSpeed,
  time,
  duration,
  onTimeChange,
  showTrails,
  showZone,
  showKills,
  showDrops,
  showTracers,
  onTrails,
  onZone,
  onKills,
  onDrops,
  onTracers,
  heatMode,
  onHeatMode,
  markers,
  zoom,
  onZoom,
  t,
}: {
  playing: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  speed: number;
  onSpeed: (s: number) => void;
  time: number;
  duration: number;
  onTimeChange: (s: number) => void;
  showTrails: boolean;
  showZone: boolean;
  showKills: boolean;
  showDrops: boolean;
  showTracers: boolean;
  onTrails: (v: boolean) => void;
  onZone: (v: boolean) => void;
  onKills: (v: boolean) => void;
  onDrops: (v: boolean) => void;
  onTracers: (v: boolean) => void;
  heatMode: "off" | "kills" | "damage" | "knocks" | "landings";
  onHeatMode: (m: "off" | "kills" | "damage" | "knocks" | "landings") => void;
  markers: ScrubberMarker[];
  zoom: number;
  onZoom: (z: number) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  // Speed presets — extended per user feedback to go up to 15×, with
  // visible tick marks at the round 5× and 10× stops. The slider also
  // got wider (3× the old length) so it's easier to scrub through.
  const SPEEDS = [1, 2, 5, 10, 15];
  const speedIndex = Math.max(0, SPEEDS.indexOf(speed));

  return (
    <div className="mt-3 rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onTogglePlay}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-brand-dim/60 bg-brand text-bg transition-colors hover:bg-brand-hover"
          aria-label={playing ? t("pause") : t("play")}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-hover text-fg-muted transition-colors hover:text-fg"
          aria-label={t("restart")}
        >
          <RestartIcon />
        </button>

        {/* Speed slider — 1× / 2× / 5× / 10× / 15× snap stops. Slider is
            ~3× wider than v2, with tick marks under 5× and 10× so the user
            can eyeball common speeds without thinking. */}
        <label className="flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-wider text-fg-subtle">
            {t("speedLabel")}
          </span>
          <span className="relative flex flex-col items-center">
            <input
              type="range"
              min={0}
              max={SPEEDS.length - 1}
              step={1}
              value={speedIndex}
              onChange={(e) => onSpeed(SPEEDS[Number(e.target.value)] ?? 1)}
              className="h-1.5 w-72 cursor-pointer accent-brand"
              aria-label={t("speedLabel")}
              list="replay-speed-ticks"
            />
            {/* HTML5 datalist tick marks under the slider */}
            <datalist id="replay-speed-ticks">
              {SPEEDS.map((_, i) => <option key={i} value={i} />)}
            </datalist>
            {/* Manual tick labels — positioned to mirror the snap indices.
                We highlight 5× and 10× per the user's request. */}
            <div className="pointer-events-none mt-0.5 flex w-72 justify-between font-mono text-[8px] tabular-nums text-fg-subtle">
              {SPEEDS.map((s) => (
                <span
                  key={s}
                  className={s === 5 || s === 10 ? "font-semibold text-fg-muted" : ""}
                >
                  {s}×
                </span>
              ))}
            </div>
          </span>
          <span className="w-9 text-right font-mono text-[11px] tabular-nums text-fg-muted">
            {speed}×
          </span>
        </label>

        {/* Zoom slider — moved out of the map (#5). Lives in the controls bar
            next to the speed slider so it doesn't eat visible map area. */}
        <label className="flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-wider text-fg-subtle">
            {t("zoomLabel")}
          </span>
          <input
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={ZOOM_STEP}
            value={zoom}
            onChange={(e) => onZoom(Number(e.target.value))}
            className="h-1.5 w-24 cursor-pointer accent-brand"
            aria-label={t("zoomLabel")}
          />
          <button
            type="button"
            onClick={() => onZoom(1)}
            className="w-9 text-left font-mono text-[11px] tabular-nums text-fg-muted transition-colors hover:text-fg"
            title={t("zoomReset")}
          >
            {zoom.toFixed(1)}×
          </button>
        </label>

        <span className="ml-auto font-mono text-xs tabular-nums text-fg-muted">
          {fmtTime(time)} / {fmtTime(duration)}
        </span>
      </div>

      <Scrubber
        time={time}
        duration={duration}
        onTimeChange={onTimeChange}
        markers={markers}
        t={t}
      />

      <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
        <Toggle checked={showTrails} onChange={onTrails} label={t("trails")} />
        <Toggle checked={showZone} onChange={onZone} label={t("zone")} />
        <Toggle checked={showKills} onChange={onKills} label={t("kills")} />
        <Toggle checked={showDrops} onChange={onDrops} label={t("drops")} />
        <Toggle checked={showTracers} onChange={onTracers} label={t("tracers")} />
        <span className="ml-auto inline-flex items-center gap-1 rounded border border-border bg-bg-muted p-0.5">
          {(["off", "kills", "damage", "knocks", "landings"] as const).map((m) => {
            const activeColor =
              m === "kills"
                ? "bg-combat/20 text-combat"
                : m === "damage"
                ? "bg-[#fb923c]/20 text-[#fb923c]"
                : m === "knocks"
                ? "bg-[#a855f7]/20 text-[#a855f7]"
                : m === "landings"
                ? "bg-accent/20 text-accent"
                : "bg-bg text-fg";
            return (
              <button
                key={m}
                type="button"
                onClick={() => onHeatMode(m)}
                className={`rounded px-2 py-0.5 transition-colors ${
                  heatMode === m ? activeColor : "text-fg-subtle hover:text-fg"
                }`}
              >
                {t(`heat_${m}`)}
              </button>
            );
          })}
        </span>
      </div>
    </div>
  );
}

/**
 * Custom scrubber with rich hover tooltips on event markers. Native HTML
 * `title=` only shows plain text — we want event details (time, player,
 * weapon) so we render a popover inside the marker on hover.
 */
function Scrubber({
  time,
  duration,
  onTimeChange,
  markers,
  t,
}: {
  time: number;
  duration: number;
  onTimeChange: (s: number) => void;
  markers: ScrubberMarker[];
  t: ReturnType<typeof useTranslations>;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="relative mt-3 pt-3">
      <input
        type="range"
        min={0}
        max={duration}
        step="1"
        value={Math.floor(time)}
        onChange={(e) => onTimeChange(Number(e.target.value))}
        className="relative z-10 w-full accent-brand"
      />
      {markers.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-2 z-0 h-5">
          {markers.map((m, i) => {
            const isHover = hovered === i;
            const left = `${m.frac * 100}%`;
            // Visible glyph (the dot/bar the user actually sees).
            const visualCls =
              m.kind === "kill"
                ? "h-3 w-2 rounded-sm bg-success ring-1 ring-bg/80"
                : m.kind === "death"
                ? "h-4 w-1 rounded-sm bg-combat ring-1 ring-bg/80"
                : "h-2.5 w-2.5 rounded-full bg-combat/80 ring-1 ring-bg/80";
            return (
              <span
                key={`mk-${i}-${m.time}`}
                // Hit area is 14×16 px with the visual centered inside.
                // Much easier to land the cursor on than the old 1.5×8 px
                // strip. Padding is invisible (the gradient stops at the
                // visual element).
                className="pointer-events-auto absolute flex h-4 w-4 -translate-x-1/2 cursor-pointer items-center justify-center"
                style={{ left, top: 0 }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered((cur) => (cur === i ? null : cur))}
              >
                <span className={visualCls} aria-hidden />
                {isHover && <MarkerTooltip marker={m} t={t} />}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MarkerTooltip({
  marker,
  t,
}: {
  marker: ScrubberMarker;
  t: ReturnType<typeof useTranslations>;
}) {
  const time = fmtTime(marker.time);
  let label: string;
  let detail: string;
  let weaponId: string | null = null;
  if (marker.kind === "kill") {
    label = t("eventKill");
    detail = t("eventKillTip", {
      time,
      killer: marker.data.killer?.name ?? t("tipNoKiller"),
      victim: marker.data.victim.name,
      weapon: getItemName(marker.data.damageCauserName),
    });
    weaponId = marker.data.damageCauserName;
  } else if (marker.kind === "death") {
    label = t("eventDeath");
    detail = t("eventDeathTip", {
      time,
      killer: marker.data.killer?.name ?? t("tipNoKiller"),
      victim: marker.data.victim.name,
      weapon: getItemName(marker.data.damageCauserName),
    });
    weaponId = marker.data.damageCauserName;
  } else {
    label = t("eventDamage");
    detail = t("eventDamageTip", {
      time,
      attacker: marker.data.attacker?.name ?? t("tipNoKiller"),
      damage: Math.round(marker.data.damage),
      weapon: getItemName(marker.data.damageCauserName),
    });
    weaponId = marker.data.damageCauserName;
  }
  return (
    <div className="pointer-events-none absolute -top-1 left-1/2 z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-border bg-bg/95 px-2 py-1 font-mono text-[10px] text-fg shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-fg-subtle">
        {weaponId && <WeaponIconInline id={weaponId} />}
        {label}
      </div>
      <div className="text-[10px] normal-case tracking-normal text-fg-muted">{detail}</div>
    </div>
  );
}

/**
 * Inline weapon badge — small icon + tiny shorthand. Falls back to a text
 * label when we don't have an icon mapping OR when the image 404s (some
 * weapon ids don't have an asset in pubg/api-assets, especially newer
 * ones). The onError handler swaps the <img> for a text span on any
 * load failure so the killfeed never shows a broken-image glyph.
 */
function WeaponBadge({ id }: { id: string }) {
  const [broken, setBroken] = useState(false);
  const src = id ? getItemIcon(id) : null;
  if (src && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={getItemName(id)}
        title={getItemName(id)}
        width={22}
        height={14}
        className="h-3.5 w-[22px] rounded-sm bg-bg-subtle/40 object-contain"
        loading="lazy"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span className="rounded bg-bg-subtle/60 px-1 text-[9px] text-fg-subtle">
      {getItemName(id)}
    </span>
  );
}

function WeaponIconInline({ id }: { id: string }) {
  const [broken, setBroken] = useState(false);
  const src = id ? getItemIcon(id) : null;
  if (!src || broken) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={20}
      height={12}
      className="h-3 w-5 rounded-sm bg-bg-subtle/40 object-contain"
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}

function Legend({ t }: { t: ReturnType<typeof useTranslations> }) {
  // Bottom legend — single row on wide screens, wraps gracefully on mobile.
  return (
    <div className="mt-3 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-fg-muted">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">
          {t("legend")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-brand" /> {t("legendPlayer")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[#3a3f55]" /> {t("legendDead")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <KillX /> {t("legendKill")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <DropParachute /> {t("legendDrop")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <DropParachute special /> {t("legendDropSpecial")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <BrdmDot /> {t("legendVehicle")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full border border-white/80" /> {t("legendSafeZone")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full border border-accent" /> {t("legendBlueZone")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full border border-combat border-dashed" /> {t("legendRedZone")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3 bg-[#fb923c]" /> {t("legendTracer")}
        </span>
      </div>
    </div>
  );
}

type SortMode = "team" | "alpha" | "alive" | "kills";

function PlayerSidebar({
  teamGroups,
  focusId,
  onFocus,
  isDead,
  killsByAccount,
  shard,
  totalCount,
  sortMode,
  onSortMode,
  t,
  tc,
}: {
  teamGroups: Array<{ teamId: number; members: Array<{ id: string; p: PlayerRef }> }>;
  focusId: string | null;
  onFocus: (id: string | null) => void;
  isDead: (accountId: string) => boolean;
  killsByAccount: Map<string, number>;
  shard: Shard;
  totalCount: number;
  sortMode: SortMode;
  onSortMode: (m: SortMode) => void;
  t: ReturnType<typeof useTranslations>;
  tc: ReturnType<typeof useTranslations>;
}) {
  // Build a flattened list for non-team sorts. Each row carries enough
  // metadata to render exactly the same as the grouped view.
  const flatRows = useMemo(() => {
    const rows: Array<{ id: string; p: PlayerRef; teamId: number }> = [];
    for (const { teamId, members } of teamGroups) {
      for (const m of members) rows.push({ id: m.id, p: m.p, teamId });
    }
    if (sortMode === "alpha") {
      rows.sort((a, b) => (a.p.name ?? "").localeCompare(b.p.name ?? ""));
    } else if (sortMode === "alive") {
      rows.sort((a, b) => Number(isDead(a.id)) - Number(isDead(b.id)));
    } else if (sortMode === "kills") {
      rows.sort(
        (a, b) =>
          (killsByAccount.get(b.id) ?? 0) - (killsByAccount.get(a.id) ?? 0),
      );
    }
    return rows;
  }, [teamGroups, sortMode, isDead, killsByAccount]);

  const renderRow = (row: { id: string; p: PlayerRef; teamId: number }) => {
    const { id, p } = row;
    const dead = isDead(id);
    const memberColor = teamColor(p.teamId);
    const kills = killsByAccount.get(id) ?? 0;
    return (
      <div
        key={id}
        className={`group flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors ${
          focusId === id ? "bg-bg-muted text-fg" : "hover:bg-bg-muted"
        }`}
      >
        <button
          type="button"
          onClick={() => onFocus(id)}
          className={`flex flex-1 items-center gap-2 truncate text-left ${
            dead ? "text-fg-subtle line-through decoration-fg-subtle/40" : "text-fg-muted hover:text-fg"
          }`}
          aria-label={`focus ${p.name}`}
        >
          <span
            className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
            style={{
              backgroundColor: dead ? "#3a3f55" : memberColor,
              opacity: dead ? 0.6 : 1,
            }}
          />
          <span className="truncate">{p.name}</span>
          {kills > 0 && (
            <span className="ml-auto rounded bg-success/15 px-1 font-mono text-[9px] tabular-nums text-success">
              {kills}K
            </span>
          )}
        </button>
        <PlayerLink
          name={p.name}
          shard={shard}
          className="text-fg-subtle hover:text-brand text-[10px] opacity-0 transition-opacity group-hover:opacity-100"
          fallback="↗"
        />
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">
          {t("focusPlayer")}
        </span>
        {/* Sort dropdown — switches between team grouping and flat sorts. */}
        <select
          value={sortMode}
          onChange={(e) => onSortMode(e.target.value as SortMode)}
          className="rounded border border-border bg-bg-muted px-1.5 py-0.5 font-mono text-[10px] text-fg-muted hover:text-fg"
          aria-label={t("sortLabel")}
        >
          <option value="team">{t("sortTeam")}</option>
          <option value="alpha">{t("sortAlpha")}</option>
          <option value="alive">{t("sortAlive")}</option>
          <option value="kills">{t("sortKills")}</option>
        </select>
      </div>
      <div className="mt-2 max-h-[480px] overflow-y-auto pr-1">
        <button
          type="button"
          onClick={() => onFocus(null)}
          className={`mb-1 block w-full rounded-md px-2 py-1 text-left text-xs ${
            focusId === null ? "bg-bg-muted text-fg" : "text-fg-muted hover:bg-bg-muted hover:text-fg"
          }`}
        >
          — {t("none")} —
        </button>
        {sortMode === "team" ? (
          teamGroups.map(({ teamId, members }) => {
            const color = teamColor(teamId === -1 ? undefined : teamId);
            const aliveCount = members.filter((m) => !isDead(m.id)).length;
            return (
              <div key={teamId} className="mt-2 first:mt-0">
                <div className="flex items-center justify-between border-b border-border/50 px-2 pb-1">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em]">
                    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                    {teamId === -1 ? "—" : `T${teamId}`}
                  </span>
                  <span className="font-mono text-[9px] text-fg-subtle">
                    {aliveCount}/{members.length}
                  </span>
                </div>
                {members.map((m) => renderRow({ id: m.id, p: m.p, teamId }))}
              </div>
            );
          })
        ) : (
          <div>{flatRows.map(renderRow)}</div>
        )}
      </div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
        {totalCount} {tc("players")}
      </div>
    </div>
  );
}

function KillfeedHistory({
  entries,
  shard,
  t,
}: {
  entries: TelemetryScene["kills"];
  shard: Shard;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">
          {t("killfeedTitle")}
        </span>
        <span className="font-mono text-[9px] text-fg-subtle">{entries.length}</span>
      </div>
      <ol className="mt-2 max-h-[320px] space-y-1 overflow-y-auto pr-1">
        {entries.map((k, i) => (
          <li
            key={`${k.time}-${k.victim.accountId}-${i}`}
            className="flex flex-wrap items-center gap-1.5 rounded-md bg-bg-muted/40 px-2 py-1 font-mono text-[10px]"
          >
            <span className="tabular-nums text-fg-subtle">{fmtTime(k.time)}</span>
            <PlayerLink name={k.killer?.name} shard={shard} className="text-fg-muted" />
            <WeaponBadge id={k.damageCauserName} />
            <PlayerLink name={k.victim.name} shard={shard} className="text-fg" />
            {k.isHeadshot && <span className="rounded bg-combat/20 px-1 text-[9px] uppercase text-combat">HS</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ZoneCircle({ cx, cy, r, tone }: { cx: number; cy: number; r: number; tone: "play" | "blue" | "red" }) {
  // play = current play zone, drawn WHITE — outline only (#3 feedback:
  //        no inner tint, the white inside was visually noisy).
  // blue = next-zone target drawn BLUE. Gas covers the area OUTSIDE the
  //        circle, so we use an inverse-fill path (rect minus circle).
  // red  = bombardment zone — dashed, tint INSIDE.
  // `vector-effect="non-scaling-stroke"` keeps the line width stable at
  // every zoom level (#5 feedback: lines used to fatten on zoom-in).
  // Stroke trimmed from 1 px to 0.7 px (~30% thinner).
  const STROKE_WIDTH = 0.7;
  if (tone === "blue") {
    return (
      <g>
        <path
          d={`M 0,0 L ${CANVAS_SIZE},0 L ${CANVAS_SIZE},${CANVAS_SIZE} L 0,${CANVAS_SIZE} Z M ${cx + r},${cy} A ${r},${r} 0 1,0 ${cx - r},${cy} A ${r},${r} 0 1,0 ${cx + r},${cy} Z`}
          fill="#38bdf8"
          opacity="0.10"
          fillRule="evenodd"
          pointerEvents="none"
        />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke="#38bdf8"
          strokeWidth={STROKE_WIDTH}
          vectorEffect="non-scaling-stroke"
          opacity="0.85"
        />
      </g>
    );
  }
  const stroke = tone === "play" ? "#ffffff" : "#ef4444";
  return (
    <g>
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={stroke}
        strokeWidth={STROKE_WIDTH}
        vectorEffect="non-scaling-stroke"
        strokeDasharray={tone === "red" ? "4 3" : undefined}
        opacity={tone === "play" ? 0.95 : 0.85}
      />
      {/* play tone has NO fill — outline only (#3). red still tints inside. */}
      {tone === "red" && <circle cx={cx} cy={cy} r={r} fill={stroke} opacity={0.08} />}
    </g>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3 w-3 cursor-pointer accent-brand"
      />
      {label}
    </label>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
      <path d="M3 2l9 5-9 5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
      <rect x="2" y="1" width="3" height="10" />
      <rect x="7" y="1" width="3" height="10" />
    </svg>
  );
}

function RestartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 7a5 5 0 1 0 5-5" />
      <path d="M2 2v4h4" />
    </svg>
  );
}

function KillX() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" stroke="#ef4444" strokeWidth="1.5" aria-hidden>
      <line x1="1" y1="1" x2="9" y2="9" />
      <line x1="9" y1="1" x2="1" y2="9" />
    </svg>
  );
}

function DropParachute({ special = false }: { special?: boolean }) {
  // Mirror the in-map drop glyph (parachute + crate) in the legend so the
  // user sees what each variant looks like.
  return (
    <svg width="12" height="14" viewBox="-8 -7 16 14" aria-hidden>
      <path
        d="M -7 -3 A 7 5 0 0 1 7 -3 L 5 -1 A 5 3.5 0 0 0 -5 -1 Z"
        fill={special ? "#ef4444" : "#fbbf24"}
        stroke="rgba(8,9,12,0.9)"
        strokeWidth="0.6"
      />
      <line x1="-5" y1="-1" x2="-1.5" y2="2" stroke="rgba(8,9,12,0.9)" strokeWidth="0.6" />
      <line x1="5" y1="-1" x2="1.5" y2="2" stroke="rgba(8,9,12,0.9)" strokeWidth="0.6" />
      <rect x="-2.5" y="2" width="5" height="4" fill="#92611f" stroke={special ? "#fbbf24" : "rgba(8,9,12,0.9)"} strokeWidth="0.6" />
    </svg>
  );
}

function BrdmDot() {
  return (
    <svg width="12" height="12" viewBox="-7 -7 14 14" aria-hidden>
      <circle r="6" fill="rgba(8,9,12,0.7)" stroke="#38bdf8" strokeWidth="1" />
      <text fontFamily="var(--font-mono)" fontSize="4" fill="#38bdf8" textAnchor="middle" y="1.5">B</text>
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 5V2h3M12 5V2H9M2 9v3h3M12 9v3H9" />
    </svg>
  );
}

function ExitFullscreenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 2v3H2M9 2v3h3M5 12V9H2M9 12V9h3" />
    </svg>
  );
}

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
