import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type Tone = 'neutral' | 'ok' | 'warn' | 'bad' | 'accent';

const tones: Record<Tone, string> = {
  neutral: 'border-line-strong text-muted',
  ok: 'border-ok/40 text-ok',
  warn: 'border-warn/40 text-warn',
  bad: 'border-bad/40 text-bad',
  accent: 'border-accent/40 text-accent-text',
};

export function Badge({
  tone = 'neutral',
  icon,
  children,
  className,
  dot = false,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12px] font-medium',
        tones[tone],
        className
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> : null}
      {icon}
      {children}
    </span>
  );
}
