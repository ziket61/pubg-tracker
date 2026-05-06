import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import type { MatchDetails } from "@/lib/pubg/types";
import { getTelemetry } from "@/lib/pubg/client";
import { parseTelemetry } from "@/lib/pubg/telemetry/parser";
import { analyzeDeath } from "@/lib/pubg/telemetry/death-analysis";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { getItemName } from "@/lib/assets/names";
import { formatDuration } from "@/lib/format/duration";

export async function DeathAnalysis({
  locale,
  match,
  accountId,
}: {
  locale: Locale;
  match: MatchDetails;
  accountId: string;
}) {
  const t = await getTranslations({ locale, namespace: "match" });
  const tc = await getTranslations({ locale, namespace: "common" });

  if (!match.telemetryUrl) {
    return (
      <Card>
        <CardHeader title={t("deathAnalysis")} accent="combat" />
        <EmptyState title={t("telemetryUnavailable")} />
      </Card>
    );
  }

  const raw = await getTelemetry(match.telemetryUrl);
  if (!raw.length) {
    return (
      <Card>
        <CardHeader title={t("deathAnalysis")} accent="combat" />
        <EmptyState title={t("telemetryUnavailable")} />
      </Card>
    );
  }

  const scene = parseTelemetry(raw, match.mapName);
  const report = analyzeDeath(scene, accountId);

  if (!report) {
    return (
      <Card>
        <CardHeader title={t("deathAnalysis")} accent="combat" />
        <EmptyState title={t("survived")} />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title={t("deathAnalysis")} accent="combat" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-combat/30 bg-combat/[0.06] p-4">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-combat/80">
            {t("killedBy")}
          </div>
          <div className="mt-2 font-display text-xl font-bold text-fg">
            {report.killer?.name ?? "—"}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
            <span className="font-mono">{getItemName(report.weapon)}</span>
            {report.distance > 0 && (
              <span className="font-mono tabular-nums">
                · {Math.round(report.distance / 100)}m
              </span>
            )}
            {report.isHeadshot && <Badge tone="combat">HS</Badge>}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-bg-muted p-4">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">
            {t("survived")}
          </div>
          <div className="mt-2 font-display text-xl font-bold text-fg tabular-nums">
            {formatDuration(report.survivedSec)}
          </div>
          <div className="mt-1 text-xs text-fg-muted">
            {t("totalDamageTaken")}: {Math.round(report.totalDamageTaken)} HP
          </div>
        </div>
      </div>

      {report.knock && report.knock.attacker?.accountId !== report.killer?.accountId && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-border bg-bg-muted px-3 py-2 text-xs text-fg-muted">
          <Badge tone="muted">{t("knocked")}</Badge>
          <span>
            {report.knock.attacker?.name ?? "—"} ·{" "}
            <span className="font-mono">{getItemName(report.knock.weapon)}</span>
            {report.knock.distance > 0 && (
              <span className="font-mono tabular-nums">
                {" "}· {Math.round(report.knock.distance / 100)}m
              </span>
            )}{" "}
            · {formatDuration(report.knock.time)}
          </span>
        </div>
      )}

      {report.damageLeadup.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">
            {t("damageLeadup")}
          </div>
          <ul className="space-y-1">
            {report.damageLeadup.map((d, idx) => (
              <li
                key={idx}
                className="grid grid-cols-[60px_1fr_auto] items-center gap-3 rounded-md bg-bg/40 px-2.5 py-1 text-xs"
              >
                <span className="font-mono tabular-nums text-fg-subtle">
                  {formatDuration(d.time)}
                </span>
                <span className="truncate">
                  <span className="text-combat">{d.attacker?.name ?? tc("unknown")}</span>{" "}
                  <span className="font-mono text-fg-muted">{getItemName(d.weapon)}</span>
                </span>
                <span className="font-mono tabular-nums text-combat">
                  −{Math.round(d.damage)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
