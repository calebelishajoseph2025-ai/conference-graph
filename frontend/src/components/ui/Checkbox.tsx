import { useId } from 'react';
import { cn } from '@/lib/cn';

export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <span className="inline-flex items-start gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className={cn('mt-0.5 h-3.5 w-3.5 rounded-sm border border-line-strong bg-surface-2 accent-accent')}
        style={{ accentColor: 'rgb(var(--accent))' }}
      />
      <label htmlFor={id} className={cn('text-[12px] text-muted', disabled && 'opacity-60')}>
        {label}
      </label>
    </span>
  );
}
