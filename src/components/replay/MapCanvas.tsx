// Renders the map: real PUBG map image (from pubg/api-assets via CDN) when
// available, else a tactical grid fallback. The grid + axis labels stay on
// top of the image so coordinates are still legible.
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
      {/* Real map image (when known) */}
      {map.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={map.imageUrl}
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-90"
          draggable={false}
        />
      )}

      <svg
        viewBox={`0 0 ${size} ${size}`}
        className={`absolute inset-0 h-full w-full ${map.imageUrl ? "" : "bg-bg-muted"}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="rep-grid-fine" width={size / 32} height={size / 32} patternUnits="userSpaceOnUse">
            <path d={`M ${size / 32} 0 L 0 0 0 ${size / 32}`} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          </pattern>
          <pattern id="rep-grid-major" width={size / 8} height={size / 8} patternUnits="userSpaceOnUse">
            <path d={`M ${size / 8} 0 L 0 0 0 ${size / 8}`} fill="none" stroke="rgba(243,165,54,0.18)" strokeWidth="1" />
          </pattern>
          <radialGradient id="rep-vignette" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor="rgba(8,9,12,0)" />
            <stop offset="100%" stopColor="rgba(8,9,12,0.55)" />
          </radialGradient>
        </defs>

        {/* When no map image is available, fill with the dark grid background. */}
        {!map.imageUrl && (
          <>
            <rect width={size} height={size} fill="#0c0e16" />
          </>
        )}
        <rect width={size} height={size} fill="url(#rep-grid-fine)" />
        <rect width={size} height={size} fill="url(#rep-grid-major)" />
        <rect width={size} height={size} fill="url(#rep-vignette)" />

        {/* axis labels */}
        <g fontFamily="var(--font-mono)" fontSize="9" fill="rgba(243,165,54,0.55)" textAnchor="middle" style={{ paintOrder: "stroke", stroke: "rgba(8,9,12,0.7)", strokeWidth: 3 } as React.CSSProperties}>
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

        {/* Compass hint — small north arrow only, sits in the corner so it
            doesn't eat visible map area. Keeps the map name overlay company. */}
        <g transform={`translate(${size - 18}, ${size - 18})`}>
          <path d="M 0 -8 L 4 6 L 0 3 L -4 6 Z" fill="#f3a536" stroke="rgba(8,9,12,0.7)" strokeWidth="0.8" />
          <text fontFamily="var(--font-mono)" fontSize="7" fill="#f3a536" textAnchor="middle" y="-9.5"
            style={{ paintOrder: "stroke", stroke: "rgba(8,9,12,0.7)", strokeWidth: 2 } as React.CSSProperties}
          >N</text>
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
