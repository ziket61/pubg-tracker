import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return <EmptyState title={t("notFound")} />;
}
