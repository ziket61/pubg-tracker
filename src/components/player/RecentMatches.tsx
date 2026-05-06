import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import type { Shard } from "@/lib/pubg/shards";
import { getPlayerRecentMatches, type MatchWithMaybeStats } from "@/lib/pubg/recent-data";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Link } from "@/lib/i18n/navigation";
import { MatchRow } from "./MatchRow";

export async function RecentMatches(props: {
  locale: Locale;
  shard: Shard;
  accountId: string;
  matchIds: string[];
  limit?: number;
  showAll?: boolean;
  preloaded?: MatchWithMaybeStats[];
}) {
  const { locale, shard, accountId, matchIds, showAll } = props;
  const limit = props.limit ?? 6;
  const t = await getTranslations({ locale, namespace: "player" });
  const tc = await getTranslations({ locale, namespace: "common" });

  if (!matchIds.length) {
    return (
      <Card>
        <CardHeader title={t("lastMatches")} />
        <EmptyState title={t("noMatches")} />
      </Card>
    );
  }

  const data: MatchWithMaybeStats[] = props.preloaded
    ? props.preloaded.slice(0, limit)
    : await getPlayerRecentMatches(shard, accountId, matchIds, limit);

  return (
    <Card>
      <CardHeader
        title={t("lastMatches")}
        right={
          !showAll && matchIds.length > limit ? (
            <Link
              href={`/players/${shard}/${encodeURIComponent(accountId)}/matches`}
              className="text-xs text-fg-muted hover:text-brand"
            >
              {tc("viewAll")} →
            </Link>
          ) : null
        }
      />
      {data.length === 0 ? (
        <EmptyState title={t("noMatches")} />
      ) : (
        <ul className="space-y-2">
          {data.map((d) => (
            <li key={d.match.id}>
              <MatchRow
                locale={locale}
                match={d.match}
                participantStats={d.stats}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
