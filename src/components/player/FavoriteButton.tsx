"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Shard } from "@/lib/pubg/shards";
import { isFavorite, pushRecent, subscribe, toggleFavorite } from "@/lib/favorites";

export function FavoriteButton({
  name,
  shard,
}: {
  name: string;
  shard: Shard;
}) {
  const t = useTranslations("player");
  const [favored, setFavored] = useState(false);

  useEffect(() => {
    setFavored(isFavorite({ name, shard }));
    const off = subscribe("favorite", () => {
      setFavored(isFavorite({ name, shard }));
    });
    return off;
  }, [name, shard]);

  // Also push to recent on mount (every visit)
  useEffect(() => {
    pushRecent({ name, shard });
  }, [name, shard]);

  function onClick() {
    setFavored(toggleFavorite({ name, shard }));
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={favored}
      aria-label={favored ? t("removeFavorite") : t("addFavorite")}
      className={`group inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] transition-all ${
        favored
          ? "border-tier-gold/60 bg-tier-gold/10 text-tier-gold hover:bg-tier-gold/20"
          : "border-border bg-surface text-fg-muted hover:border-tier-gold/40 hover:text-tier-gold"
      }`}
    >
      <Star filled={favored} />
      {favored ? t("favored") : t("favorite")}
    </button>
  );
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" aria-hidden>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
