// Server component that fetches telemetry, parses the scene, and feeds it
// to a compact auto-looping <ReplayShell> on the match page. The whole map
// becomes a click-through link to the full /replay route.
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import type { MatchDetails } from "@/lib/pubg/types";
import type { Shard } from "@/lib/pubg/shards";
import { getTelemetry } from "@/lib/pubg/client";
import { parseTelemetry } from "@/lib/pubg/telemetry/parser";
import { getMapMeta } from "@/lib/pubg/maps";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReplayShell, type SerializableScene } from "@/components/replay/ReplayShell";

export async function MiniReplayMap({
  locale,
  match,
  accountId,
  shard,
}: {
  locale: Locale;
  match: MatchDetails;
  accountId?: string;
  shard: Shard;
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
  const map = getMapMeta(match.mapName);

  // If accountId is set, find the focus by matching the player Map.
  let focusId: string | undefined;
  if (accountId) {
    for (const [id] of scene.players) {
      if (id === accountId) {
        focusId = id;
        break;
      }
    }
  }

  // Compact mode doesn't render tracers — keep payload light by stripping damages.
  const serialized: SerializableScene = {
    durationSec: scene.durationSec,
    mapName: scene.mapName,
    positions: scene.positions,
    kills: scene.kills,
    knocks: scene.knocks,
    zones: scene.zones,
    carePackages: scene.carePackages,
    damageHits: [],
    playerEntries: Array.from(scene.players.entries()),
  };

  const focusName = focusId
    ? scene.players.get(focusId)?.name
    : undefined;
  const replayHref = `/${locale}/matches/${match.id}/replay?shard=${shard}${focusName ? `&player=${encodeURIComponent(focusName)}` : ""}`;

  return (
    <Card>
      <CardHeader
        title={focusId ? t("liveMapFocused") : t("liveMap")}
        accent="brand"
      />
      <ReplayShell
        scene={serialized}
        map={map}
        shard={shard}
        defaultFocusId={focusId}
        autoPlay
        compact
        clickThroughHref={replayHref}
      />
    </Card>
  );
}
