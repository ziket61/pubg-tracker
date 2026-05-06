"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/lib/i18n/navigation";
import { useSearchParams } from "next/navigation";
import {
  GAME_MODES,
  LEADERBOARD_SHARDS,
  type GameMode,
  type LeaderboardShard,
} from "@/lib/pubg/shards";
import { Select } from "@/components/ui/Select";

export function LeaderboardFilters({
  seasons,
  currentSeason,
  currentMode,
  currentRegion,
}: {
  seasons: { id: string; isCurrent: boolean }[];
  currentSeason: string;
  currentMode: GameMode;
  currentRegion: LeaderboardShard;
}) {
  const t = useTranslations("leaderboard");
  const tm = useTranslations("modes");
  const ts = useTranslations("seasons");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        label={t("selectSeason")}
        value={currentSeason}
        onChange={(e) => update("season", e.target.value)}
      >
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>
            {s.id.replace("division.bro.official.", "")}
            {s.isCurrent ? ` (${ts("current")})` : ""}
          </option>
        ))}
      </Select>
      <Select
        label={t("selectMode")}
        value={currentMode}
        onChange={(e) => update("mode", e.target.value)}
      >
        {GAME_MODES.map((m) => (
          <option key={m} value={m}>
            {tm(m)}
          </option>
        ))}
      </Select>
      <Select
        label={t("selectRegion")}
        value={currentRegion}
        onChange={(e) => update("region", e.target.value)}
      >
        {LEADERBOARD_SHARDS.map((r) => (
          <option key={r} value={r}>
            {r.toUpperCase()}
          </option>
        ))}
      </Select>
    </div>
  );
}
