import { AlertTriangle, X } from 'lucide-react';
import type { ConflictDetail } from '@/api/errors';
import { GraphCanvas } from '@/components/graph/GraphCanvas';
import { Button } from '@/components/ui/Button';
import type { GraphPayload } from '@/api/schemas/common';

export function ConflictPanel({
  conflict,
  reviewerName,
  onDismiss,
}: {
  conflict: ConflictDetail;
  reviewerName?: string;
  onDismiss: () => void;
}) {
  const pathGraph: GraphPayload | null =
    conflict.path && conflict.path.nodes.length > 0 ? { nodes: conflict.path.nodes, edges: conflict.path.edges } : null;
  return (
    <section
      role="alert"
      aria-label="Conflict of interest"
      className="rounded-lg border border-bad/50 bg-bad/5 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-bad" />
          <div>
            <h3 className="text-[15px] font-semibold text-ink">Conflict of interest</h3>
            <p className="mt-1 max-w-[76ch] text-small text-muted">
              {conflict.explanation ?? conflict.message ?? 'This reviewer cannot review this paper.'}
              {reviewerName ? ` The assignment for ${reviewerName} was not created.` : ' The assignment was not created.'}
            </p>
            <p className="mt-2 font-mono text-[11px] text-faint">409 · {conflict.error}</p>
          </div>
        </div>
        <button type="button" onClick={onDismiss} aria-label="Dismiss conflict notice" className="rounded-sm p-1 text-faint hover:text-ink">
          <X size={15} strokeWidth={1.5} />
        </button>
      </div>
      {pathGraph ? (
        <div className="mt-3">
          <p className="mb-2 text-caption text-faint">The conflicting path, as returned by the database</p>
          <GraphCanvas graph={pathGraph} mode="conflict" height={260} ariaLabel="Conflict of interest path between reviewer, author and paper" />
        </div>
      ) : (
        <Button className="mt-3" variant="secondary" size="sm" onClick={onDismiss}>Choose another reviewer</Button>
      )}
    </section>
  );
}
