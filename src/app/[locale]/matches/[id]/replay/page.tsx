import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { env } from "@/lib/env";
import { isShard, type Shard } from "@/lib/pubg/shards";
import { getMatch, getTelemetry } from "@/lib/pubg/client";
import { NotFoundError } from "@/lib/pubg/errors";
import { parseTelemetry } from "@/lib/pubg/telemetry/parser";
import { getMapMeta } from "@/lib/pubg/maps";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Link } from "@/lib/i18n/navigation";
import { ReplayShell, type SerializableScene } from "@/components/replay/ReplayShell";

export default async function ReplayPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; id: string }>;
  searchParams: Promise<{ shard?: string; player?: string }>;
}) {
  const { locale, id } = await params;
  const { shard: shardParam, player: focusPlayerName } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "replay" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const tm = await getTranslations({ locale, namespace: "match" });

  const shard: Shard = shardParam && isShard(shardParam) ? shardParam : env.PUBG_DEFAULT_SHARD;

  let match;
  try {
    match = await getMatch(shard, id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  if (!match.telemetryUrl) {
    return (
      <div className="space-y-4">
        <BackToMatch locale={locale} matchId={id} shard={shard} t={tc} tm={tm} />
        <Card>
          <CardHeader title={t("title")} accent="brand" />
          <EmptyState title={tm("telemetryUnavailable")} />
        </Card>
      </div>
    );
  }

  const raw = await getTelemetry(match.telemetryUrl);
  if (!raw.length) {
    return (
      <div className="space-y-4">
        <BackToMatch locale={locale} matchId={id} shard={shard} t={tc} tm={tm} />
        <Card>
          <CardHeader title={t("title")} accent="brand" />
          <EmptyState title={tm("telemetryUnavailable")} />
        </Card>
      </div>
    );
  }

  const scene = parseTelemetry(raw, match.mapName);
  const map = getMapMeta(match.mapName);

  // Find focus player by name (matches case-insensitive)
  let focusId: string | undefined;
  if (focusPlayerName) {
    const lower = focusPlayerName.toLowerCase();
    for (const [id, p] of scene.players) {
      if (p.name.toLowerCase() === lower) {
        focusId = id;
        break;
      }
    }
  }

  // Serialize scene for client (Map → array). Trim damages to events with
  // both locations + damage >= 5 to keep the payload modest (large matches
  // can have 5k+ damage events).
  const damageHits = scene.damages.filter(
    (d) => d.attackerLocation && d.victimLocation && d.damage >= 5,
  );
  const serialized: SerializableScene = {
    durationSec: scene.durationSec,
    mapName: scene.mapName,
    positions: scene.positions,
    kills: scene.kills,
    knocks: scene.knocks,
    zones: scene.zones,
    carePackages: scene.carePackages,
    parachuteLandings: scene.parachuteLandings,
    vehicleSpawns: scene.vehicleSpawns,
    vehicleRides: scene.vehicleRides,
    damageHits,
    playerEntries: Array.from(scene.players.entries()),
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackToMatch locale={locale} matchId={id} shard={shard} t={tc} tm={tm} />
        <h1 className="font-display text-xl font-bold text-fg sm:text-2xl">
          {t("title")} <span className="text-brand">·</span>{" "}
          <span className="text-fg-muted">{map.displayName}</span>
        </h1>
      </div>

      <ReplayShell scene={serialized} map={map} shard={shard} defaultFocusId={focusId} autoPlay />
    </div>
  );
}

function BackToMatch({
  matchId,
  shard,
  t,
  tm,
}: {
  locale: Locale;
  matchId: string;
  shard: Shard;
  t: Awaited<ReturnType<typeof getTranslations>>;
  tm: Awaited<ReturnType<typeof getTranslations>>;
}) {
  return (
    <Link
      href={`/matches/${matchId}?shard=${shard}` as `/matches/${string}`}
      className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-brand"
    >
      ← {t("back")} {tm("title").toLowerCase()}
    </Link>
  );
}
