import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import type { GameModeStats } from "@/lib/pubg/types";
import type { FormSummary } from "@/lib/pubg/form";
import { kd, winRate, top10Rate, avgDamage, headshotRate } from "@/lib/pubg/stats";
import { Card, CardHeader } from "@/components/ui/Card";
import {
  formatDecimal,
  formatNumber,
  formatPercent,
} from "@/lib/format/numbers";

interface Side {
  name: string;
  lifetime: GameModeStats | null;
  form: FormSummary;
}

export async function CompareTable({
  locale,
  a,
  b,
}: {
  locale: Locale;
  a: Side;
  b: Side;
}) {
  const t = await getTranslations({ locale, namespace: "compare" });
  const ts = await getTranslations({ locale, namespace: "stats" });
  const tp = await getTranslations({ locale, namespace: "player" });

  type Row = {
    label: string;
    aValue: string;
    bValue: string;
    aRaw: number;
    bRaw: number;
    higherIsBetter: boolean;
  };

  const rows: Array<Row | SectionItem> = [];

  if (a.lifetime && b.lifetime) {
    const la = a.lifetime;
    const lb = b.lifetime;
    rows.push(
      mk(ts("rounds"), la.roundsPlayed, lb.roundsPlayed, locale, true, "n"),
      mk(ts("wins"), la.wins, lb.wins, locale, true, "n"),
      mk(
        ts("winRate"),
        winRate(la),
        winRate(lb),
        locale,
        true,
        "p",
      ),
      mk(ts("kd"), kd(la), kd(lb), locale, true, "d"),
      mk(ts("kills"), la.kills, lb.kills, locale, true, "n"),
      mk(
        ts("avgDamage"),
        avgDamage(la),
        avgDamage(lb),
        locale,
        true,
        "n0",
      ),
      mk(
        ts("top10s"),
        top10Rate(la),
        top10Rate(lb),
        locale,
        true,
        "p",
      ),
      mk(
        ts("headshotRate"),
        headshotRate(la),
        headshotRate(lb),
        locale,
        true,
        "p",
      ),
      mk(ts("longestKill"), la.longestKill, lb.longestKill, locale, true, "m"),
    );
  }

  if (a.form.matchCount > 0 || b.form.matchCount > 0) {
    rows.push(
      sectionRow(t("recentSection")),
      mk(ts("kills"), a.form.avgKills, b.form.avgKills, locale, true, "d"),
      mk(ts("avgDamage"), a.form.avgDamage, b.form.avgDamage, locale, true, "n0"),
      mk(tp("avgPlace"), a.form.avgPlace, b.form.avgPlace, locale, false, "d"),
      mk(ts("top10s"), a.form.top10Rate, b.form.top10Rate, locale, true, "p"),
      mk(ts("wins"), a.form.winRate, b.form.winRate, locale, true, "p"),
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader title={t("notFoundTitle")} accent="combat" />
        <p className="text-sm text-fg-muted">{t("notEnoughData")}</p>
      </Card>
    );
  }

  return (
    <Card variant="raised">
      <div className="grid grid-cols-3 gap-3 border-b border-border pb-3">
        <div className="text-xs text-fg-subtle">{t("metric")}</div>
        <div className="text-center">
          <div className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {t("playerA")}
          </div>
          <div className="font-display text-lg font-bold text-brand">{a.name}</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {t("playerB")}
          </div>
          <div className="font-display text-lg font-bold text-accent">{b.name}</div>
        </div>
      </div>

      <ul className="mt-3 space-y-1">
        {rows.map((r, i) => {
          if ("section" in r) {
            return (
              <li
                key={`s-${i}`}
                className="mt-3 px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-subtle"
              >
                {r.section}
              </li>
            );
          }
          const aWins = r.higherIsBetter ? r.aRaw > r.bRaw : r.aRaw < r.bRaw;
          const bWins = r.higherIsBetter ? r.bRaw > r.aRaw : r.bRaw < r.aRaw;
          return (
            <li
              key={r.label + i}
              className="grid grid-cols-3 items-center gap-3 rounded-md px-2 py-1.5 text-sm odd:bg-bg-muted/40"
            >
              <span className="text-fg-muted">{r.label}</span>
              <span
                className={`text-center font-mono tabular-nums ${
                  aWins ? "text-success font-semibold" : "text-fg"
                }`}
              >
                {r.aValue}
              </span>
              <span
                className={`text-center font-mono tabular-nums ${
                  bWins ? "text-success font-semibold" : "text-fg"
                }`}
              >
                {r.bValue}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

type SectionItem = { section: string };
function sectionRow(section: string): SectionItem {
  return { section };
}

function mk(
  label: string,
  aRaw: number,
  bRaw: number,
  locale: Locale,
  higherIsBetter: boolean,
  fmt: "n" | "n0" | "d" | "p" | "m",
) {
  const fmtVal = (v: number) => {
    if (!Number.isFinite(v)) return "—";
    switch (fmt) {
      case "n":
        return formatNumber(v, locale);
      case "n0":
        return formatNumber(v, locale, { maximumFractionDigits: 0 });
      case "d":
        return formatDecimal(v, locale, 2);
      case "p":
        return formatPercent(v, locale);
      case "m":
        if (v >= 1000) return formatDecimal(v / 1000, locale, 2) + " km";
        return Math.round(v) + " m";
    }
  };
  return {
    label,
    aValue: fmtVal(aRaw),
    bValue: fmtVal(bRaw),
    aRaw,
    bRaw,
    higherIsBetter,
  };
}
