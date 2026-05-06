import type { Locale } from "@/lib/i18n/routing";

export function formatNumber(n: number, locale: Locale, opts?: Intl.NumberFormatOptions): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", opts).format(n);
}

export function formatPercent(n: number, locale: Locale, fractionDigits = 1): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n);
}

export function formatDecimal(n: number, locale: Locale, fractionDigits = 2): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n);
}

export function formatDistanceMeters(m: number, locale: Locale): string {
  if (!Number.isFinite(m)) return "—";
  if (m >= 1000) return formatDecimal(m / 1000, locale, 2) + " km";
  return Math.round(m) + " m";
}
