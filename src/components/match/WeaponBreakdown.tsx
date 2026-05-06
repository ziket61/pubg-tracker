import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import type { MatchDetails } from "@/lib/pubg/types";
import { getTelemetry } from "@/lib/pubg/client";
import { parseTelemetry } from "@/lib/pubg/telemetry/parser";
import { buildWeaponBreakdown } from "@/lib/pubg/telemetry/weapon-analytics";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { getItemName } from "@/lib/assets/names";

export async function WeaponBreakdown({
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
        <CardHeader title={t("weaponBreakdown")} accent="combat" />
        <EmptyState title={t("telemetryUnavailable")} />
      </Card>
    );
  }

  const raw = await getTelemetry(match.telemetryUrl);
  if (!raw.length) {
    return (
      <Card>
        <CardHeader title={t("weaponBreakdown")} accent="combat" />
        <EmptyState title={t("telemetryUnavailable")} />
      </Card>
    );
  }

  const scene = parseTelemetry(raw, match.mapName);
  const rows = buildWeaponBreakdown(scene, accountId).filter((r) => r.damage > 0 || r.kills > 0);

  if (!rows.length) {
    return (
      <Card>
        <CardHeader title={t("weaponBreakdown")} accent="combat" />
        <EmptyState title={tc("noData")} />
      </Card>
    );
  }

  const maxDamage = rows.reduce((m, r) => Math.max(m, r.damage), 0) || 1;

  return (
    <Card>
      <CardHeader title={t("weaponBreakdown")} accent="combat" />
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.weapon} className="rounded-md bg-bg-muted/40 px-3 py-2">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-fg">{getItemName(r.weapon)}</span>
              <span className="flex items-center gap-1.5">
                {r.kills > 0 && <Badge tone="combat">{r.kills}K</Badge>}
                {r.knocks > 0 && <Badge tone="brand">{r.knocks}KO</Badge>}
                {r.headshots > 0 && <Badge tone="combat">{r.headshots}HS</Badge>}
                {r.longestKill > 0 && (
                  <span className="font-mono text-[10px] tabular-nums text-fg-subtle">
                    {Math.round(r.longestKill / 100)}m
                  </span>
                )}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-bg-subtle">
                <div
                  className="h-full rounded-full bg-combat"
                  style={{ width: `${(r.damage / maxDamage) * 100}%` }}
                />
              </div>
              <span className="font-mono text-xs tabular-nums text-fg">
                {Math.round(r.damage)} DMG
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
