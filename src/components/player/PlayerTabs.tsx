import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import type { Shard } from "@/lib/pubg/shards";

export async function PlayerTabs({
  locale,
  shard,
  name,
  active,
}: {
  locale: Locale;
  shard: Shard;
  name: string;
  active: "overview" | "matches" | "mastery";
}) {
  const t = await getTranslations({ locale, namespace: "player.tabs" });
  const base = `/players/${shard}/${encodeURIComponent(name)}`;
  const items: { key: typeof active; href: string; label: string }[] = [
    { key: "overview", href: base, label: t("overview") },
    { key: "matches", href: `${base}/matches`, label: t("matches") },
    { key: "mastery", href: `${base}/mastery`, label: t("mastery") },
  ];

  return (
    <nav className="flex gap-1 rounded-xl border border-border bg-surface p-1">
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors ${
            it.key === active
              ? "bg-brand text-bg"
              : "text-fg-muted hover:bg-surface-hover hover:text-fg"
          }`}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
