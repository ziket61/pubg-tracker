"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getFavorites, getRecent, subscribe, type PlayerEntry } from "@/lib/favorites";
import { Card, CardHeader } from "@/components/ui/Card";
import { useRouter } from "@/lib/i18n/navigation";

export function RecentPlayersWidget() {
  const t = useTranslations("home");
  const tp = useTranslations("platforms");
  const router = useRouter();
  const [recent, setRecent] = useState<PlayerEntry[]>([]);
  const [favorites, setFavorites] = useState<PlayerEntry[]>([]);

  useEffect(() => {
    const refresh = () => {
      setRecent(getRecent());
      setFavorites(getFavorites());
    };
    refresh();
    const offR = subscribe("recent", refresh);
    const offF = subscribe("favorite", refresh);
    return () => {
      offR();
      offF();
    };
  }, []);

  if (recent.length === 0 && favorites.length === 0) return null;

  function go(e: PlayerEntry) {
    router.push(`/players/${e.shard}/${encodeURIComponent(e.name)}`);
  }

  return (
    <Card variant="raised">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {favorites.length > 0 && (
          <Section
            title={t("favorites")}
            tone="tier-gold"
            items={favorites}
            onPick={go}
            tp={tp}
          />
        )}
        {recent.length > 0 && (
          <Section
            title={t("recentPlayers")}
            tone="brand"
            items={recent}
            onPick={go}
            tp={tp}
          />
        )}
      </div>
    </Card>
  );
}

function Section({
  title,
  tone,
  items,
  onPick,
  tp,
}: {
  title: string;
  tone: "tier-gold" | "brand";
  items: PlayerEntry[];
  onPick: (e: PlayerEntry) => void;
  tp: ReturnType<typeof useTranslations>;
}) {
  const dotClass = tone === "tier-gold" ? "bg-tier-gold" : "bg-brand";
  return (
    <div>
      <CardHeader title={title} accent={tone === "tier-gold" ? undefined : "brand"} />
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((e) => (
          <button
            key={`${e.shard}:${e.name}`}
            type="button"
            onClick={() => onPick(e)}
            className="group inline-flex items-center gap-2 rounded-md border border-border bg-bg-muted px-2.5 py-1.5 text-xs text-fg transition-colors hover:border-border-strong hover:bg-surface"
          >
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden />
            <span className="font-medium">{e.name}</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {tp(e.shard)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
