import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export function Drawer({
  open,
  onOpenChange,
  title,
  eyebrow,
  status,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  eyebrow?: ReactNode;
  status?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-bg/70 backdrop-blur-[4px] transition-opacity duration-base" />
        <DialogPrimitive.Content className="drop-overlay fixed inset-y-0 right-0 z-50 flex w-full max-w-[560px] animate-sheet flex-col border-l border-line-strong bg-bg">
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
            <div className="min-w-0">
              {eyebrow ? <div className="mb-1 text-caption text-faint">{eyebrow}</div> : null}
              <DialogPrimitive.Title className="text-h3 leading-tight text-ink">{title}</DialogPrimitive.Title>
              {status ? <div className="mt-2">{status}</div> : null}
            </div>
            <DialogPrimitive.Close
              aria-label="Close panel"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-transparent text-muted transition-colors duration-fast hover:border-line hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X size={16} strokeWidth={1.5} />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
