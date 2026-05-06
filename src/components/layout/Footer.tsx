import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { Logo } from "@/components/icons/Logo";

export async function Footer({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "about" });
  const tn = await getTranslations({ locale, namespace: "nav" });

  return (
    <footer className="mt-20 border-t border-border bg-bg-muted">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 text-fg">
              <Logo size={26} />
              <span className="font-display text-sm font-bold uppercase tracking-[0.08em]">
                PUBG <span className="text-brand">Tracker</span>
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-fg-subtle">
              {t("intro")}
            </p>
          </div>

          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">
              {tn("home")}
            </div>
            <ul className="mt-3 space-y-1.5 text-xs">
              <li>
                <Link className="text-fg-muted hover:text-brand" href="/leaderboards">
                  {tn("leaderboards")}
                </Link>
              </li>
              <li>
                <Link className="text-fg-muted hover:text-brand" href="/seasons">
                  {tn("seasons")}
                </Link>
              </li>
              <li>
                <Link className="text-fg-muted hover:text-brand" href="/about">
                  {tn("about")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">
              Open data
            </div>
            <ul className="mt-3 space-y-1.5 text-xs">
              <li>
                <a
                  className="text-fg-muted hover:text-brand"
                  href="https://documentation.pubg.com/en/introduction.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("sourceLabel")} ↗
                </a>
              </li>
              <li>
                <a
                  className="text-fg-muted hover:text-brand"
                  href="https://github.com/pubg/api-assets"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("assetsLabel")} ↗
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border/60 pt-4 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle/80">
          {t("disclaimer")}
        </div>
      </div>
    </footer>
  );
}
