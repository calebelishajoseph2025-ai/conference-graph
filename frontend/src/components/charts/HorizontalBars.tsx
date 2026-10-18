import { cn } from '@/lib/cn';
import { num } from '@/lib/format';

export function HorizontalBars({
  items,
  ariaLabel,
  valueLabel = 'papers',
}: {
  items: { label: string; value: number; hint?: string }[];
  ariaLabel: string;
  valueLabel?: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <div role="list" aria-label={ariaLabel} className="space-y-2.5">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} role="listitem" className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className={cn('truncate text-[12px]', index === 0 ? 'text-ink' : 'text-muted')} title={item.label}>
                {item.label}
              </span>
              {item.hint ? <span className="shrink-0 text-[11px] text-faint">{item.hint}</span> : null}
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full"
                style={{ width: `${(item.value / max) * 100}%`, backgroundImage: 'var(--grad-bar)' }}
              />
            </div>
          </div>
          <span className="min-w-[3ch] text-right font-mono text-[11px] text-muted tabular" aria-label={`${item.value} ${valueLabel}`}>
            {num(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
