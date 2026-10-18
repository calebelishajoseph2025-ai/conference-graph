import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useUpdatePaper } from '@/api/hooks/mutations';
import { toApiError } from '@/api/errors';
import type { PaperDetail } from '@/api/schemas/papers';
import { NEXT_STATUS, type PaperStatus } from '@/lib/status';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from './StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';

export function StatusDialog({
  paper,
  open,
  onOpenChange,
  adminToken,
  onUpdated,
}: {
  paper: PaperDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminToken?: string;
  onUpdated?: (paper: PaperDetail) => void;
}) {
  const [status, setStatus] = useState<PaperStatus | null>(null);
  const update = useUpdatePaper();
  const { toast } = useToast();
  const allowed = paper ? NEXT_STATUS[paper.status as PaperStatus] ?? [] : [];

  useEffect(() => {
    if (open) setStatus(null);
  }, [open]);

  const submit = async (): Promise<void> => {
    if (!paper || !status) return;
    try {
      const updated = await update.mutateAsync({ id: paper.paperId, body: { status }, adminToken });
      toast('Status updated', { tone: 'success', description: `Paper #${paper.paperId} is now ${updated.status}.` });
      onOpenChange(false);
      onUpdated?.(updated);
    } catch (error) {
      toast('Could not change the status', { tone: 'error', description: toApiError(error).message });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!update.isPending) onOpenChange(value);
      }}
      title="Change paper status"
      description={paper ? `Paper #${paper.paperId} · ${paper.title}` : undefined}
      footer={
        <>
          <Button variant="secondary" data-cancel onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void submit()} loading={update.isPending} disabled={!status}>Update status</Button>
        </>
      }
    >
      {paper ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-caption text-faint">Current</span>
            <StatusBadge status={paper.status} />
          </div>
          {allowed.length === 0 ? (
            <p className="rounded-md border border-line bg-surface-2 p-3 text-small text-muted">
              This paper is final. There are no legal status transitions from {paper.status}.
            </p>
          ) : (
            <div>
              <p className="mb-2 text-small text-muted">Allowed transitions</p>
              <div className="space-y-2">
                {allowed.map((next) => (
                  <label
                    key={next}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-3 rounded-md border p-3 transition-colors duration-fast',
                      status === next ? 'border-accent bg-surface-2' : 'border-line hover:border-line-strong'
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <input type="radio" name="next-status" checked={status === next} onChange={() => setStatus(next)} />
                      <span className="text-small text-ink">{next}</span>
                    </span>
                    <ArrowRight size={14} strokeWidth={1.5} className="text-faint" />
                  </label>
                ))}
              </div>
              <p className="mt-3 text-caption text-faint">
                The database enforces the same transitions; an illegal change is rejected by the service.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </Dialog>
  );
}
