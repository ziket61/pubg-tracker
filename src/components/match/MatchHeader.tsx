import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import type { MatchDetails } from "@/lib/pubg/types";
import { MapBadge } from "./MapBadge";
import { Badge } from "@/components/ui/Badge";
import { formatDuration } from "@/lib/format/duration";
import { formatDateTime } from "@/lib/format/dates";

export async function MatchHeader({
  locale,
  match,
}: {
  locale: Locale;
  match: MatchDetails;
}) {
  const tm = await getTranslations({ locale, namespace: "modes" });
  const tmatch = await getTranslations({ locale, namespace: "match" });

  return (
    <header className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-gradient-to-br from-surface to-bg-muted p-5">
      <MapBadge mapName={match.mapName} />
      <Badge tone="brand">{tm(match.gameMode)}</Badge>
      {match.isCustomMatch && <Badge tone="muted">CUSTOM</Badge>}
      <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-fg-muted">
        <span>
          {tmatch("duration")}: <span className="font-mono text-fg">{formatDuration(match.duration)}</span>
        </span>
        <span>
          {tmatch("createdAt")}: <span className="text-fg">{formatDateTime(match.createdAt, locale)}</span>
        </span>
      </div>
    </header>
  );
}
