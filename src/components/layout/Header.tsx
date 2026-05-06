import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import { Logo } from "@/components/icons/Logo";
import { Badge } from "@/components/ui/Badge";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { useMocks } from "@/lib/env";

export async function Header({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "nav" });
  const tc = await getTranslations({ locale, namespace: "common" });

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link
          href="/"
          className="group flex items-center gap-2.5 text-fg transition-colors hover:text-brand"
        >
          <Logo size={32} animated />
          <span className="font-display text-base font-bold uppercase tracking-[0.08em]">
            PUBG <span className="text-brand">Tracker</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <NavLink href="/leaderboards">{t("leaderboards")}</NavLink>
          <NavLink href="/compare">{t("compare")}</NavLink>
          <NavLink href="/seasons">{t("seasons")}</NavLink>
          <NavLink href="/about">{t("about")}</NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {useMocks && (
            <Badge tone="accent" className="hidden sm:inline-flex">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              {tc("demoMode")}
            </Badge>
          )}
          <LocaleSwitcher current={locale} />
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted transition-colors hover:bg-surface hover:text-fg"
    >
      {children}
    </Link>
  );
}
