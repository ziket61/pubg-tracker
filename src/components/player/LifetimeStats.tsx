import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { getPlayerLifetimeStats } from "@/lib/pubg/client";
import { aggregateLifetime } from "@/lib/pubg/stats";
import type { Shard } from "@/lib/pubg/shards";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatsBlock } from "./StatsBlock";
import { EmptyState } from "@/components/ui/EmptyState";
import { AnomalyBadges } from "./AnomalyBadges";

export async function LifetimeStats({
  locale,
  shard,
  accountId,
}: {
  locale: Locale;
  shard: Shard;
  accountId: string;
}) {
  const t = await getTranslations({ locale, namespace: "player" });
  const tc = await getTranslations({ locale, namespace: "common" });

  try {
    const data = await getPlayerLifetimeStats(shard, accountId);
    const total = aggregateLifetime(data.gameModes);
    if (!total.roundsPlayed) {
      return (
        <Card>
          <CardHeader title={t("lifetime")} />
          <EmptyState title={tc("noData")} />
        </Card>
      );
    }
    return (
      <Card>
        <CardHeader title={t("lifetime")} />
        <div className="space-y-4">
          <AnomalyBadges locale={locale} stats={total} />
          <StatsBlock locale={locale} stats={total} />
        </div>
      </Card>
    );
  } catch {
    return (
      <Card>
        <CardHeader title={t("lifetime")} />
        <EmptyState title={tc("noData")} />
      </Card>
    );
  }
}
