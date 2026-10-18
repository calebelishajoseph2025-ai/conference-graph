import { useId } from 'react';
import { scoreZone } from '@/lib/status';
import { cn } from '@/lib/cn';

const TICKS = [0, 5, 8, 9, 10];

export function ScoreSlider({
  value,
  onChange,
  disabled = false,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn('rounded-md border border-line bg-surface-2 px-4 py-4', className)}>
      <div className="flex items-end justify-between">
        <label htmlFor={id} className="text-small font-medium text-ink">
          Score
        </label>
        <div className="flex items-baseline gap-2">
          <span className="text-[32px] font-medium leading-none tracking-[-0.03em] tabular text-ink">{value}</span>
          <span className="text-caption text-muted">{scoreZone(value)}</span>
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        disabled={disabled}
        aria-valuetext={`${value} out of 10, ${scoreZone(value)}`}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-4 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-3 disabled:cursor-not-allowed"
        style={{ accentColor: 'rgb(var(--accent))' }}
      />
      <div className="relative mt-2 h-6 w-full">
        {TICKS.map((tick) => {
          const percent = (tick / 10) * 100;
          return (
            <button
              key={tick}
              type="button"
              tabIndex={-1}
              aria-hidden
              onClick={() => onChange(tick)}
              style={{
                left: `${percent}%`,
                transform: tick === 0 ? 'translateX(0)' : tick === 10 ? 'translateX(-100%)' : 'translateX(-50%)',
              }}
              className="absolute top-0 flex flex-col items-center gap-1 text-[10px] text-faint transition-colors hover:text-ink"
            >
              <span className={cn('h-1.5 w-px', value === tick ? 'bg-accent' : 'bg-line-strong')} />
              <span>{tick}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-caption text-faint">Weak 0–4 · Mixed 5–7 · Strong 8 · Auto-accept 9–10</p>
    </div>
  );
}
