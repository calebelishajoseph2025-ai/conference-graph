export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Conference Graph"
      className={className}
    >
      <path d="M45.5 18.5A19 19 0 1 0 45.5 45.5" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" />
      <g stroke="currentColor" strokeOpacity=".7" strokeWidth="2.2" strokeLinecap="round">
        <line x1="32" y1="32" x2="45.5" y2="18.5" />
        <line x1="32" y1="32" x2="45.5" y2="45.5" />
        <line x1="32" y1="32" x2="13" y2="32" />
      </g>
      <circle cx="45.5" cy="18.5" r="4.6" fill="currentColor" />
      <circle cx="45.5" cy="45.5" r="4.6" fill="currentColor" />
      <circle cx="13" cy="32" r="4.6" fill="currentColor" />
      <circle cx="32" cy="32" r="5.4" fill="rgb(var(--bg))" stroke="currentColor" strokeWidth="2.6" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="text-[15px] font-semibold tracking-[-0.02em]">Conference Graph</span>
    </span>
  );
}
