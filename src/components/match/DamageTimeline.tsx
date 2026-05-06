import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import type { MatchDetails } from "@/lib/pubg/types";
import type { Shard } from "@/lib/pubg/shards";
import { getTelemetry } from "@/lib/pubg/client";
import { parseTelemetry } from "@/lib/pubg/telemetry/parser";
import { buildDamageTimeline } from "@/lib/pubg/telemetry/damage-timeline";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard, StatGrid } from "@/components/ui/StatCard";
import { PlayerLink } from "@/components/common/PlayerLink";
import { getItemName } from "@/lib/assets/names";
import { formatDuration } from "@/lib/format/duration";

export async function DamageTimeline({
  locale,
  match,
  accountId,
  shard,
}: {
  locale: Locale;
  match: MatchDetails;
  accountId: string;
  shard: Shard;
}) {
  const t = await getTranslations({ locale, namespace: "match" });
  const tc = await getTranslations({ locale, namespace: "common" });

  if (!match.telemetryUrl) {
    return (
      <Card>
        <CardHeader title={t("damageTimeline")} accent="accent" />
        <EmptyState title={t("telemetryUnavailable")} />
      </Card>
    );
  }

  const raw = await getTelemetry(match.telemetryUrl);
  if (!raw.length) {
    return (
      <Card>
        <CardHeader title={t("damageTimeline")} accent="accent" />
        <EmptyState title={t("telemetryUnavailable")} />
      </Card>
    );
  }

  const scene = parseTelemetry(raw, match.mapName);
  const summary = buildDamageTimeline(scene, accountId);

  if (summary.entries.length === 0) {
    return (
      <Card>
        <CardHeader title={t("damageTimeline")} accent="accent" />
        <EmptyState title={tc("noData")} />
      </Card>
    );
  }

  // Show only meaningful events (skip tiny <5 dmg ticks)
  const meaningful = summary.entries.filter(
    (e) => e.kind !== "damage-dealt" && e.kind !== "damage-taken" || e.amount >= 5,
  ).slice(0, 30);

  return (
    <Card>
      <CardHeader title={t("damageTimeline")} accent="accent" />
      <StatGrid>
        <StatCard
          label={t("totalDamageGiven")}
          value={Math.round(summary.totalGiven).toString()}
          tone="combat"
        />
        <StatCard
          label={t("totalDamageTaken")}
          value={Math.round(summary.totalTaken).toString()}
          tone="default"
        />
        <StatCard label={t("knocksDealt")} value={summary.knocksDealt.toString()} tone="brand" />
        <StatCard label={t("killsDealt")} value={summary.killsDealt.toString()} tone="combat" />
      </StatGrid>

      <ol className="mt-4 space-y-1">
        {meaningful.map((e, i) => (
          <li
            key={i}
            className="grid grid-cols-[60px_120px_1fr_auto] items-center gap-3 rounded-md bg-bg-muted/40 px-2.5 py-1.5 text-xs"
          >
            <span className="font-mono tabular-nums text-fg-subtle">
              {formatDuration(e.time)}
            </span>
            <KindBadge kind={e.kind} t={t} />
            <span className="truncate">
              <PlayerLink name={e.other} shard={shard} className="text-fg" />{" "}
              <span className="font-mono text-fg-subtle">{getItemName(e.weapon)}</span>
              {e.distance > 0 && (
                <span className="ml-1 font-mono text-fg-subtle">
                  · {Math.round(e.distance / 100)}m
                </span>
              )}
              {e.isHeadshot && (
                <Badge tone="combat" className="ml-1">
                  HS
                </Badge>
              )}
            </span>
            <span
              className={`font-mono tabular-nums ${
                e.kind === "damage-dealt" || e.kind === "kill"
                  ? "text-success"
                  : e.kind === "damage-taken" || e.kind === "death"
                  ? "text-combat"
                  : "text-fg-muted"
              }`}
            >
              {e.amount > 0 ? (e.kind === "damage-dealt" ? `+${Math.round(e.amount)}` : `−${Math.round(e.amount)}`) : "•"}
            </span>
          </li>
        ))}
      </ol>
      {summary.entries.length > meaningful.length && (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          {t("showingFirstN", { count: meaningful.length, total: summary.entries.length })}
        </p>
      )}
    </Card>
  );
}

function KindBadge({
  kind,
  t,
}: {
  kind: "damage-dealt" | "damage-taken" | "knock-given" | "knock-taken" | "kill" | "death";
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const map = {
    "damage-dealt": { label: t("kindDamageDealt"), tone: "success" as const },
    "damage-taken": { label: t("kindDamageTaken"), tone: "combat" as const },
    "knock-given": { label: t("kindKnockGiven"), tone: "brand" as const },
    "knock-taken": { label: t("kindKnockTaken"), tone: "muted" as const },
    kill: { label: t("kindKill"), tone: "combat" as const },
    death: { label: t("kindDeath"), tone: "muted" as const },
  };
  const it = map[kind];
  return <Badge tone={it.tone}>{it.label}</Badge>;
}
