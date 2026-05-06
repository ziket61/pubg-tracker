import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import type { MatchDetails, ParticipantStats } from "@/lib/pubg/types";
import { Badge } from "@/components/ui/Badge";
import { ChickenDinnerIcon } from "@/components/icons/GameIcons";
import { getMapName } from "@/lib/assets/names";
import { formatDuration } from "@/lib/format/duration";
import { relativeTime } from "@/lib/format/dates";
import { formatNumber } from "@/lib/format/numbers";

function placementBadge(place: number) {
  if (place === 1) {
    return (
      <Badge tone="tierGold" className="text-sm">
        <ChickenDinnerIcon size={12} />
        #1
      </Badge>
    );
  }
  if (place === 2) {
    return (
      <Badge tone="tierSilver" className="text-sm">
        #{place}
      </Badge>
    );
  }
  if (place === 3) {
    return (
      <Badge tone="tierBronze" className="text-sm">
        #{place}
      </Badge>
    );
  }
  if (place > 0 && place <= 10) {
    return <Badge tone="brand">#{place}</Badge>;
  }
  if (place > 0) {
    return <Badge tone="muted">#{place}</Badge>;
  }
  return <Badge tone="muted">—</Badge>;
}

export async function MatchRow({
  locale,
  match,
  participantStats,
}: {
  locale: Locale;
  match: MatchDetails;
  participantStats: ParticipantStats | null;
}) {
  const tm = await getTranslations({ locale, namespace: "modes" });
  const ts = await getTranslations({ locale, namespace: "stats" });

  const place = participantStats?.winPlace ?? 0;
  const won = place === 1;

  return (
    <Link
      href={`/matches/${match.id}`}
      className={`group flex flex-wrap items-center gap-3 rounded-lg border bg-bg-muted px-3 py-3 transition-all hover:bg-surface-hover ${
        won
          ? "border-tier-gold/40 hover:border-tier-gold/60 hover:shadow-[0_0_12px_-2px_rgba(251,191,36,0.3)]"
          : "border-border hover:border-border-strong"
      }`}
    >
      <div className="flex min-w-[60px] justify-center">{placementBadge(place)}</div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-display text-base font-semibold text-fg group-hover:text-brand">
            {getMapName(match.mapName)}
          </span>
          <Badge tone="muted">{tm(match.gameMode)}</Badge>
        </div>
        <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          {relativeTime(match.createdAt, locale)} · {formatDuration(match.duration)}
        </div>
      </div>

      {participantStats && (
        <div className="flex gap-5 text-right">
          <Stat
            label={ts("kills")}
            value={formatNumber(participantStats.kills, locale)}
            tone="combat"
          />
          <Stat
            label={ts("damage")}
            value={formatNumber(participantStats.damageDealt, locale, { maximumFractionDigits: 0 })}
            tone="accent"
          />
        </div>
      )}
    </Link>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "combat" | "accent" | "default";
}) {
  const cls =
    tone === "combat"
      ? "text-combat"
      : tone === "accent"
      ? "text-accent"
      : "text-fg";
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
        {label}
      </div>
      <div className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${cls}`}>
        {value}
      </div>
    </div>
  );
}
