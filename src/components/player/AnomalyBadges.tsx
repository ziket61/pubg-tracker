import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import type { GameModeStats } from "@/lib/pubg/types";
import { detectAnomalies } from "@/lib/pubg/anomalies";
import { Badge } from "@/components/ui/Badge";

export async function AnomalyBadges({
  locale,
  stats,
}: {
  locale: Locale;
  stats: GameModeStats;
}) {
  const t = await getTranslations({ locale, namespace: "anomaly" });
  const items = detectAnomalies(stats).filter((a) => a.severity === "high");

  if (!items.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-combat/30 bg-combat/[0.05] px-3 py-2 text-xs text-fg-muted">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-combat/90">
        {t("title")}
      </span>
      <span>{t("disclaimer")}</span>
      <div className="ml-auto flex flex-wrap gap-1.5">
        {items.map((a) => (
          <Badge key={a.key} tone="combat">
            {t(a.key)}
          </Badge>
        ))}
      </div>
    </div>
  );
}
