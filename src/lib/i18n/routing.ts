import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ru", "en"] as const,
  defaultLocale: "ru",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

// TODO: drop when next-intl >= 4 — `hasLocale` is exported by the library there.
// Re-enable `import { hasLocale } from "next-intl"` and delete this helper.
export function hasLocale(
  locales: readonly Locale[],
  candidate: string | undefined | null,
): candidate is Locale {
  return !!candidate && (locales as readonly string[]).includes(candidate);
}
