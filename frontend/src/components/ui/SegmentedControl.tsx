import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/cn';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<T, HTMLButtonElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number } | null>(null);
  const [ready, setReady] = useState(false);

  const index = Math.max(0, options.findIndex((option) => option.value === value));

  const updateIndicator = useCallback(() => {
    const el = buttonRefs.current.get(value);
    if (!el) return;
    const nextLeft = el.offsetLeft;
    const nextWidth = el.offsetWidth;
    setIndicatorStyle((prev) => {
      if (prev && prev.left === nextLeft && prev.width === nextWidth) {
        return prev;
      }
      return { left: nextLeft, width: nextWidth };
    });
  }, [value]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator, options]);

  useEffect(() => {
    // Delay transition until initial position is computed to prevent animate-in from (0,0)
    const raf = requestAnimationFrame(() => {
      setReady(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      updateIndicator();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [updateIndicator]);

  const count = Math.max(1, options.length);
  const isMeasured = indicatorStyle !== null && indicatorStyle.width > 0;

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={label}
      className={cn('relative inline-flex rounded-md border border-line bg-surface p-0.5', className)}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0.5 rounded-sm bg-surface-3',
          ready ? 'transition-[left,width] duration-base ease-out' : 'transition-none'
        )}
        style={
          isMeasured
            ? {
                left: `${indicatorStyle.left}px`,
                width: `${indicatorStyle.width}px`,
              }
            : {
                left: `calc(2px + ${index} * ((100% - 4px) / ${count}))`,
                width: `calc((100% - 4px) / ${count})`,
              }
        }
      />
      {options.map((option) => (
        <button
          key={option.value}
          ref={(node) => {
            if (node) {
              buttonRefs.current.set(option.value, node);
            } else {
              buttonRefs.current.delete(option.value);
            }
          }}
          type="button"
          disabled={option.disabled}
          aria-pressed={option.value === value}
          onClick={() => {
            if (!option.disabled) {
              onChange(option.value);
            }
          }}
          className={cn(
            'relative z-10 rounded-sm px-3 py-1.5 text-[13px] font-medium transition-colors duration-fast',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink/40',
            option.value === value ? 'text-ink' : 'text-muted hover:text-ink',
            option.disabled && 'cursor-not-allowed opacity-50 hover:text-muted'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
