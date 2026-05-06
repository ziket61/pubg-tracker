import { Suspense } from "react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { isShard } from "@/lib/pubg/shards";
import { searchPlayersByName } from "@/lib/pubg/client";
import { NotFoundError } from "@/lib/pubg/errors";
import { PlayerHeader } from "@/components/player/PlayerHeader";
import { PlayerTabs } from "@/components/player/PlayerTabs";
import { RecentMatches } from "@/components/player/RecentMatches";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

// Cap at 6 — leaves headroom under the 10 RPM rate-limit bucket so a few
// concurrent requests (player search, this page, stale revalidations) never
// exhaust tokens and force a 60s queue wait that would blow past Vercel's
// serverless function timeout. The user's complaint #14 ("matches либо не
// работают, либо очень долго грузят") was traced to that exhaustion.
const MAX_MATCHES = 6;

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
      <Suspense
        fallback={
          <Card>
            <CardHeader title="…" />
            <Skeleton className="h-64 w-full" />
          </Card>
        }
      >
        <RecentMatches
          locale={locale}
          shard={platform}
          accountId={player.id}
          matchIds={player.matchIds}
          limit={MAX_MATCHES}
          showAll
        />
      </Suspense>
    </div>
  );
}
