import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastApi {
  toast: (title: string, options?: { description?: string; tone?: ToastTone }) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const toneIcon = {
  success: <CheckCircle2 size={16} strokeWidth={1.5} className="text-ok" />,
  error: <AlertTriangle size={16} strokeWidth={1.5} className="text-bad" />,
  info: <Info size={16} strokeWidth={1.5} className="text-muted" />,
};

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback<ToastApi['toast']>(
    (title, options) => {
      counter.current += 1;
      const id = counter.current;
      setItems((list) => [...list.slice(-3), { id, title, description: options?.description, tone: options?.tone ?? 'info' }]);
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[70] flex w-[360px] flex-col gap-2" role="status" aria-live="polite">
        {items.map((item) => (
          <div
            key={item.id}
            onMouseEnter={(event) => {
              const el = event.currentTarget;
              el.dataset.paused = 'true';
            }}
            className={cn(
              'drop-overlay animate-toast pointer-events-auto flex items-start gap-3 rounded-md border border-line-strong bg-overlay px-4 py-3'
            )}
          >
            <span className="mt-0.5 shrink-0">{toneIcon[item.tone]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-small font-medium text-ink">{item.title}</p>
              {item.description ? <p className="mt-0.5 text-[12px] text-muted">{item.description}</p> : null}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(item.id)}
              className="rounded-sm p-0.5 text-faint hover:text-ink"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider');
  return value;
}
