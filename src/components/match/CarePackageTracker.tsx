import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import type { MatchDetails } from "@/lib/pubg/types";
import { getTelemetry } from "@/lib/pubg/client";
import { parseTelemetry } from "@/lib/pubg/telemetry/parser";
import { gameToCanvas } from "@/lib/pubg/telemetry/coordinates";
import { getMapMeta } from "@/lib/pubg/maps";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { MapCanvas } from "@/components/replay/MapCanvas";
import { formatDuration } from "@/lib/format/duration";

const SIZE = 480;

export async function CarePackageTracker({
  locale,
  match,
}: {
  locale: Locale;
  match: MatchDetails;
}) {
  const t = await getTranslations({ locale, namespace: "match" });

  if (!match.telemetryUrl) {
    return (
      <Card>
        <CardHeader title={t("carePackages")} accent="brand" />
        <EmptyState title={t("telemetryUnavailable")} />
      </Card>
    );
  }

  const raw = await getTelemetry(match.telemetryUrl);
  if (!raw.length) {
    return (
      <Card>
        <CardHeader title={t("carePackages")} accent="brand" />
        <EmptyState title={t("telemetryUnavailable")} />
      </Card>
    );
  }

  const scene = parseTelemetry(raw, match.mapName);
  const map = getMapMeta(match.mapName);
  const drops = scene.carePackages;

  if (!drops.length) {
    return (
      <Card>
        <CardHeader title={t("carePackages")} accent="brand" />
        <EmptyState title={t("noDrops")} />
      </Card>
    );
  }

  // For each drop, find kills within 200m of the drop location & after the drop time.
  const enriched = drops.map((drop) => {
    const nearbyKills = scene.kills.filter((k) => {
      if (k.time < drop.time) return false;
      if (!k.victim.location) return false;
      const dx = (k.victim.location.x - drop.location.x) / 100; // m
      const dy = (k.victim.location.y - drop.location.y) / 100;
      return Math.sqrt(dx * dx + dy * dy) < 200;
    });
    return { ...drop, nearbyKills };
  });

  return (
    <Card>
      <CardHeader title={t("carePackages")} accent="brand" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div>
          <MapCanvas map={map} size={SIZE}>
            {enriched.map((drop, i) => {
              const p = gameToCanvas(drop.location, map, { width: SIZE, height: SIZE });
              return (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="14" fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.4" />
                  <circle cx={p.x} cy={p.y} r="5" fill="#fbbf24" stroke="rgba(8,9,12,0.9)" strokeWidth="1.5" />
                  <text
                    x={p.x + 9}
                    y={p.y + 3}
                    fontFamily="var(--font-mono)"
                    fontSize="9"
                    fill="#fbbf24"
                    style={{ paintOrder: "stroke", stroke: "rgba(8,9,12,0.9)", strokeWidth: 3 } as React.CSSProperties}
                  >
                    {formatDuration(drop.time)}
                  </text>
                </g>
              );
            })}
          </MapCanvas>
        </div>

        <ul className="space-y-2">
          {enriched.map((drop, i) => (
            <li
              key={i}
              className="rounded-lg border border-tier-gold/40 bg-tier-gold/[0.04] px-3 py-2.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <Badge tone="tierGold">★ {t("carePackage")} #{i + 1}</Badge>
                <span className="font-mono tabular-nums text-fg-subtle">
                  {formatDuration(drop.time)}
                </span>
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                {(drop.location.x / 1000).toFixed(0)}×{(drop.location.y / 1000).toFixed(0)}
              </div>
              {drop.nearbyKills.length > 0 && (
                <div className="mt-2 text-[11px] text-combat">
                  {t("nearbyKills", { n: drop.nearbyKills.length })}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
