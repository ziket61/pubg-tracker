"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { PLATFORMS, type Shard, isShard } from "@/lib/pubg/shards";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { CrosshairIcon } from "@/components/icons/GameIcons";

export function PlayerSearchForm({
  defaultShard = "steam",
  size = "lg",
}: {
  defaultShard?: Shard;
  size?: "md" | "lg";
}) {
  const t = useTranslations("search");
  const tp = useTranslations("platforms");
  const router = useRouter();
  const [name, setName] = useState("");
  const [shard, setShard] = useState<Shard>(defaultShard);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 3) {
      setError(t("tooShort"));
      return;
    }
    setError(null);
    startTransition(() => {
      router.push(`/players/${shard}/${encodeURIComponent(trimmed)}`);
    });
  }

  const inputHeight = size === "lg" ? "h-12 text-base" : "h-10 text-sm";

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      noValidate
    >
      <div className="flex-1">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">
            {t("placeholder")}
          </span>
          <div className="group relative">
            <CrosshairIcon
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle transition-colors group-focus-within:text-brand"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("placeholder")}
              className={`w-full rounded-lg border border-border bg-bg/80 pl-10 pr-4 ${inputHeight} text-fg placeholder:text-fg-subtle/70 transition-shadow focus:border-brand focus:outline-none focus:shadow-glow-sm`}
              spellCheck={false}
              autoComplete="off"
              aria-invalid={!!error}
              aria-describedby={error ? "search-error" : undefined}
            />
          </div>
        </label>
      </div>
      <Select
        label={t("platformLabel")}
        value={shard}
        onChange={(e) => isShard(e.target.value) && setShard(e.target.value)}
        className={size === "lg" ? "h-12 text-base" : ""}
      >
        {PLATFORMS.map((p) => (
          <option key={p} value={p}>
            {tp(p)}
          </option>
        ))}
      </Select>
      <Button
        type="submit"
        size={size}
        disabled={pending}
        className="sm:min-w-[140px]"
      >
        {pending ? "…" : t("submit")}
      </Button>
      {error && (
        <p
          id="search-error"
          role="alert"
          className="absolute mt-[88px] text-xs text-danger sm:mt-0 sm:translate-y-12"
        >
          {error}
        </p>
      )}
    </form>
  );
}
