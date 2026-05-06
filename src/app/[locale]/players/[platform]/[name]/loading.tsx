import { Skeleton, StatGridSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-8 w-32" />
      <StatGridSkeleton />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
