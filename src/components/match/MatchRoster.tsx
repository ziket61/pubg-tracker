import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import type { MatchDetails, ParticipantStats } from "@/lib/pubg/types";
import { Link } from "@/lib/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { formatNumber, formatDistanceMeters } from "@/lib/format/numbers";
import { formatDuration } from "@/lib/format/duration";

export async function MatchRoster({
  locale,
  match,
}: {
  locale: Locale;
  match: MatchDetails;
}) {
  const t = await getTranslations({ locale, namespace: "match" });
  const ts = await getTranslations({ locale, namespace: "stats" });

  const participantsById = new Map(match.participants.map((p) => [p.id, p.stats]));

  const sortedRosters = [...match.rosters].sort((a, b) => a.rank - b.rank);

  return (
    <div className="space-y-3">
      {sortedRosters.map((r) => {
        const team = r.participantIds
          .map((id) => participantsById.get(id))
          .filter((s): s is ParticipantStats => s !== undefined);
        return (
          <div
            key={r.id}
            className={`overflow-x-auto rounded-xl border bg-surface ${
              r.won ? "border-brand/60" : "border-border"
            }`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-border bg-bg-muted px-3 py-2">
              <div className="flex items-center gap-2">
                <Badge tone={r.won ? "brand" : r.rank <= 3 ? "default" : "muted"}>
                  #{r.rank}
                </Badge>
                <span className="text-xs text-fg-muted">Team {r.teamId}</span>
                {r.won && <span className="text-xs font-semibold text-brand">{t("winner")}</span>}
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-fg-subtle">
                <tr>
                  <th className="px-3 py-2">{t("roster")}</th>
                  <th className="px-3 py-2 text-right">{ts("kills")}</th>
                  <th className="px-3 py-2 text-right">{ts("damage")}</th>
                  <th className="px-3 py-2 text-right">{ts("longestKill")}</th>
                  <th className="px-3 py-2 text-right">{ts("timeSurvived")}</th>
                </tr>
              </thead>
              <tbody>
                {team.map((p) => (
                  <tr
                    key={p.playerId + p.name}
                    className="border-t border-border/60 hover:bg-surface-hover"
                  >
                    <td className="px-3 py-2">
                      <Link
                        href={`/players/${match.shardId}/${encodeURIComponent(p.name)}`}
                        className="font-medium hover:text-brand"
                      >
                        {p.name}
                      </Link>
                      {p.deathType !== "alive" && (
                        <span className="ml-2 text-xs text-fg-subtle">{p.deathType}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {formatNumber(p.kills, locale)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {formatNumber(p.damageDealt, locale, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {formatDistanceMeters(p.longestKill, locale)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {formatDuration(p.timeSurvived)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
