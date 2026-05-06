"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link } from "@/lib/i18n/navigation";

export function MobileNav() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while open.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="menu"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-fg-muted transition-colors hover:border-border-strong hover:text-fg sm:hidden"
      >
        {open ? <CloseIcon /> : <BurgerIcon />}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-16 z-30 bg-bg/80 backdrop-blur-sm sm:hidden"
          />
          <nav
            id="mobile-nav-panel"
            className="fixed inset-x-0 top-16 z-40 border-b border-border bg-bg-muted shadow-card-raised animate-fade-in-up sm:hidden"
          >
            <ul className="mx-auto max-w-6xl divide-y divide-border/60">
              <MobileLink href="/leaderboards" label={t("leaderboards")} />
              <MobileLink href="/compare" label={t("compare")} />
              <MobileLink href="/seasons" label={t("seasons")} />
              <MobileLink href="/about" label={t("about")} />
            </ul>
          </nav>
        </>
      )}
    </>
  );
}

function MobileLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center justify-between px-4 py-4 font-mono text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted transition-colors hover:bg-surface hover:text-fg"
      >
        <span>{label}</span>
        <span className="text-fg-subtle">→</span>
      </Link>
    </li>
  );
}

function BurgerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <line x1="2" y1="4" x2="14" y2="4" />
      <line x1="2" y1="8" x2="14" y2="8" />
      <line x1="2" y1="12" x2="14" y2="12" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <line x1="2" y1="2" x2="12" y2="12" />
      <line x1="12" y1="2" x2="2" y2="12" />
    </svg>
  );
}
