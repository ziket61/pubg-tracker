"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");
  const tc = useTranslations("common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title={t("title")}
      description={error.message || t("unknown")}
      action={<Button onClick={reset}>{tc("retry")}</Button>}
    />
  );
}
