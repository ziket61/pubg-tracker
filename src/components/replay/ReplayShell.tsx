"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { PlayerRef, TelemetryScene } from "@/lib/pubg/telemetry/types";
import { snapshotAt, trailFor, zoneAt } from "@/lib/pubg/telemetry/timeline";
import { gameToCanvas, radiusToCanvas } from "@/lib/pubg/telemetry/coordinates";
import { killHeat, landingHeat, type HeatBucket } from "@/lib/pubg/telemetry/heatmap";
import type { MapMeta } from "@/lib/pubg/maps";
import { MapCanvas } from "./MapCanvas";

const CANVAS_SIZE = 720;
const TRAIL_WINDOW = 60; // seconds
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
  // players is a Map — pre-serialize as array of [id, ref] for client transport
  playerEntries: Array<[string, PlayerRef]>;
}

export function ReplayShell({
  scene: serialized,
  map,
  defaultFocusId,
}: {
  scene: SerializableScene;
  map: MapMeta;
  defaultFocusId?: string;
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
      damages: [],
      carePackages: serialized.carePackages,
      zones: serialized.zones,
      players: new Map(serialized.playerEntries),
    }),
    [serialized],
  );

  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [focusId, setFocusId] = useState<string | null>(defaultFocusId ?? null);
  const [showTrails, setShowTrails] = useState(true);
  const [showZone, setShowZone] = useState(true);
  const [showKills, setShowKills] = useState(true);
  const [heatMode, setHeatMode] = useState<"off" | "kills" | "landings">("off");

  // Pre-compute heatmap buckets — they don't depend on `time`.
  const killHeatBuckets = useMemo<HeatBucket[]>(() => killHeat(scene, map.maxCm), [scene, map]);
  const landingHeatBuckets = useMemo<HeatBucket[]>(() => landingHeat(scene, map.maxCm), [scene, map]);
  const activeHeat = heatMode === "kills" ? killHeatBuckets : heatMode === "landings" ? landingHeatBuckets : [];

  // Smooth playback via requestAnimationFrame
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
          setPlaying(false);
          return scene.durationSec;
        }
        return next;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, scene.durationSec]);

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

  // Players, sorted: focus first, then alive count
  const sortedPlayers = useMemo(() => {
    const arr = Array.from(scene.players.entries()).map(([id, p]) => ({ id, p }));
    arr.sort((a, b) => (a.p.name ?? "").localeCompare(b.p.name ?? ""));
    return arr;
  }, [scene.players]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
      <div>
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
            const color = teamColor(s.teamId);
            const dead = s.health <= 0;
            const alpha = s.isStale ? 0.35 : 1;
            return (
              <g key={s.accountId} opacity={alpha}>
                {isFocus && <circle cx={c.x} cy={c.y} r="9" fill="none" stroke={color} strokeWidth="1" opacity="0.5" />}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isFocus ? 5 : 3.5}
                  fill={dead ? "#3a3f55" : color}
                  stroke="rgba(8,9,12,0.9)"
                  strokeWidth="1.25"
                />
                {isFocus && (
                  <text
                    x={c.x + 8}
                    y={c.y + 3}
                    fontFamily="var(--font-mono)"
                    fontSize="9"
                    fill={color}
                    style={{ paintOrder: "stroke", stroke: "rgba(8,9,12,0.9)", strokeWidth: 3 } as React.CSSProperties}
                  >
                    {s.name}
                  </text>
                )}
              </g>
            );
          })}
        </MapCanvas>

        {/* Controls bar under canvas */}
        <div className="mt-3 rounded-xl border border-border bg-surface p-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-brand-dim/60 bg-brand text-bg transition-colors hover:bg-brand-hover"
              aria-label={playing ? t("pause") : t("play")}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button
              type="button"
              onClick={() => {
                setTime(0);
                setPlaying(false);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-hover text-fg-muted transition-colors hover:text-fg"
              aria-label={t("restart")}
            >
              <RestartIcon />
            </button>
            <div className="flex h-9 items-center gap-1 rounded-md border border-border bg-bg-muted px-1">
              {[1, 2, 4, 8].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  className={`h-7 rounded px-2 font-mono text-[11px] font-semibold uppercase transition-colors ${
                    speed === s ? "bg-brand text-bg" : "text-fg-muted hover:text-fg"
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
            <span className="ml-auto font-mono text-xs tabular-nums text-fg-muted">
              {fmtTime(time)} / {fmtTime(scene.durationSec)}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={scene.durationSec}
            step="1"
            value={Math.floor(time)}
            onChange={(e) => {
              setPlaying(false);
              setTime(Number(e.target.value));
            }}
            className="mt-3 w-full accent-brand"
          />

          <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            <Toggle checked={showTrails} onChange={setShowTrails} label={t("trails")} />
            <Toggle checked={showZone} onChange={setShowZone} label={t("zone")} />
            <Toggle checked={showKills} onChange={setShowKills} label={t("kills")} />
            <span className="ml-auto inline-flex items-center gap-1 rounded border border-border bg-bg-muted p-0.5">
              {(["off", "kills", "landings"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setHeatMode(m)}
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
      </div>

      {/* Side panel: player picker */}
      <aside className="space-y-3">
        <div className="rounded-xl border border-border bg-surface p-3">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">
            {t("focusPlayer")}
          </div>
          <div className="mt-2 max-h-[480px] overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => setFocusId(null)}
              className={`mb-1 block w-full rounded-md px-2 py-1 text-left text-xs ${
                focusId === null ? "bg-bg-muted text-fg" : "text-fg-muted hover:bg-bg-muted hover:text-fg"
              }`}
            >
              — {t("none")} —
            </button>
            {sortedPlayers.map(({ id, p }) => (
              <button
                key={id}
                type="button"
                onClick={() => setFocusId(id)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors ${
                  focusId === id ? "bg-bg-muted text-fg" : "text-fg-muted hover:bg-bg-muted hover:text-fg"
                }`}
              >
                <span
                  className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: teamColor(p.teamId) }}
                />
                <span className="truncate">{p.name}</span>
                {p.teamId != null && (
                  <span className="ml-auto font-mono text-[10px] text-fg-subtle">T{p.teamId}</span>
                )}
              </button>
            ))}
          </div>
          <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {sortedPlayers.length} {tc("players")}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-3 text-xs text-fg-muted">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">
            {t("legend")}
          </div>
          <ul className="mt-2 space-y-1.5">
            <li className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-brand" /> {t("legendPlayer")}
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-[#3a3f55]" /> {t("legendDead")}
            </li>
            <li className="flex items-center gap-2">
              <KillX /> {t("legendKill")}
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full border border-accent" /> {t("legendSafeZone")}
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full border border-combat" /> {t("legendBlueZone")}
            </li>
          </ul>
        </div>
      </aside>
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

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
