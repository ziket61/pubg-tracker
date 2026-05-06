import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { isShard } from "@/lib/pubg/shards";
import { searchPlayersByName } from "@/lib/pubg/client";
import { NotFoundError } from "@/lib/pubg/errors";
import { PlayerHeader } from "@/components/player/PlayerHeader";
import { PlayerTabs } from "@/components/player/PlayerTabs";
import { RecentMatches } from "@/components/player/RecentMatches";

export default async function PlayerMatchesPage({
  params,
}: {
  params: Promise<{ locale: Locale; platform: string; name: string }>;
}) {
  const { locale, platform, name } = await params;
  setRequestLocale(locale);
  if (!isShard(platform)) notFound();
  const decoded = decodeURIComponent(name);

  let player;
  try {
    const players = await searchPlayersByName(platform, [decoded]);
    if (!players.length) notFound();
    player = players[0]!;
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  return (
    <div className="space-y-5">
      <PlayerHeader locale={locale} player={player} />
      <PlayerTabs locale={locale} shard={platform} name={decoded} active="matches" />
      <RecentMatches
        locale={locale}
        shard={platform}
        accountId={player.id}
        matchIds={player.matchIds}
        limit={20}
        showAll
      />
    </div>
  );
}
