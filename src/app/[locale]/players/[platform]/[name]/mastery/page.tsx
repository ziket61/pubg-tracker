import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { isShard } from "@/lib/pubg/shards";
import {
  getPlayerSurvivalMastery,
  getPlayerWeaponMastery,
  searchPlayersByName,
} from "@/lib/pubg/client";
import { NotFoundError } from "@/lib/pubg/errors";
import { PlayerHeader } from "@/components/player/PlayerHeader";
import { PlayerTabs } from "@/components/player/PlayerTabs";
import { WeaponMastery } from "@/components/player/WeaponMastery";
import { SurvivalMastery } from "@/components/player/SurvivalMastery";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function PlayerMasteryPage({
  params,
}: {
  params: Promise<{ locale: Locale; platform: string; name: string }>;
}) {
  const { locale, platform, name } = await params;
  setRequestLocale(locale);
  if (!isShard(platform)) notFound();
  const decoded = decodeURIComponent(name);
  const t = await getTranslations({ locale, namespace: "mastery" });

  let player;
  try {
    const players = await searchPlayersByName(platform, [decoded]);
    if (!players.length) notFound();
    player = players[0]!;
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const [weapon, survival] = await Promise.allSettled([
    getPlayerWeaponMastery(platform, player.id),
    getPlayerSurvivalMastery(platform, player.id),
  ]);

  const weaponData = weapon.status === "fulfilled" ? weapon.value : null;
  const survivalData = survival.status === "fulfilled" ? survival.value : null;

  return (
    <div className="space-y-5">
      <PlayerHeader locale={locale} player={player} />
      <PlayerTabs locale={locale} shard={platform} name={decoded} active="mastery" />

      <Card>
        <CardHeader title={t("weaponTab")} />
        {weaponData && weaponData.weapons.length ? (
          <WeaponMastery locale={locale} entries={weaponData.weapons} />
        ) : (
          <EmptyState title={t("noData")} />
        )}
      </Card>

      <Card>
        <CardHeader title={t("survivalTab")} />
        {survivalData ? (
          <SurvivalMastery locale={locale} data={survivalData} />
        ) : (
          <EmptyState title={t("noData")} />
        )}
      </Card>
    </div>
  );
}
