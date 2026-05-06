import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import type { MatchDetails } from "@/lib/pubg/types";
import { extractHighlights } from "@/lib/pubg/telemetry";
import { getTelemetry } from "@/lib/pubg/client";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { getItemName } from "@/lib/assets/names";
import { Link } from "@/lib/i18n/navigation";
import { formatNumber } from "@/lib/format/numbers";
import { Badge } from "@/components/ui/Badge";

export async function MatchHighlights({
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
        <CardHeader title={t("highlights")} />
        <EmptyState title={t("telemetryUnavailable")} />
      </Card>
    );
  }

  const events = await getTelemetry(match.telemetryUrl);
  const h = extractHighlights(events);

  // Top damage / kills from participants (no telemetry needed)
  const topKills = [...match.participants].sort(
    (a, b) => b.stats.kills - a.stats.kills,
  )[0];
  const topDamage = [...match.participants].sort(
    (a, b) => b.stats.damageDealt - a.stats.damageDealt,
  )[0];

  return (
    <Card>
      <CardHeader title={t("highlights")} />
      <div className="grid gap-3 sm:grid-cols-3">
        {h.longestKill && (
          <div className="rounded-lg border border-border bg-bg-muted p-3">
            <div className="text-xs uppercase tracking-wide text-fg-subtle">
              {t("longestKill")}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <ItemIcon
                itemId={h.longestKill.weapon}
                size={32}
                alt={getItemName(h.longestKill.weapon)}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-lg font-semibold text-brand">
                  {h.longestKill.distanceMeters} m
                </div>
                <div className="truncate text-xs text-fg-muted">
                  <Link
                    href={`/players/${match.shardId}/${encodeURIComponent(h.longestKill.killerName)}`}
                    className="hover:text-brand"
                  >
                    {h.longestKill.killerName}
                  </Link>
                  {" → "}
                  <span className="text-fg-subtle">{h.longestKill.victimName}</span>
                </div>
                <div className="text-xs text-fg-subtle">
                  {getItemName(h.longestKill.weapon)}
                  {h.longestKill.isHeadshot && (
                    <Badge tone="brand" className="ml-2">HS</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {topKills && (
          <div className="rounded-lg border border-border bg-bg-muted p-3">
            <div className="text-xs uppercase tracking-wide text-fg-subtle">
              {t("topKills")}
            </div>
            <div className="mt-2">
              <div className="font-mono text-lg font-semibold text-brand">
                {formatNumber(topKills.stats.kills, locale)}
              </div>
              <Link
                href={`/players/${match.shardId}/${encodeURIComponent(topKills.stats.name)}`}
                className="text-xs text-fg-muted hover:text-brand"
              >
                {topKills.stats.name}
              </Link>
            </div>
          </div>
        )}
        {topDamage && (
          <div className="rounded-lg border border-border bg-bg-muted p-3">
            <div className="text-xs uppercase tracking-wide text-fg-subtle">
              {t("topDamage")}
            </div>
            <div className="mt-2">
              <div className="font-mono text-lg font-semibold text-brand">
                {formatNumber(topDamage.stats.damageDealt, locale, { maximumFractionDigits: 0 })}
              </div>
              <Link
                href={`/players/${match.shardId}/${encodeURIComponent(topDamage.stats.name)}`}
                className="text-xs text-fg-muted hover:text-brand"
              >
                {topDamage.stats.name}
              </Link>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
