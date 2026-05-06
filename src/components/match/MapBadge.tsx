import { getMapName } from "@/lib/assets/names";

export function MapBadge({ mapName }: { mapName: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-subtle px-2 py-1 text-xs font-medium text-fg">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
          stroke="#f3a536"
          strokeWidth="2"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="12" cy="9" r="2.5" fill="#f3a536" />
      </svg>
      {getMapName(mapName)}
    </span>
  );
}
