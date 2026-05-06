import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { Card, CardHeader } from "@/components/ui/Card";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "about" });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <Card>
        <CardHeader title={t("title")} />
        <div className="space-y-4 text-sm leading-relaxed text-fg-muted">
          <p>{t("intro")}</p>
          <p>{t("stack")}</p>
          <p className="text-fg-subtle">{t("disclaimer")}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href="https://documentation.pubg.com/en/introduction.html"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs hover:border-brand-dim/60"
            >
              {t("sourceLabel")} →
            </a>
            <a
              href="https://github.com/pubg/api-assets"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs hover:border-brand-dim/60"
            >
              {t("assetsLabel")} →
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}
