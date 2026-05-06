import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import type { MatchDetails, Shard } from "@/lib/pubg/types";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ChickenDinnerIcon } from "@/components/icons/GameIcons";
import { PlayerLink } from "@/components/common/PlayerLink";
import { formatNumber } from "@/lib/format/numbers";
import { formatDuration } from "@/lib/format/duration";

function placementBadge(rank: number) {
  if (rank === 1) {
    return (
      <Badge tone="tierGold">
        <ChickenDinnerIcon size={12} />
        #1
      </Badge>
    );
  }
  if (rank === 2) return <Badge tone="tierSilver">#2</Badge>;
  if (rank === 3) return <Badge tone="tierBronze">#3</Badge>;
  if (rank > 0 && rank <= 10) return <Badge tone="brand">#{rank}</Badge>;
  return <Badge tone="muted">#{rank}</Badge>;
}

export async function TeamCard({
  locale,
  match,
  shard,
  focusAccountId,
}: {
  locale: Locale;
  match: MatchDetails;
  shard: Shard;
  focusAccountId: string;
}) {
  const t = await getTranslations({ locale, namespace: "match" });
  const ts = await getTranslations({ locale, namespace: "stats" });

  const focusParticipantId = match.participants.find(
    (p) => p.stats.playerId === focusAccountId,
  )?.id;
  if (!focusParticipantId) return null;

  const myRoster = match.rosters.find((r) =>
    r.participantIds.includes(focusParticipantId),
  );
  if (!myRoster) return null;

  const teammates = myRoster.participantIds
    .map((pid) => match.participants.find((p) => p.id === pid))
    .filter((p): p is NonNullable<typeof p> => p !== undefined)
    .sort((a, b) => b.stats.kills - a.stats.kills);

  return (
    <Card variant="raised">
      <CardHeader
        title={t("myTeam")}
        accent="brand"
        right={placementBadge(myRoster.rank)}
      />
      <ul className="space-y-2">
        {teammates.map((p) => {
          const isMe = p.stats.playerId === focusAccountId;
          return (
            <li
              key={p.id}
              className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-lg border bg-bg-muted px-3 py-2.5 text-sm ${
                isMe ? "border-brand/60 bg-brand/[0.05]" : "border-border"
              }`}
            >
              <div className="min-w-0 truncate">
                <span className="inline-flex items-center gap-1.5">
                  <PlayerLink
                    name={p.stats.name}
                    shard={shard}
                    className="font-display text-base font-semibold text-fg"
                  />
                  {isMe && (
                    <Badge tone="brand" className="text-[9px]">
                      {t("youMarker")}
                    </Badge>
                  )}
                  {p.stats.deathType && p.stats.deathType !== "alive" && (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                      {p.stats.deathType}
                    </span>
                  )}
                </span>
              </div>
              <span className="font-mono text-xs tabular-nums text-combat" title={ts("kills")}>
                {p.stats.kills}K
              </span>
              <span className="font-mono text-xs tabular-nums text-accent" title={ts("avgDamage")}>
                {formatNumber(p.stats.damageDealt, locale, { maximumFractionDigits: 0 })}
              </span>
              <span className="font-mono text-xs tabular-nums text-fg-subtle" title={ts("timeSurvived")}>
                {formatDuration(p.stats.timeSurvived)}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
