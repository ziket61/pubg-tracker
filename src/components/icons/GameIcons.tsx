type IconProps = { size?: number; className?: string };

export function CrosshairIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <line x1="12" y1="2" x2="12" y2="5" strokeLinecap="round" />
      <line x1="12" y1="19" x2="12" y2="22" strokeLinecap="round" />
      <line x1="2" y1="12" x2="5" y2="12" strokeLinecap="round" />
      <line x1="19" y1="12" x2="22" y2="12" strokeLinecap="round" />
    </svg>
  );
}

export function ParachuteIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden>
      <path d="M2 11a10 10 0 0 1 20 0" />
      <path d="M2 11l4 4M22 11l-4 4M12 3l0 12M8 11l4 4M16 11l-4 4" />
      <circle cx="12" cy="20" r="1.6" fill="currentColor" />
      <line x1="6" y1="15" x2="11" y2="20" />
      <line x1="18" y1="15" x2="13" y2="20" />
      <line x1="12" y1="15" x2="12" y2="18.4" />
    </svg>
  );
}

export function HelmetIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden>
      <path d="M4 14a8 8 0 0 1 16 0v3H4z" />
      <path d="M4 17h16" />
      <path d="M9 8.5V14M15 8.5V14" />
      <circle cx="12" cy="11.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function ChickenDinnerIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden>
      <ellipse cx="12" cy="14.5" rx="9" ry="3" />
      <path d="M3 14.5v2a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-2" />
      <path d="M9 11l-1-3M15 11l1-3" strokeLinecap="round" />
      <circle cx="9" cy="14.5" r="0.8" fill="currentColor" />
      <circle cx="15" cy="14.5" r="0.8" fill="currentColor" />
    </svg>
  );
}

export function MapGridBackground({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 400"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden
    >
      <defs>
        <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        </pattern>
        <pattern id="mapGridMajor" width="160" height="160" patternUnits="userSpaceOnUse">
          <path d="M 160 0 L 0 0 0 160" fill="none" stroke="rgba(243,165,54,0.08)" strokeWidth="1" />
        </pattern>
        <radialGradient id="mapGlow" cx="80%" cy="20%" r="60%">
          <stop offset="0%" stopColor="rgba(243,165,54,0.18)" />
          <stop offset="100%" stopColor="rgba(243,165,54,0)" />
        </radialGradient>
      </defs>
      <rect width="800" height="400" fill="url(#mapGrid)" />
      <rect width="800" height="400" fill="url(#mapGridMajor)" />
      <rect width="800" height="400" fill="url(#mapGlow)" />
      <g opacity="0.5">
        <circle cx="180" cy="120" r="3" fill="#f3a536" />
        <circle cx="180" cy="120" r="14" fill="none" stroke="#f3a536" strokeWidth="0.75" />
        <circle cx="180" cy="120" r="32" fill="none" stroke="#f3a536" strokeWidth="0.5" opacity="0.6" />
      </g>
      <g opacity="0.35">
        <circle cx="620" cy="280" r="2.5" fill="#38bdf8" />
        <circle cx="620" cy="280" r="12" fill="none" stroke="#38bdf8" strokeWidth="0.75" />
      </g>
      <g opacity="0.4">
        <circle cx="500" cy="80" r="2.5" fill="#22c55e" />
        <circle cx="500" cy="80" r="10" fill="none" stroke="#22c55e" strokeWidth="0.75" />
      </g>
    </svg>
  );
}

export function ScanLines({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 bg-scanlines opacity-50 ${className}`}
      aria-hidden
    />
  );
}
