import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

function useCountUp(target: number | null, duration = 600): number | null {
  const [value, setValue] = useState<number | null>(target);
  const previous = useRef<number | null>(null);

  useEffect(() => {
    if (target === null) {
      setValue(null);
      previous.current = null;
      return;
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || previous.current === target) {
      setValue(target);
      previous.current = target;
      return;
    }
    const start = previous.current ?? 0;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number): void => {
      const t = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(start + (target - start) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
      else previous.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

export function Stat({
  caption,
  value,
  hint,
  suffix,
  live = false,
  className,
}: {
  caption: string;
  value: number | string | null;
  hint?: string;
  suffix?: string;
  live?: boolean;
  className?: string;
}) {
  const numeric = typeof value === 'number' ? value : null;
  const animated = useCountUp(numeric);
  const shown = numeric !== null ? `${(animated ?? 0).toLocaleString('en-US')}${suffix ?? ''}` : (value ?? '—');

  return (
    <div className={cn('min-w-0', className)}>
      <div className="flex items-center gap-1.5 text-caption text-muted">
        {live ? <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden /> : null}
        {caption}
      </div>
      <div className="text-grad mt-2 text-[clamp(28px,2.4vw,44px)] font-medium leading-none tracking-[-0.04em] tabular">
        {shown}
      </div>
      {hint ? <div className="mt-2 text-small text-faint">{hint}</div> : null}
    </div>
  );
}
