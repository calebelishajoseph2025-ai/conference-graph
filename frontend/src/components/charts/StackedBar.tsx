const TONES = ['bg-ink', 'bg-ink/70', 'bg-ink/40', 'bg-surface-3 border border-line-strong'];

export function StackedBar({
  segments,
  ariaLabel,
  showTable = true,
}: {
  segments: { label: string; value: number }[];
  ariaLabel: string;
  showTable?: boolean;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const summary = segments.map((segment) => `${segment.label}: ${segment.value}`).join(', ');
  return (
    <div>
      <div
        role="img"
        aria-label={`${ariaLabel}. ${summary}`}
        className="flex h-3 w-full overflow-hidden rounded-full bg-surface-3"
      >
        {total > 0
          ? segments.map((segment, index) => (
              <div
                key={segment.label}
                className={TONES[index % TONES.length]}
                style={{ width: `${(segment.value / total) * 100}%` }}
                title={`${segment.label}: ${segment.value}`}
              />
            ))
          : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {segments.map((segment, index) => (
          <div key={segment.label} className="flex items-center gap-2 text-[12px] text-muted">
            <span className={`h-2 w-2 rounded-sm ${TONES[index % TONES.length]}`} aria-hidden />
            <span>{segment.label}</span>
            <span className="font-mono text-[11px] text-faint tabular">{segment.value}</span>
            <span className="text-[11px] text-faint tabular">
              {total > 0 ? `${((segment.value / total) * 100).toFixed(0)}%` : '—'}
            </span>
          </div>
        ))}
      </div>
      {showTable ? (
        <table className="mt-4 w-full text-small" aria-label={`${ariaLabel}, tabular values`}>
          <thead>
            <tr className="border-b border-line text-left text-caption text-faint">
              <th scope="col" className="py-1.5 font-medium">Status</th>
              <th scope="col" className="py-1.5 text-right font-medium">Papers</th>
              <th scope="col" className="py-1.5 text-right font-medium">Share</th>
            </tr>
          </thead>
          <tbody>
            {segments.map((segment) => (
              <tr key={segment.label} className="border-b border-line/60 last:border-0">
                <td className="py-1.5 text-muted">{segment.label}</td>
                <td className="py-1.5 text-right tabular text-ink">{segment.value}</td>
                <td className="py-1.5 text-right tabular text-muted">
                  {total > 0 ? `${((segment.value / total) * 100).toFixed(1)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
