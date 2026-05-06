import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import type { MatchDetails } from "@/lib/pubg/types";
import { getTelemetry } from "@/lib/pubg/client";
import { parseTelemetry } from "@/lib/pubg/telemetry/parser";
import { extractRoute } from "@/lib/pubg/telemetry/route";
import { gameToCanvas } from "@/lib/pubg/telemetry/coordinates";
import { getMapMeta } from "@/lib/pubg/maps";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MapCanvas } from "@/components/replay/MapCanvas";

const SIZE = 540;

export async function PlayerRouteMap({
  locale,
  match,
  accountId,
}: {
  locale: Locale;
  match: MatchDetails;
  accountId: string;
}) {
  const t = await getTranslations({ locale, namespace: "match" });

  if (!match.telemetryUrl) {
    return (
      <Card>
        <CardHeader title={t("routeMap")} accent="brand" />
        <EmptyState title={t("telemetryUnavailable")} />
      </Card>
    );
  }

  const raw = await getTelemetry(match.telemetryUrl);
  if (!raw.length) {
    return (
      <Card>
        <CardHeader title={t("routeMap")} accent="brand" />
        <EmptyState title={t("telemetryUnavailable")} />
      </Card>
    );
  }

  const scene = parseTelemetry(raw, match.mapName);
  const route = extractRoute(scene, accountId);
  const map = getMapMeta(match.mapName);

  if (route.path.length < 2) {
    return (
      <Card>
        <CardHeader title={t("routeMap")} accent="brand" />
        <EmptyState title={t("telemetryUnavailable")} />
      </Card>
    );
  }

  const canvas = { width: SIZE, height: SIZE };

  return (
    <Card>
      <CardHeader title={t("routeMap")} accent="brand" />
      <p className="mb-3 text-xs text-fg-muted">
        {t("routeMapDescription", { name: route.name })}
      </p>
      <MapCanvas map={map} size={SIZE}>
        {/* Path polyline */}
        <PathLine route={route} map={map} canvas={canvas} />

        {/* Kill spots */}
        {route.kills.map((k, i) => {
          const p = gameToCanvas({ x: k.x, y: k.y, z: 0 }, map, canvas);
          return (
            <g key={`k-${i}`}>
              <line x1={p.x - 5} y1={p.y - 5} x2={p.x + 5} y2={p.y + 5} stroke="#22c55e" strokeWidth="2" />
              <line x1={p.x + 5} y1={p.y - 5} x2={p.x - 5} y2={p.y + 5} stroke="#22c55e" strokeWidth="2" />
            </g>
          );
        })}

        {/* Landing */}
        {route.landing && (() => {
          const p = gameToCanvas(
            { x: route.landing.x, y: route.landing.y, z: 0 },
            map,
            canvas,
          );
          return (
            <g>
              <circle cx={p.x} cy={p.y} r="9" fill="none" stroke="#38bdf8" strokeWidth="2" />
              <circle cx={p.x} cy={p.y} r="3" fill="#38bdf8" />
              <text
                x={p.x + 12}
                y={p.y + 3}
                fontFamily="var(--font-mono)"
                fontSize="9"
                fill="#38bdf8"
              >
                START
              </text>
            </g>
          );
        })()}

        {/* Death */}
        {route.death && (() => {
          const p = gameToCanvas(
            { x: route.death.x, y: route.death.y, z: 0 },
            map,
            canvas,
          );
          return (
            <g>
              <circle cx={p.x} cy={p.y} r="9" fill="none" stroke="#ef4444" strokeWidth="2" />
              <circle cx={p.x} cy={p.y} r="3" fill="#ef4444" />
              <text
                x={p.x + 12}
                y={p.y + 3}
                fontFamily="var(--font-mono)"
                fontSize="9"
                fill="#ef4444"
              >
                END
              </text>
            </g>
          );
        })()}
      </MapCanvas>

      <Legend t={t} />
    </Card>
  );
}

function PathLine({
  route,
  map,
  canvas,
}: {
  route: ReturnType<typeof extractRoute>;
  map: ReturnType<typeof getMapMeta>;
  canvas: { width: number; height: number };
}) {
  if (route.path.length < 2) return null;
  const pts = route.path.map((p) => gameToCanvas({ x: p.x, y: p.y, z: 0 }, map, canvas));
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return (
    <path
      d={d}
      fill="none"
      stroke="#f3a536"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.85"
    />
  );
}

function Legend({ t }: { t: Awaited<ReturnType<typeof getTranslations>> }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-full border-2 border-accent" />{" "}
        {t("routeStart")}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-1 w-6 rounded bg-brand" /> {t("routePath")}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 text-success">✕</span> {t("routeKill")}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-full border-2 border-combat" />{" "}
        {t("routeDeath")}
      </span>
    </div>
  );
}
