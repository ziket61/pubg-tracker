export function Logo({ size = 32, animated = false }: { size?: number; animated?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="PUBG Tracker logo"
      className={animated ? "transition-transform duration-300 hover:rotate-12" : ""}
    >
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffba4d" />
          <stop offset="100%" stopColor="#f3a536" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="36" height="36" rx="9" fill="#10121a" stroke="url(#logoGrad)" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="11" fill="none" stroke="url(#logoGrad)" strokeWidth="1.25" opacity="0.4" />
      <circle cx="20" cy="20" r="6" fill="none" stroke="url(#logoGrad)" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="1.6" fill="url(#logoGrad)" />
      <line x1="20" y1="6" x2="20" y2="11" stroke="url(#logoGrad)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="29" x2="20" y2="34" stroke="url(#logoGrad)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6" y1="20" x2="11" y2="20" stroke="url(#logoGrad)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="29" y1="20" x2="34" y2="20" stroke="url(#logoGrad)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
