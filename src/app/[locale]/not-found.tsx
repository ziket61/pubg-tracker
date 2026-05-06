import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function NotFound() {
  const t = await getTranslations("common");
  return <EmptyState title={t("notFound")} />;
}
