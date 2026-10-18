import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, RotateCw } from 'lucide-react';
import { toApiError } from '@/api/errors';
import { Button } from './Button';
import { Card } from './Card';

export function EmptyState({
  title,
  hint,
  action,
  icon,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="mb-1 text-faint" aria-hidden>
        {icon ?? <Inbox size={24} strokeWidth={1.5} />}
      </div>
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint ? <p className="max-w-[46ch] text-small text-muted">{hint}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  compact = false,
}: {
  error: unknown;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const apiError = toApiError(error);
  return (
    <Card className={compact ? 'p-4' : 'p-6'}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 shrink-0 text-bad" size={18} strokeWidth={1.5} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">The request did not complete</p>
          <p className="mt-1 break-words text-small text-muted">{apiError.message}</p>
          {apiError.errorId ? (
            <p className="mt-2 font-mono text-[11px] text-faint">error id {apiError.errorId}</p>
          ) : null}
          {onRetry ? (
            <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
              <RotateCw size={14} strokeWidth={1.5} />
              Retry
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
