import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  right,
}: {
  tabs: { value: T; label: ReactNode; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-line">
      <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const active = tab.value === value;
          return (
            <button
              key={tab.value}
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(tab.value)}
              className={cn(
                'relative whitespace-nowrap px-3 py-2.5 text-[13px] font-medium transition-colors duration-fast',
                active ? 'text-ink' : 'text-muted hover:text-ink'
              )}
            >
              {tab.label}
              {typeof tab.count === 'number' ? (
                <span className="ml-1.5 font-mono text-[11px] text-faint tabular">{tab.count}</span>
              ) : null}
              <span
                aria-hidden
                className={cn(
                  'absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-colors duration-fast',
                  active ? 'bg-ink' : 'bg-transparent'
                )}
              />
            </button>
          );
        })}
      </div>
      {right ? <div className="shrink-0 pb-2">{right}</div> : null}
    </div>
  );
}
