const TYPES = ['Conference', 'Track', 'Session', 'Author', 'Reviewer', 'Paper', 'Keyword', 'Presentation'] as const;

function ShapeIcon({ type }: { type: (typeof TYPES)[number] }) {
  const common = { stroke: 'rgb(var(--text))', fill: 'none', strokeWidth: 1.4 };
  switch (type) {
    case 'Conference':
      return <polygon points="10,2 18,10 10,18 2,10" fill="rgb(var(--text))" />;
    case 'Track':
      return <polygon points="6,3 14,3 18,10 14,17 6,17 2,10" {...common} fill="rgb(var(--surface-3))" />;
    case 'Session':
      return <rect x="2.5" y="5" width="15" height="10" rx="3" {...common} strokeDasharray="3 2" />;
    case 'Author':
      return <circle cx="10" cy="10" r="7" fill="rgb(var(--text))" />;
    case 'Reviewer':
      return <circle cx="10" cy="10" r="7" fill="rgb(var(--bg))" stroke="rgb(var(--text))" strokeWidth="2.6" />;
    case 'Paper':
      return <rect x="3" y="4" width="14" height="12" rx="2.5" fill="rgb(var(--surface-3))" stroke="rgb(var(--text))" strokeWidth="1.2" />;
    case 'Keyword':
      return <path d="M3 5h8l6 5-6 5H3z" fill="rgb(var(--surface-2))" stroke="rgb(var(--text-muted))" strokeWidth="1.2" />;
    default:
      return <polygon points="10,2 18,17 2,17" fill="rgb(var(--bg))" stroke="rgb(var(--text-muted))" strokeWidth="1.4" />;
  }
}

export function GraphLegend() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
      {TYPES.map((type) => (
        <div key={type} className="flex items-center gap-2 text-[12px] text-muted">
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
            <ShapeIcon type={type} />
          </svg>
          {type}
        </div>
      ))}
    </div>
  );
}
