"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/lib/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { GAME_MODES, PLATFORMS, type GameMode, type Shard } from "@/lib/pubg/shards";
import { Select } from "@/components/ui/Select";

export function LeaderboardFilters({
  seasons,
  currentSeason,
  currentMode,
  currentPlatform,
}: {
  seasons: { id: string; isCurrent: boolean }[];
  currentSeason: string;
  currentMode: GameMode;
  currentPlatform: Shard;
}) {
  const t = useTranslations("leaderboard");
  const tm = useTranslations("modes");
  const tp = useTranslations("platforms");
  const ts = useTranslations("seasons");
  const tsearch = useTranslations("search");
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
        label={tsearch("platformLabel")}
        value={currentPlatform}
        onChange={(e) => update("platform", e.target.value)}
      >
        {PLATFORMS.map((p) => (
          <option key={p} value={p}>
            {tp(p)}
          </option>
        ))}
      </Select>
    </div>
  );
}
