import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import type { Shard } from "@/lib/pubg/shards";
import type { MatchWithMaybeStats } from "@/lib/pubg/recent-data";
import { getPlayerRecentMatches } from "@/lib/pubg/recent-data";
import { aggregateForm, pickBestMatch, type MatchWithStats } from "@/lib/pubg/form";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard, StatGrid } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { formatNumber, formatDecimal, formatPercent } from "@/lib/format/numbers";
import { formatDuration } from "@/lib/format/duration";
import { Link } from "@/lib/i18n/navigation";

const DEFAULT_LIMIT = 5;

export async function RecentForm(props: {
  locale: Locale;
  shard: Shard;
  accountId: string;
  matchIds?: string[];
  limit?: number;
  // Optional: pre-fetched data (avoid duplicate API calls when the page already has it)
  preloaded?: MatchWithMaybeStats[];
}) {
  const { locale, accountId } = props;
  const t = await getTranslations({ locale, namespace: "player" });
  const tStats = await getTranslations({ locale, namespace: "stats" });
  const tc = await getTranslations({ locale, namespace: "common" });

  const limit = props.limit ?? DEFAULT_LIMIT;
  const totalAvailable = props.matchIds?.length ?? props.preloaded?.length ?? 0;

  const data: MatchWithMaybeStats[] = props.preloaded
    ? props.preloaded.slice(0, limit)
    : await getPlayerRecentMatches(props.shard, accountId, props.matchIds ?? [], limit);

  const items: MatchWithStats[] = data
    .filter((d): d is MatchWithMaybeStats & { stats: NonNullable<MatchWithMaybeStats["stats"]> } => d.stats !== null)
    .map((d) => ({ match: d.match, stats: d.stats }));

  if (!items.length) {
    return (
      <Card variant="raised">
        <CardHeader title={t("recentFormTitle")} accent="brand" />
        <EmptyState title={t("noMatches")} />
      </Card>
    );
  }

  const form = aggregateForm(items);
  const recentInOrder = [...items].sort(
    (a, b) => new Date(a.match.createdAt).getTime() - new Date(b.match.createdAt).getTime(),
  );

  return (
    <Card variant="raised">
      <CardHeader
        title={t("recentFormTitle")}
        accent="brand"
        right={
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {form.matchCount} {tc("of")} {Math.max(totalAvailable, form.matchCount)}
          </span>
        }
      />

      <StatGrid>
        <StatCard
          label={tStats("kills")}
          value={formatDecimal(form.avgKills, locale, 1)}
          sub={t("avgPerMatch")}
          tone="combat"
        />
        <StatCard
          label={tStats("avgDamage")}
          value={formatNumber(form.avgDamage, locale, { maximumFractionDigits: 0 })}
          sub={t("avgPerMatch")}
          tone="accent"
        />
        <StatCard
          label={t("avgPlace")}
          value={form.avgPlace ? `#${formatDecimal(form.avgPlace, locale, 1)}` : "—"}
          sub={t("bestPlaceShort", { place: form.bestPlacement || 0 })}
          tone={form.avgPlace > 0 && form.avgPlace <= 10 ? "brand" : "default"}
        />
        <StatCard
          label={tStats("top10s")}
          value={`${form.top10Count}`}
          sub={formatPercent(form.top10Rate, locale)}
          tone="brand"
        />
        <StatCard
          label={tStats("wins")}
          value={`${form.winCount}`}
          sub={formatPercent(form.winRate, locale)}
          tone="success"
        />
        <StatCard
          label={t("avgSurvival")}
          value={formatDuration(form.avgSurvivalSec)}
        />
      </StatGrid>

      <div className="mt-5">
        <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">
          {t("placementStrip")}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {recentInOrder.map((it) => {
            const place = it.stats.winPlace;
            return (
              <Link
                key={it.match.id}
                href={`/matches/${it.match.id}`}
                className="group inline-block"
                title={`#${place} · ${it.stats.kills}K · ${Math.round(it.stats.damageDealt)}DMG`}
              >
                <PlacementChip place={place} kills={it.stats.kills} />
              </Link>
            );
          })}
        </div>
      </div>

      <BestMatchTeaser items={items} locale={locale} />
    </Card>
  );
}

function PlacementChip({ place, kills }: { place: number; kills: number }) {
  let tone: "tierGold" | "brand" | "muted" = "muted";
  if (place === 1) tone = "tierGold";
  else if (place > 0 && place <= 10) tone = "brand";
  return (
    <Badge tone={tone} className="min-w-[44px] justify-center transition-transform group-hover:-translate-y-0.5">
      #{place || "?"} · {kills}K
    </Badge>
  );
}

async function BestMatchTeaser({
  items,
  locale,
}: {
  items: MatchWithStats[];
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: "player" });
  const best = pickBestMatch(items, "score");
  if (!best) return null;
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-tier-gold/40 bg-tier-gold/[0.04] px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
        <Badge tone="tierGold">★ {t("bestMatch")}</Badge>
        <span className="font-display text-sm font-bold text-fg">
          {best.stats.kills}K · {Math.round(best.stats.damageDealt)} DMG · #{best.stats.winPlace}
        </span>
      </div>
      <Link
        href={`/matches/${best.match.id}`}
        className="font-mono text-[10px] uppercase tracking-wider text-tier-gold hover:text-brand-hover"
      >
        {t("openMatch")} →
      </Link>
    </div>
  );
}
