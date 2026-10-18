import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ComboOption {
  id: number;
  label: string;
  hint?: string;
}

export function ComboBox({
  value,
  options,
  loading,
  query,
  onQueryChange,
  onSelect,
  onClear,
  placeholder,
  disabled,
  errorText,
  emptyText = 'No matches.',
  inputId,
  showSubtext = false,
}: {
  value: ComboOption | null;
  options: ComboOption[];
  loading: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (option: ComboOption) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
  errorText?: string;
  emptyText?: string;
  inputId?: string;
  showSubtext?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const id = inputId ?? generatedId;
  const listId = `${id}-list`;

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => setActive(0), [options]);

  const select = (option: ComboOption): void => {
    onSelect(option);
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) setOpen(true);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => Math.min(options.length - 1, index + 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    }
    if (event.key === 'Enter' && open && options[active]) {
      event.preventDefault();
      select(options[active]);
    }
    if (event.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" size={15} strokeWidth={1.5} />
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          value={query}
          placeholder={value ? value.label : (placeholder ?? 'Search')}
          onChange={(event) => {
            onQueryChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            'h-9 w-full rounded-sm border border-line bg-surface-2 pl-9 pr-16 text-sm text-ink placeholder:text-faint',
            'transition-colors duration-fast hover:border-line-strong focus-visible:border-accent',
            value && !query && 'placeholder:text-ink',
            disabled && 'cursor-not-allowed opacity-60',
            errorText && 'border-bad/70'
          )}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {loading ? <Loader2 className="animate-spin-slow text-muted" size={14} strokeWidth={1.5} /> : null}
          {(onClear && (value || query)) || query ? (
            <button
              type="button"
              aria-label="Clear selection"
              onClick={() => {
                if (onClear) onClear();
                onQueryChange('');
                setOpen(false);
              }}
              className="rounded-sm p-0.5 text-faint hover:text-ink"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          ) : null}
        </div>
      </div>
      {showSubtext && value ? (
        <p className="mt-1 truncate text-[12px] text-faint">
          <span className="font-mono">#{value.id}</span> {value.label}
        </p>
      ) : null}
      {errorText ? <p className="mt-1 text-[12px] text-bad">{errorText}</p> : null}
      {open && !disabled ? (
        <div
          id={listId}
          role="listbox"
          className="drop-overlay absolute z-40 mt-1 max-h-72 w-full overflow-auto rounded-md border border-line-strong bg-overlay py-1"
        >
          {options.length === 0 ? (
            <p className="px-3 py-2 text-small text-faint">{loading ? 'Searching…' : emptyText}</p>
          ) : (
            options.map((option, index) => (
              <button
                key={`${option.id}-${option.label}`}
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => select(option)}
                className={cn(
                  'flex w-full items-start gap-2 px-3 py-2 text-left transition-colors duration-fast',
                  index === active ? 'bg-surface-3' : 'hover:bg-surface-2'
                )}
              >
                <span className="mt-0.5 w-5 shrink-0 text-right font-mono text-[11px] text-faint">{option.id}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-ink">{option.label}</span>
                  {option.hint ? <span className="block truncate text-[11px] text-muted">{option.hint}</span> : null}
                </span>
                {value?.id === option.id ? <Check size={14} strokeWidth={1.5} className="mt-1 text-accent-text" /> : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
