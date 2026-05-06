import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import type { SurvivalMasteryStats } from "@/lib/pubg/types";
import { StatCard, StatGrid } from "@/components/ui/StatCard";
import { formatNumber } from "@/lib/format/numbers";

export async function SurvivalMastery({
  locale,
  data,
}: {
  locale: Locale;
  data: SurvivalMasteryStats;
}) {
  const t = await getTranslations({ locale, namespace: "mastery" });

  return (
    <div className="space-y-4">
      <StatGrid>
        <StatCard label={t("level")} value={data.level} tone="brand" />
        <StatCard label={t("tier")} value={data.tier || "—"} />
        <StatCard label={t("xp")} value={formatNumber(data.totalXp, locale)} />
      </StatGrid>
      {Object.keys(data.stats).length > 0 && (
        <StatGrid>
          {Object.entries(data.stats)
            .slice(0, 12)
            .map(([k, v]) => (
              <StatCard
                key={k}
                label={k}
                value={formatNumber(v, locale, { maximumFractionDigits: 0 })}
              />
            ))}
        </StatGrid>
      )}
    </div>
  );
}
