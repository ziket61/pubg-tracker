// Wraps a PUBG player name in a Link to /players/<shard>/<name>.
// Used everywhere a nickname appears so the user can drill into the player.
import { Link } from "@/lib/i18n/navigation";
import type { Shard } from "@/lib/pubg/shards";

export function PlayerLink({
  name,
  shard,
  className = "",
  fallback,
}: {
  name: string | null | undefined;
  shard: Shard | string;
  className?: string;
  /** Rendered when name is missing/empty (e.g. dash). */
  fallback?: string;
}) {
  const trimmed = (name ?? "").trim();
  if (!trimmed) {
    return <span className={className}>{fallback ?? "—"}</span>;
  }
  return (
    <Link
      href={`/players/${shard}/${encodeURIComponent(trimmed)}` as `/players/${string}/${string}`}
      className={`transition-colors hover:text-brand hover:underline underline-offset-2 ${className}`}
    >
      {trimmed}
    </Link>
  );
}
