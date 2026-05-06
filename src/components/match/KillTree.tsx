import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import type { MatchDetails } from "@/lib/pubg/types";
import { getTelemetry } from "@/lib/pubg/client";
import { parseTelemetry } from "@/lib/pubg/telemetry/parser";
import { buildKillTree } from "@/lib/pubg/telemetry/kill-tree";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { getItemName } from "@/lib/assets/names";
import { formatDuration } from "@/lib/format/duration";

export async function KillTree({
  locale,
  match,
}: {
  locale: Locale;
  match: MatchDetails;
}) {
  const t = await getTranslations({ locale, namespace: "match" });
  const tc = await getTranslations({ locale, namespace: "common" });

  if (!match.telemetryUrl) {
    return (
      <Card>
        <CardHeader title={t("killTree")} accent="combat" />
        <EmptyState title={t("telemetryUnavailable")} />
      </Card>
    );
  }

  const raw = await getTelemetry(match.telemetryUrl);
  if (!raw.length) {
    return (
      <Card>
        <CardHeader title={t("killTree")} accent="combat" />
        <EmptyState title={t("telemetryUnavailable")} />
      </Card>
    );
  }

  const scene = parseTelemetry(raw, match.mapName);
  const tree = buildKillTree(scene);

  if (!tree.length) {
    return (
      <Card>
        <CardHeader title={t("killTree")} accent="combat" />
        <EmptyState title={tc("noData")} />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title={t("killTree")} accent="combat" />
      <div className="space-y-4">
        {tree.map((team) => (
          <div key={team.teamId} className="rounded-lg border border-border bg-bg-muted p-3">
            <div className="mb-2 flex items-center gap-2">
              <Badge tone={team.teamId === -1 ? "muted" : "default"}>
                {team.teamId === -1 ? "—" : `${t("team")} ${team.teamId}`}
              </Badge>
              <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                {team.victims.length} {t("eliminations")}
              </span>
            </div>
            <ol className="space-y-1.5">
              {team.victims.map((v) => (
                <li
                  key={`${v.victim.accountId}-${v.killedAt}`}
                  className="grid grid-cols-[60px_1fr_auto] items-center gap-3 rounded-md bg-bg/40 px-2.5 py-1.5 text-sm"
                >
                  <span className="font-mono text-[11px] tabular-nums text-fg-subtle">
                    {v.killedAt != null ? formatDuration(v.killedAt) : "—"}
                  </span>
                  <span className="truncate">
                    {v.knockedBy && v.knockedBy.accountId !== v.killedBy?.accountId && (
                      <>
                        <span className="text-fg-muted">{v.knockedBy.name}</span>
                        <span className="mx-1.5 text-fg-subtle">{t("knockedShort")}</span>
                      </>
                    )}
                    <span className="text-combat">{v.killedBy?.name ?? "—"}</span>
                    <span className="mx-1.5 text-fg-subtle">→</span>
                    <span className="font-medium text-fg">{v.victim.name}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-right">
                    {v.isHeadshot && <Badge tone="combat">HS</Badge>}
                    <span className="font-mono text-[11px] text-fg-muted">
                      {getItemName(v.weapon)}
                    </span>
                    {v.distance > 0 && (
                      <span className="font-mono text-[11px] tabular-nums text-fg-subtle">
                        {Math.round(v.distance / 100)}m
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </Card>
  );
}
