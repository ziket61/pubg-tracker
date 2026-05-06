"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { PLATFORMS, type Shard, isShard } from "@/lib/pubg/shards";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { CrosshairIcon } from "@/components/icons/GameIcons";
import type { Locale } from "@/lib/i18n/routing";

export function CompareForm({
  defaultShard,
  initialA,
  initialB,
}: {
  locale: Locale;
  defaultShard: Shard;
  initialA: string;
  initialB: string;
}) {
  const t = useTranslations("compare");
  const ts = useTranslations("search");
  const tp = useTranslations("platforms");
  const router = useRouter();
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(initialB);
  const [shard, setShard] = useState<Shard>(defaultShard);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const aT = a.trim();
    const bT = b.trim();
    if (aT.length < 3 || bT.length < 3) {
      setError(ts("tooShort"));
      return;
    }
    setError(null);
    startTransition(() => {
      const qs = new URLSearchParams({ a: aT, b: bT, platform: shard });
      router.push(`/compare?${qs.toString()}` as `/compare`);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-border-strong bg-surface p-4 sm:p-5"
      noValidate
    >
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_1fr_220px_auto]">
        <NameInput
          label={t("playerA")}
          value={a}
          onChange={setA}
          placeholder={ts("placeholder")}
        />
        <NameInput
          label={t("playerB")}
          value={b}
          onChange={setB}
          placeholder={ts("placeholder")}
        />
        <Select
          label={ts("platformLabel")}
          value={shard}
          onChange={(e) => isShard(e.target.value) && setShard(e.target.value)}
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {tp(p)}
            </option>
          ))}
        </Select>
        <Button type="submit" disabled={pending} className="min-w-[140px]">
          {pending ? "…" : t("submit")}
        </Button>
      </div>
      {error && <p className="mt-3 text-xs text-danger">{error}</p>}
    </form>
  );
}

function NameInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">
        {label}
      </span>
      <div className="group relative">
        <CrosshairIcon
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle transition-colors group-focus-within:text-brand"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-lg border border-border bg-bg/80 pl-9 pr-3 text-sm text-fg placeholder:text-fg-subtle/70 transition-shadow focus:border-brand focus:outline-none focus:shadow-glow-sm"
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </label>
  );
}
