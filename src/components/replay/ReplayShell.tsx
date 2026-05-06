"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import type {
  DamageEvent,
  KillEvent,
  ParachuteLandingEvent,
  PlayerRef,
  TelemetryScene,
} from "@/lib/pubg/telemetry/types";
import { snapshotAt, trailFor, zoneAt } from "@/lib/pubg/telemetry/timeline";
import { gameToCanvas, radiusToCanvas } from "@/lib/pubg/telemetry/coordinates";
import { killHeat, landingHeat, type HeatBucket } from "@/lib/pubg/telemetry/heatmap";
import type { MapMeta } from "@/lib/pubg/maps";
import type { Shard } from "@/lib/pubg/shards";
import { getItemName } from "@/lib/assets/names";
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
      zones: serialized.zones,
      players: new Map(serialized.playerEntries),
    }),
    [serialized],
  );

  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState(compact ? 8 : 2);
  const [focusId, setFocusId] = useState<string | null>(defaultFocusId ?? null);
  const [showTrails, setShowTrails] = useState(true);
  const [showZone, setShowZone] = useState(true);
  const [showKills, setShowKills] = useState(true);
  const [showDrops, setShowDrops] = useState(true);
  const [showTracers, setShowTracers] = useState(true);
  const [heatMode, setHeatMode] = useState<"off" | "kills" | "landings">("off");
  const [hoverId, setHoverId] = useState<string | null>(null);
  // Continuous zoom (1.0 .. 5.0), driven by buttons / slider / scroll wheel.
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

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
  const landingHeatBuckets = useMemo<HeatBucket[]>(() => landingHeat(scene, map.maxCm), [scene, map]);
  const activeHeat = heatMode === "kills" ? killHeatBuckets : heatMode === "landings" ? landingHeatBuckets : [];

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
  const visibleDrops = useMemo(() => {
    if (!showDrops) return [];
    return scene.carePackages.filter((c) => c.time <= time + 0.001);
  }, [scene.carePackages, time, showDrops]);

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

  // Killfeed: last 6 kills that have happened at or before the current time.
  const killfeed = useMemo(() => {
    return scene.kills.filter((k) => k.time <= time + 0.001).slice(-6).reverse();
  }, [scene.kills, time]);

  // Killfeed history — full list of every kill that's happened up to current time.
  const killfeedFull = useMemo(() => {
    return scene.kills
      .filter((k) => k.time <= time + 0.001)
      .slice()
      .reverse();
  }, [scene.kills, time]);

  // Group players by team. Untrustworthy team ids (undefined) all go in the
  // "—" bucket. Sorted by team rank if we know it (closer to # 1 = higher).
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

  // Scroll-wheel zoom on the map area (pubg.sh-style).
  const mapWrapRef = useRef<HTMLDivElement | null>(null);
  const onWheel = useCallback((e: WheelEvent) => {
    // Only zoom when the cursor is over the map and the user actually scrolls.
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
              fill={heatMode === "kills" ? "#ef4444" : "#38bdf8"}
              opacity={Math.max(0.08, b.count * 0.5)}
            />
          ))}
          {zone?.safetyZonePosition && zone.safetyZoneRadius && (
            <ZoneCircle
              cx={gameToCanvas(zone.safetyZonePosition, map, { width: CANVAS_SIZE, height: CANVAS_SIZE }).x}
              cy={gameToCanvas(zone.safetyZonePosition, map, { width: CANVAS_SIZE, height: CANVAS_SIZE }).y}
              r={radiusToCanvas(zone.safetyZoneRadius, map, { width: CANVAS_SIZE, height: CANVAS_SIZE })}
              tone="safe"
            />
          )}
          {zone?.poisonGasWarningPosition && zone.poisonGasWarningRadius && (
            <ZoneCircle
              cx={gameToCanvas(zone.poisonGasWarningPosition, map, { width: CANVAS_SIZE, height: CANVAS_SIZE }).x}
              cy={gameToCanvas(zone.poisonGasWarningPosition, map, { width: CANVAS_SIZE, height: CANVAS_SIZE }).y}
              r={radiusToCanvas(zone.poisonGasWarningRadius, map, { width: CANVAS_SIZE, height: CANVAS_SIZE })}
              tone="warn"
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

          {/* Drops (care packages) — pubg.sh-style: simple square crate tilted
              45° (a "diamond"), with a bright outline ring while fresh. */}
          {visibleDrops.map((d, idx) => {
            const p = gameToCanvas(d.location, map, { width: CANVAS_SIZE, height: CANVAS_SIZE });
            const fresh = time - d.time < 6;
            return (
              <g key={`drop-${idx}`} transform={`translate(${p.x} ${p.y})`}>
                {fresh && (
                  <circle r="11" fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.85">
                    <animate attributeName="r" from="6" to="22" dur="1.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.85" to="0" dur="1.4s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* dark backing for legibility against the map */}
                <rect
                  x="-5.4" y="-5.4" width="10.8" height="10.8"
                  fill="rgba(8,9,12,0.85)"
                  stroke="#fbbf24"
                  strokeWidth="1.6"
                  transform="rotate(45)"
                />
                {/* inner dot — gold parachute crate marker */}
                <rect x="-2" y="-2" width="4" height="4" fill="#fbbf24" transform="rotate(45)" />
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

  // Zoom origin: focus player when zoomed; else center.
  const zoomOriginX = focusCanvas && zoom > 1 ? `${(focusCanvas.x / CANVAS_SIZE) * 100}%` : "50%";
  const zoomOriginY = focusCanvas && zoom > 1 ? `${(focusCanvas.y / CANVAS_SIZE) * 100}%` : "50%";

  // Map block + side overlays (zoom + fullscreen + killfeed). Wrapped so we
  // can drop it into either the inline layout or the fullscreen layout.
  const mapWithOverlays = (
    <div ref={mapWrapRef} className="relative h-full w-full">
      {/* Zoom container — outer box stays fixed-size, inner is scaled */}
      <div className="overflow-hidden rounded-2xl">
        <div
          className="transition-transform duration-150 ease-out"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: `${zoomOriginX} ${zoomOriginY}`,
          }}
        >
          {mapInner}
        </div>
      </div>

      {/* Killfeed — overlay on top-right of the map */}
      {killfeed.length > 0 && (
        <div className="pointer-events-none absolute right-3 top-12 w-[260px] space-y-1">
          {killfeed.map((k, i) => {
            const age = time - k.time;
            const fresh = age < 5;
            const opacity = age < 30 ? Math.max(0.45, 1 - age / 30) : 0.35;
            return (
              <div
                key={`kf-${i}-${k.time}`}
                className={`rounded-md border border-border bg-bg/85 px-2 py-1 font-mono text-[11px] backdrop-blur-sm ${
                  fresh ? "border-combat/50 shadow-[0_0_12px_-2px_rgba(239,68,68,0.4)]" : ""
                }`}
                style={{ opacity }}
              >
                <span className="text-fg-muted">{k.killer?.name ?? "—"}</span>
                <span className="mx-1.5 text-combat">→</span>
                <span className="text-fg">{k.victim.name}</span>
                <span className="ml-2 text-[9px] text-fg-subtle">
                  {getItemName(k.damageCauserName)}
                </span>
                {k.isHeadshot && (
                  <span className="ml-1 rounded bg-combat/20 px-1 text-[9px] uppercase text-combat">
                    HS
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating fullscreen toggle (top-left) */}
      <div className="absolute left-3 top-12">
        <button
          type="button"
          onClick={() => setFullscreen((f) => !f)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-strong bg-bg/80 text-fg-muted backdrop-blur-sm transition-colors hover:text-fg"
          aria-label={fullscreen ? t("exitFullscreen") : t("enterFullscreen")}
          title={fullscreen ? t("exitFullscreen") : t("enterFullscreen")}
        >
          {fullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
        </button>
      </div>

      {/* Floating zoom rail — pubg.sh-inspired: + / slider / − / reset.
          Lives on the right edge, vertically centered. */}
      <ZoomRail
        zoom={zoom}
        onZoom={(z) => setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +z.toFixed(2))))}
        t={t}
      />
    </div>
  );

  // Fullscreen layout: the map gets a square box sized to fit BOTH the
  // viewport width and the remaining height (after controls / legend).
  // We use min(100vw, 100vh - 220px) so the square never crops sides or
  // top/bottom — the user explicitly asked for "fit, do not crop".
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
          t={t}
        />
        {/* Legend lives at the bottom (under the map + controls), full-width. */}
        <Legend t={t} />
      </div>

      <aside className="space-y-3">
        <PlayerSidebar
          teamGroups={teamGroups}
          focusId={focusId}
          onFocus={setFocusId}
          isDead={isDead}
          shard={shard}
          totalCount={scene.players.size}
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
  heatMode: "off" | "kills" | "landings";
  onHeatMode: (m: "off" | "kills" | "landings") => void;
  markers: ScrubberMarker[];
  t: ReturnType<typeof useTranslations>;
}) {
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
        <SpeedSelector value={speed} onChange={onSpeed} />
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
          {(["off", "kills", "landings"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onHeatMode(m)}
              className={`rounded px-2 py-0.5 transition-colors ${
                heatMode === m
                  ? m === "kills"
                    ? "bg-combat/20 text-combat"
                    : m === "landings"
                    ? "bg-accent/20 text-accent"
                    : "bg-bg text-fg"
                  : "text-fg-subtle hover:text-fg"
              }`}
            >
              {t(`heat_${m}`)}
            </button>
          ))}
        </span>
      </div>
    </div>
  );
}

function SpeedSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  // pubg.sh uses a small "speed pill" with 1×/2×/4×/8× steps. We keep that
  // pattern but make the active step clearly highlighted with a sliding bg.
  const steps = [1, 2, 4, 8];
  return (
    <div className="flex h-9 items-center gap-0.5 rounded-md border border-border bg-bg-muted p-0.5">
      {steps.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`flex h-7 min-w-[34px] items-center justify-center rounded px-2 font-mono text-[11px] font-semibold uppercase transition-all ${
            value === s
              ? "bg-brand text-bg shadow-sm"
              : "text-fg-muted hover:bg-bg/60 hover:text-fg"
          }`}
        >
          {s}×
        </button>
      ))}
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
        <div className="pointer-events-none absolute inset-x-0 top-3 z-0 h-2">
          {markers.map((m, i) => {
            const isHover = hovered === i;
            const left = `${m.frac * 100}%`;
            const cls =
              m.kind === "kill"
                ? "h-2 w-1.5 rounded-sm bg-success"
                : m.kind === "death"
                ? "h-3 w-0.5 -translate-y-0.5 bg-combat"
                : "h-1 w-1 rounded-full bg-combat/70";
            return (
              <span
                key={`mk-${i}-${m.time}`}
                className={`pointer-events-auto absolute -translate-x-1/2 ${cls}`}
                style={{ left, top: m.kind === "damage" ? 4 : 0 }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered((cur) => (cur === i ? null : cur))}
              >
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
  if (marker.kind === "kill") {
    label = t("eventKill");
    detail = t("eventKillTip", {
      time,
      killer: marker.data.killer?.name ?? t("tipNoKiller"),
      victim: marker.data.victim.name,
      weapon: getItemName(marker.data.damageCauserName),
    });
  } else if (marker.kind === "death") {
    label = t("eventDeath");
    detail = t("eventDeathTip", {
      time,
      killer: marker.data.killer?.name ?? t("tipNoKiller"),
      victim: marker.data.victim.name,
      weapon: getItemName(marker.data.damageCauserName),
    });
  } else {
    label = t("eventDamage");
    detail = t("eventDamageTip", {
      time,
      attacker: marker.data.attacker?.name ?? t("tipNoKiller"),
      damage: Math.round(marker.data.damage),
      weapon: getItemName(marker.data.damageCauserName),
    });
  }
  return (
    <div className="pointer-events-none absolute -top-1 left-1/2 z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-border bg-bg/95 px-2 py-1 font-mono text-[10px] text-fg shadow-lg backdrop-blur-sm">
      <div className="text-[9px] uppercase tracking-wider text-fg-subtle">{label}</div>
      <div className="text-[10px] normal-case tracking-normal text-fg-muted">{detail}</div>
    </div>
  );
}

/**
 * Vertical zoom rail à la pubg.sh — `+` on top, slider in the middle, `−`
 * on the bottom, plus a small reset link. Sits on the right edge of the
 * map; players can also scroll the wheel anywhere on the map to zoom.
 */
function ZoomRail({
  zoom,
  onZoom,
  t,
}: {
  zoom: number;
  onZoom: (z: number) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col items-center gap-1 rounded-md border border-border-strong bg-bg/80 p-1 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => onZoom(Math.min(ZOOM_MAX, zoom + ZOOM_STEP))}
        className="inline-flex h-6 w-6 items-center justify-center rounded text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg"
        aria-label={t("zoomIn")}
        title={t("zoomIn")}
      >
        <PlusIcon />
      </button>
      <input
        type="range"
        min={ZOOM_MIN}
        max={ZOOM_MAX}
        step={ZOOM_STEP}
        value={zoom}
        onChange={(e) => onZoom(Number(e.target.value))}
        // CSS trick: rotate a horizontal range input so it looks vertical.
        // We use a fixed length and orient via writing-mode where possible.
        className="h-24 w-1 cursor-pointer accent-brand"
        style={{ writingMode: "vertical-lr" as React.CSSProperties["writingMode"], direction: "rtl" }}
        aria-label={t("zoomLabel")}
      />
      <button
        type="button"
        onClick={() => onZoom(Math.max(ZOOM_MIN, zoom - ZOOM_STEP))}
        className="inline-flex h-6 w-6 items-center justify-center rounded text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg"
        aria-label={t("zoomOut")}
        title={t("zoomOut")}
      >
        <MinusIcon />
      </button>
      <button
        type="button"
        onClick={() => onZoom(1)}
        className="font-mono text-[9px] uppercase tracking-wide text-fg-subtle transition-colors hover:text-fg"
        title={t("zoomReset")}
      >
        {zoom.toFixed(1)}×
      </button>
    </div>
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
          <DropDiamond /> {t("legendDrop")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full border border-accent" /> {t("legendSafeZone")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full border border-combat" /> {t("legendBlueZone")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3 bg-[#fb923c]" /> {t("legendTracer")}
        </span>
      </div>
    </div>
  );
}

function PlayerSidebar({
  teamGroups,
  focusId,
  onFocus,
  isDead,
  shard,
  totalCount,
  t,
  tc,
}: {
  teamGroups: Array<{ teamId: number; members: Array<{ id: string; p: PlayerRef }> }>;
  focusId: string | null;
  onFocus: (id: string | null) => void;
  isDead: (accountId: string) => boolean;
  shard: Shard;
  totalCount: number;
  t: ReturnType<typeof useTranslations>;
  tc: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">
        {t("focusPlayer")}
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
        {teamGroups.map(({ teamId, members }) => {
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
              {members.map(({ id, p }) => {
                const dead = isDead(id);
                const memberColor = teamColor(p.teamId);
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
                    </button>
                    <PlayerLink
                      name={p.name}
                      shard={shard}
                      className="text-fg-subtle hover:text-brand text-[10px] opacity-0 transition-opacity group-hover:opacity-100"
                      fallback="↗"
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
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
            <span className="text-combat">→</span>
            <PlayerLink name={k.victim.name} shard={shard} className="text-fg" />
            {k.isHeadshot && <span className="rounded bg-combat/20 px-1 text-[9px] uppercase text-combat">HS</span>}
            <span className="ml-auto truncate text-fg-subtle">{getItemName(k.damageCauserName)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ZoneCircle({ cx, cy, r, tone }: { cx: number; cy: number; r: number; tone: "safe" | "warn" }) {
  const stroke = tone === "safe" ? "#38bdf8" : "#ef4444";
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.8" />
      <circle cx={cx} cy={cy} r={r} fill={stroke} opacity={tone === "safe" ? 0.05 : 0.04} />
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

function DropDiamond() {
  // Mirror the in-map drop glyph (small gold diamond) so the legend
  // visually matches what the user sees on the map.
  return (
    <svg width="10" height="10" viewBox="-6 -6 12 12" aria-hidden>
      <rect x="-4" y="-4" width="8" height="8" fill="rgba(8,9,12,0.85)" stroke="#fbbf24" strokeWidth="1.4" transform="rotate(45)" />
      <rect x="-1.5" y="-1.5" width="3" height="3" fill="#fbbf24" transform="rotate(45)" />
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

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <line x1="6" y1="2" x2="6" y2="10" />
      <line x1="2" y1="6" x2="10" y2="6" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <line x1="2" y1="6" x2="10" y2="6" />
    </svg>
  );
}

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
