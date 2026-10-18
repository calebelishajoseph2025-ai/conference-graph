import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useDeletePaper } from '@/api/hooks/mutations';
import { toApiError } from '@/api/errors';
import type { PaperDetail } from '@/api/schemas/papers';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

export function DeleteDialog({
  paper,
  open,
  onOpenChange,
  adminToken,
  onDeleted,
}: {
  paper: PaperDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminToken?: string;
  onDeleted?: (paperId: number) => void;
}) {
  const [typed, setTyped] = useState('');
  const remove = useDeletePaper();
  const { toast } = useToast();

  useEffect(() => {
    if (open) setTyped('');
  }, [open]);

  const matches = paper !== null && typed === paper.title;

  const submit = async (): Promise<void> => {
    if (!paper || !matches) return;
    try {
      await remove.mutateAsync({ id: paper.paperId, adminToken });
      toast('Paper deleted', { tone: 'success', description: `Paper #${paper.paperId} was removed from both databases.` });
      onOpenChange(false);
      onDeleted?.(paper.paperId);
    } catch (error) {
      toast('Could not delete the paper', { tone: 'error', description: toApiError(error).message });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!remove.isPending) onOpenChange(value);
      }}
      title="Delete this paper?"
      description="This removes the paper and its relationships. It cannot be undone."
      size="sm"
      footer={
        <>
          <Button variant="secondary" data-cancel onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => void submit()} loading={remove.isPending} disabled={!matches}>
            Delete paper
          </Button>
        </>
      }
    >
      {paper ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-bad/40 bg-bad/5 p-3">
            <AlertTriangle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-bad" />
            <p className="text-small text-muted">
              Paper #{paper.paperId} will be deleted along with its authorship, keywords, assignments, reviews and
              presentation links.
            </p>
          </div>
          <div>
            <Label htmlFor="delete-confirm" hint="exact title">
              Type the paper title to confirm
            </Label>
            <p className="mb-2 rounded-sm bg-surface-2 px-2 py-1.5 text-[12px] text-muted">{paper.title}</p>
            <Input id="delete-confirm" value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" />
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
