import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { env } from "@/lib/env";
import { defaultLeaderboardShard } from "@/lib/pubg/shards";
import { getCurrentSeason, getLeaderboard } from "@/lib/pubg/client";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { SearchHero } from "@/components/search/SearchHero";
import { LeaderboardTable } from "@/components/leaderboards/LeaderboardTable";
import { RecentPlayersWidget } from "@/components/home/RecentPlayersWidget";
import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "home" });
  const tc = await getTranslations({ locale, namespace: "common" });

  return (
    <div className="space-y-8">
      <SearchHero locale={locale} defaultShard={env.PUBG_DEFAULT_SHARD} />

      <RecentPlayersWidget />

      <Card>
        <CardHeader
          title={t("featured")}
          right={
            <Link
              href="/leaderboards"
              className="text-xs text-fg-muted hover:text-brand"
            >
              {tc("viewAll")} →
            </Link>
          }
        />
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <FeaturedLeaderboard locale={locale} />
        </Suspense>
      </Card>
    </div>
  );
}

async function FeaturedLeaderboard({ locale }: { locale: Locale }) {
  try {
    const season = await getCurrentSeason(env.PUBG_DEFAULT_SHARD);
    if (!season) return null;
    // Leaderboards endpoint requires a regional shard, not the player shard.
    const region = defaultLeaderboardShard(env.PUBG_DEFAULT_SHARD);
    const lb = await getLeaderboard(region, season.id, "squad-fpp");
    if (!lb.entries.length) return null;
    return <LeaderboardTable locale={locale} leaderboard={lb} limit={5} compact />;
  } catch {
    return null;
  }
}
