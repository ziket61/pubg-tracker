import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import type { PlayerSummary } from "@/lib/pubg/types";
import { PlatformIcon } from "@/components/icons/PlatformIcon";
import { Badge } from "@/components/ui/Badge";
import { HelmetIcon } from "@/components/icons/GameIcons";
import { Link } from "@/lib/i18n/navigation";

export async function PlayerHeader({
  locale,
  player,
}: {
  locale: Locale;
  player: PlayerSummary;
}) {
  const t = await getTranslations({ locale, namespace: "player" });
  const tp = await getTranslations({ locale, namespace: "platforms" });

  return (
    <header className="surface-raised flex flex-wrap items-center gap-4 rounded-2xl border border-border-strong p-5 sm:p-6">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-xl border border-brand/40 bg-bg/80">
        <HelmetIcon size={28} className="absolute text-brand-dim opacity-30" />
        <span className="relative font-display text-2xl font-bold uppercase text-brand">
          {player.name.slice(0, 2)}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-bold text-fg sm:text-3xl">
            {player.name}
          </h1>
          {player.bannedTypes && player.bannedTypes.length > 0 && (
            <Badge tone="danger">BANNED</Badge>
          )}
          {player.clanId && (
            <Link
              href={`/clans/${player.shardId}/${player.clanId}` as `/clans/${string}`}
              className="transition-colors"
            >
              <Badge tone="brand" className="hover:border-brand">
                CLAN ↗
              </Badge>
            </Link>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <PlatformIcon platform={player.shardId} />
            <span className="font-mono uppercase tracking-wider">
              {tp(player.shardId)}
            </span>
          </span>
          <span className="text-fg-subtle">·</span>
          <span className="font-mono text-[11px] text-fg-subtle truncate max-w-xs" title={player.id}>
            {player.id}
          </span>
        </div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">
          {t("title")}
        </div>
      </div>
    </header>
  );
}
