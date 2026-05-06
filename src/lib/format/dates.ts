import type { Locale } from "@/lib/i18n/routing";

export function formatDateTime(value: string, locale: Locale): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function formatDate(value: string, locale: Locale): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    dateStyle: "medium",
  }).format(d);
}

export function relativeTime(value: string, locale: Locale): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.round(diffMs / 60000);
  const diffH = Math.round(diffMin / 60);
  const diffD = Math.round(diffH / 24);
  const rtf = new Intl.RelativeTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    numeric: "auto",
  });
  if (diffMin < 60) return rtf.format(-diffMin, "minute");
  if (diffH < 48) return rtf.format(-diffH, "hour");
  return rtf.format(-diffD, "day");
}
