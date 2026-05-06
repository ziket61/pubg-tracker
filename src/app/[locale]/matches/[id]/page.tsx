import { Suspense } from "react";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { env } from "@/lib/env";
import { isShard, type Shard } from "@/lib/pubg/shards";
import { getMatch } from "@/lib/pubg/client";
import { NotFoundError } from "@/lib/pubg/errors";
import { MatchHeader } from "@/components/match/MatchHeader";
import { MatchRoster } from "@/components/match/MatchRoster";
import { MatchHighlights } from "@/components/match/MatchHighlights";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default async function MatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; id: string }>;
  searchParams: Promise<{ shard?: string }>;
}) {
  const { locale, id } = await params;
  const { shard: shardParam } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "match" });

  const shard: Shard =
    shardParam && isShard(shardParam) ? shardParam : env.PUBG_DEFAULT_SHARD;

  let match;
  try {
    match = await getMatch(shard, id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  return (
    <div className="space-y-5">
      <MatchHeader locale={locale} match={match} />

      <Suspense
        fallback={
          <Card>
            <CardHeader title={t("highlights")} />
            <Skeleton className="h-32 w-full" />
          </Card>
        }
      >
        <MatchHighlights locale={locale} match={match} />
      </Suspense>

      <Card>
        <CardHeader title={t("roster")} />
        <MatchRoster locale={locale} match={match} />
      </Card>
    </div>
  );
}
