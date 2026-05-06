import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { env } from "@/lib/env";
import { getSeasons } from "@/lib/pubg/client";
import { sortSeasonsDesc } from "@/lib/pubg/seasons";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function SeasonsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "seasons" });

  const seasons = sortSeasonsDesc(await getSeasons(env.PUBG_DEFAULT_SHARD));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <Card>
        <CardHeader title={t("title")} />
        {seasons.length === 0 ? (
          <EmptyState title={t("noSeasons")} />
        ) : (
          <ul className="divide-y divide-border/60 rounded-lg border border-border bg-bg-muted">
            {seasons.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="truncate font-mono text-sm text-fg">{s.id}</div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  {s.isCurrent && <Badge tone="brand">{t("current")}</Badge>}
                  {s.isOffseason && <Badge tone="muted">{t("off")}</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
