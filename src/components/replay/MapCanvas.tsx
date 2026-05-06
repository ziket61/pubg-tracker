// Renders the map background — a tactical grid + axis labels. Real map images are
// not bundled (would balloon the bundle); the grid + colored hot points work well
// for showing player positions and kill markers. Children are rendered above.
import type { MapMeta } from "@/lib/pubg/maps";

export function MapCanvas({
  map,
  size = 720,
  children,
}: {
  map: MapMeta;
  size?: number;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="relative isolate overflow-hidden rounded-2xl border border-border-strong"
      style={{ width: "100%", aspectRatio: "1 / 1" }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 h-full w-full bg-bg-muted"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="rep-grid-fine" width={size / 32} height={size / 32} patternUnits="userSpaceOnUse">
            <path d={`M ${size / 32} 0 L 0 0 0 ${size / 32}`} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          </pattern>
          <pattern id="rep-grid-major" width={size / 8} height={size / 8} patternUnits="userSpaceOnUse">
            <path d={`M ${size / 8} 0 L 0 0 0 ${size / 8}`} fill="none" stroke="rgba(243,165,54,0.12)" strokeWidth="1" />
          </pattern>
          <radialGradient id="rep-glow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="rgba(8,9,12,0)" />
            <stop offset="100%" stopColor="rgba(8,9,12,0.6)" />
          </radialGradient>
        </defs>

        <rect width={size} height={size} fill="#0c0e16" />
        <rect width={size} height={size} fill="url(#rep-grid-fine)" />
        <rect width={size} height={size} fill="url(#rep-grid-major)" />
        <rect width={size} height={size} fill="url(#rep-glow)" />

        {/* axis labels */}
        <g fontFamily="var(--font-mono)" fontSize="9" fill="rgba(243,165,54,0.4)" textAnchor="middle">
          {Array.from({ length: 8 }).map((_, i) => {
            const km = ((i + 1) * map.sizeKm) / 8;
            const x = ((i + 1) * size) / 8;
            return (
              <g key={`x-${i}`}>
                <text x={x} y="14">{km.toFixed(0)}km</text>
                <text x="14" y={x + 3} textAnchor="start">{km.toFixed(0)}km</text>
              </g>
            );
          })}
        </g>

        {/* compass hint */}
        <g transform={`translate(${size - 36}, ${size - 36})`}>
          <circle r="22" fill="rgba(8,9,12,0.7)" stroke="rgba(243,165,54,0.4)" />
          <text fontFamily="var(--font-mono)" fontSize="10" fill="#f3a536" textAnchor="middle" y="-6">N</text>
          <line x1="0" y1="-14" x2="0" y2="14" stroke="rgba(243,165,54,0.4)" strokeWidth="1" />
          <line x1="-14" y1="0" x2="14" y2="0" stroke="rgba(243,165,54,0.4)" strokeWidth="1" />
        </g>
      </svg>

      <div className="absolute inset-0">
        <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
          {children}
        </svg>
      </div>

      {/* Map name overlay */}
      <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-bg/80 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-brand backdrop-blur-sm">
        {map.displayName} · {map.sizeKm}×{map.sizeKm}km
      </div>
    </div>
  );
}
