import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  initialFocus = 'cancel',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  initialFocus?: 'cancel' | 'content';
}) {
  const width = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg';
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-bg/70 backdrop-blur-[4px] transition-opacity duration-base" />
        <DialogPrimitive.Content
          className={cn(
            'drop-overlay fixed left-1/2 top-1/2 z-50 max-h-[86vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2',
            'animate-sheet overflow-hidden rounded-lg border border-line-strong bg-overlay',
            width
          )}
          onOpenAutoFocus={(event) => {
            if (initialFocus === 'cancel') {
              event.preventDefault();
              const cancel = (event.currentTarget as HTMLElement).querySelector<HTMLElement>('[data-cancel]');
              (cancel ?? (event.currentTarget as HTMLElement)).focus();
            }
          }}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <DialogPrimitive.Title className="text-[16px] font-semibold text-ink">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-1 text-small text-muted">{description}</DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close
              aria-label="Close dialog"
              className="rounded-sm p-1 text-faint transition-colors duration-fast hover:bg-surface-2 hover:text-ink"
            >
              <X size={16} strokeWidth={1.5} />
            </DialogPrimitive.Close>
          </div>
          <div className="max-h-[62vh] overflow-y-auto px-5 py-4">{children}</div>
          {footer ? <div className="flex justify-end gap-2 border-t border-line px-5 py-4">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
