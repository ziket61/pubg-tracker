"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";

export default function PlayerError({
  error,
  reset,
}: {
  error: Error & { digest?: string; status?: number };
  reset: () => void;
}) {
  const t = useTranslations("errors");
  const tc = useTranslations("common");

  const isRateLimit = /rate.*limit|429/i.test(error.message);

  return (
    <ErrorState
      title={t("title")}
      description={isRateLimit ? t("rateLimited", { seconds: 60 }) : error.message}
      action={<Button onClick={reset}>{tc("retry")}</Button>}
    />
  );
}
