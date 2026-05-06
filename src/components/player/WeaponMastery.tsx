import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import type { WeaponMasteryEntry } from "@/lib/pubg/types";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { getItemName } from "@/lib/assets/names";
import { Badge } from "@/components/ui/Badge";
import { formatNumber, formatDistanceMeters } from "@/lib/format/numbers";

export async function WeaponMastery({
  locale,
  entries,
}: {
  locale: Locale;
  entries: WeaponMasteryEntry[];
}) {
  const t = await getTranslations({ locale, namespace: "mastery" });
  const ts = await getTranslations({ locale, namespace: "stats" });

  const sorted = [...entries].sort((a, b) => b.level - a.level);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-bg-muted text-left text-xs uppercase tracking-wide text-fg-subtle">
          <tr>
            <th className="px-3 py-2.5">Weapon</th>
            <th className="px-3 py-2.5 text-right">{t("level")}</th>
            <th className="px-3 py-2.5 text-right">{t("xp")}</th>
            <th className="px-3 py-2.5 text-right">{ts("kills")}</th>
            <th className="px-3 py-2.5 text-right">{ts("headshots")}</th>
            <th className="px-3 py-2.5 text-right">{ts("longestKill")}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((w) => (
            <tr
              key={w.weaponId}
              className="border-b border-border/60 last:border-b-0 hover:bg-surface-hover"
            >
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <ItemIcon itemId={w.weaponId} size={28} alt={getItemName(w.weaponId)} />
                  <span className="font-medium">{getItemName(w.weaponId)}</span>
                </div>
              </td>
              <td className="px-3 py-2 text-right">
                <Badge tone={w.level >= 80 ? "brand" : "default"}>{w.level}</Badge>
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">
                {formatNumber(w.xpTotal, locale)}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">
                {formatNumber(w.kills, locale)}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">
                {formatNumber(w.headshots, locale)}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">
                {formatDistanceMeters(w.longestDefeat, locale)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
