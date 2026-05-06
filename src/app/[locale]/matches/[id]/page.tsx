import { Suspense } from "react";
import { headers } from "next/headers";
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
import { KillTree } from "@/components/match/KillTree";
import { DeathAnalysis } from "@/components/match/DeathAnalysis";
import { DamageTimeline } from "@/components/match/DamageTimeline";
import { MiniReplayMap } from "@/components/match/MiniReplayMap";
import { WeaponBreakdown } from "@/components/match/WeaponBreakdown";
import { CarePackageTracker } from "@/components/match/CarePackageTracker";
import { LootTimeline } from "@/components/match/LootTimeline";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ExternalLinks } from "@/components/common/ExternalLinks";
import { Link } from "@/lib/i18n/navigation";
import { ownMatchUrl, ownReplayUrl, pubgReportLinks } from "@/lib/external-links";

export default async function MatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; id: string }>;
  searchParams: Promise<{ shard?: string; player?: string }>;
}) {
  const { locale, id } = await params;
  const { shard: shardParam, player: focusPlayer } = await searchParams;
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

  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const origin = `${proto}://${host}`;
  const matchUrl = ownMatchUrl({ origin, locale, matchId: id, shard });
  const replayUrl = ownReplayUrl({ origin, locale, matchId: id, shard });
  const pr = pubgReportLinks({ matchId: id });

  return (
    <div className="space-y-5">
      <MatchHeader locale={locale} match={match} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/matches/${id}/replay?shard=${shard}` as `/matches/${string}/replay`}
          className="inline-flex items-center gap-2 rounded-lg border border-brand-dim/60 bg-brand/10 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-brand transition-all hover:bg-brand/20 hover:shadow-glow-sm"
        >
          <ReplayIcon /> {t("openReplay")}
        </Link>
        <ExternalLinks
          locale={locale}
          copyValue={matchUrl}
          links={[
            { href: replayUrl, label: t("openReplay"), external: false },
            ...(pr.match ? [{ href: pr.match, label: "PUBG Report", external: true }] : []),
          ]}
        />
      </div>

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

      {focusPlayer && (() => {
        const focusParticipant = match.participants.find(
          (p) =>
            p.stats.name.toLowerCase() === focusPlayer.toLowerCase() ||
            p.stats.playerId === focusPlayer,
        );
        if (!focusParticipant) return null;
        return (
          <>
            <Suspense
              fallback={
                <Card>
                  <CardHeader title={t("deathAnalysis")} />
                  <Skeleton className="h-32 w-full" />
                </Card>
              }
            >
              <DeathAnalysis
                locale={locale}
                match={match}
                accountId={focusParticipant.stats.playerId}
              />
            </Suspense>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Suspense
                fallback={
                  <Card>
                    <CardHeader title={t("liveMap")} />
                    <Skeleton className="aspect-square w-full" />
                  </Card>
                }
              >
                <MiniReplayMap
                  locale={locale}
                  match={match}
                  shard={shard}
                  accountId={focusParticipant.stats.playerId}
                />
              </Suspense>
              <Suspense
                fallback={
                  <Card>
                    <CardHeader title={t("weaponBreakdown")} />
                    <Skeleton className="h-72 w-full" />
                  </Card>
                }
              >
                <WeaponBreakdown
                  locale={locale}
                  match={match}
                  accountId={focusParticipant.stats.playerId}
                />
              </Suspense>
            </div>
            <Suspense
              fallback={
                <Card>
                  <CardHeader title={t("damageTimeline")} />
                  <Skeleton className="h-48 w-full" />
                </Card>
              }
            >
              <DamageTimeline
                locale={locale}
                match={match}
                accountId={focusParticipant.stats.playerId}
              />
            </Suspense>
            <Suspense
              fallback={
                <Card>
                  <CardHeader title={t("lootTimeline")} />
                  <Skeleton className="h-48 w-full" />
                </Card>
              }
            >
              <LootTimeline
                locale={locale}
                match={match}
                accountId={focusParticipant.stats.playerId}
              />
            </Suspense>
          </>
        );
      })()}

      <Suspense
        fallback={
          <Card>
            <CardHeader title={t("killTree")} />
            <Skeleton className="h-48 w-full" />
          </Card>
        }
      >
        <KillTree locale={locale} match={match} />
      </Suspense>

      <Suspense
        fallback={
          <Card>
            <CardHeader title={t("carePackages")} />
            <Skeleton className="h-72 w-full" />
          </Card>
        }
      >
        <CarePackageTracker locale={locale} match={match} shard={shard} />
      </Suspense>

      <Card>
        <CardHeader title={t("roster")} />
        <MatchRoster locale={locale} match={match} />
      </Card>
    </div>
  );
}

function ReplayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="3 2 11 7 3 12" fill="currentColor" />
    </svg>
  );
}
