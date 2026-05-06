import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import type { MatchDetails } from "@/lib/pubg/types";
import { getTelemetry } from "@/lib/pubg/client";
import { parseTelemetry } from "@/lib/pubg/telemetry/parser";
import { buildLootTimeline } from "@/lib/pubg/telemetry/loot-timeline";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { getItemName } from "@/lib/assets/names";
import { formatDuration } from "@/lib/format/duration";

const SHOW_FIRST_N = 25;

export async function LootTimeline({
  locale,
  match,
  accountId,
}: {
  locale: Locale;
  match: MatchDetails;
  accountId: string;
}) {
  const t = await getTranslations({ locale, namespace: "match" });
  const tc = await getTranslations({ locale, namespace: "common" });

  if (!match.telemetryUrl) {
    return (
      <Card>
        <CardHeader title={t("lootTimeline")} accent="brand" />
        <EmptyState title={t("telemetryUnavailable")} />
      </Card>
    );
  }

  const raw = await getTelemetry(match.telemetryUrl);
  if (!raw.length) {
    return (
      <Card>
        <CardHeader title={t("lootTimeline")} accent="brand" />
        <EmptyState title={t("telemetryUnavailable")} />
      </Card>
    );
  }

  const scene = parseTelemetry(raw, match.mapName);
  const entries = buildLootTimeline(
    raw as Parameters<typeof buildLootTimeline>[0],
    scene,
    accountId,
  );

  // Hide noisy ammo/attachment pickups for the headline view
  const meaningful = entries.filter(
    (e) => e.category !== "ammo" && e.category !== "attachment",
  );

  if (!meaningful.length) {
    return (
      <Card>
        <CardHeader title={t("lootTimeline")} accent="brand" />
        <EmptyState title={tc("noData")} />
      </Card>
    );
  }

  const visible = meaningful.slice(0, SHOW_FIRST_N);

  return (
    <Card>
      <CardHeader title={t("lootTimeline")} accent="brand" />
      <ol className="space-y-1">
        {visible.map((e, i) => (
          <li
            key={i}
            className="grid grid-cols-[60px_88px_1fr] items-center gap-3 rounded-md bg-bg-muted/40 px-2.5 py-1.5 text-xs"
          >
            <span className="font-mono tabular-nums text-fg-subtle">
              {formatDuration(e.time)}
            </span>
            <KindBadge kind={e.kind} t={t} />
            <span className="truncate">
              <span className="text-fg">{getItemName(e.itemId)}</span>{" "}
              <CategoryChip category={e.category} />
            </span>
          </li>
        ))}
      </ol>
      {meaningful.length > visible.length && (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          {t("showingFirstN", { count: visible.length, total: meaningful.length })}
        </p>
      )}
    </Card>
  );
}

function KindBadge({
  kind,
  t,
}: {
  kind: "pickup" | "equip" | "use" | "drop";
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const map = {
    pickup: { label: t("lootPickup"), tone: "success" as const },
    equip: { label: t("lootEquip"), tone: "brand" as const },
    use: { label: t("lootUse"), tone: "accent" as const },
    drop: { label: t("lootDrop"), tone: "muted" as const },
  };
  const it = map[kind];
  return <Badge tone={it.tone}>{it.label}</Badge>;
}

function CategoryChip({ category }: { category: string }) {
  const colorMap: Record<string, string> = {
    weapon: "text-combat",
    armor: "text-accent",
    heal: "text-success",
    boost: "text-brand",
    ammo: "text-fg-subtle",
    attachment: "text-fg-muted",
    other: "text-fg-subtle",
  };
  return (
    <span className={`font-mono text-[10px] uppercase tracking-wider ${colorMap[category] ?? "text-fg-subtle"}`}>
      {category}
    </span>
  );
}
