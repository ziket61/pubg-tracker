import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { getMatch } from "@/lib/pubg/client";
import type { Shard } from "@/lib/pubg/shards";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Link } from "@/lib/i18n/navigation";
import { MatchRow } from "./MatchRow";

export async function RecentMatches({
  locale,
  shard,
  accountId,
  matchIds,
  limit = 6,
  showAll,
}: {
  locale: Locale;
  shard: Shard;
  accountId: string;
  matchIds: string[];
  limit?: number;
  showAll?: boolean;
}) {
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

  const ids = matchIds.slice(0, limit);

  // Fetch matches in parallel — proxy already throttles via the rate-limit guard.
  const settled = await Promise.allSettled(ids.map((id) => getMatch(shard, id)));
  const matches = settled
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((m): m is NonNullable<typeof m> => m !== null);

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
      {matches.length === 0 ? (
        <EmptyState title={t("noMatches")} />
      ) : (
        <ul className="space-y-2">
          {matches.map((m) => {
            const participant = m.participants.find(
              (p) => p.stats.playerId === accountId,
            );
            return (
              <li key={m.id}>
                <MatchRow
                  locale={locale}
                  match={m}
                  participantStats={participant?.stats ?? null}
                />
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
