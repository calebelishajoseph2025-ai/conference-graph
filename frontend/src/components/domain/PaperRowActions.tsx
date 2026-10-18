import { ClipboardCheck, Eye, PencilLine, Trash2, UserPlus } from 'lucide-react';
import type { PaperListItem } from '@/api/schemas/papers';

const BUTTON = 'rounded-sm p-1.5 text-faint transition-colors duration-fast hover:bg-surface-3 hover:text-ink';

export function PaperRowActions({
  paper,
  canStatus,
  canAssign,
  canReview,
  canDelete,
  onView,
  onStatus,
  onAssign,
  onReview,
  onDelete,
}: {
  paper: PaperListItem;
  canStatus: boolean;
  canAssign: boolean;
  canReview: boolean;
  canDelete: boolean;
  onView: (paper: PaperListItem) => void;
  onStatus: (paper: PaperListItem) => void;
  onAssign: (paper: PaperListItem) => void;
  onReview: (paper: PaperListItem) => void;
  onDelete: (paper: PaperListItem) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-0.5" onClick={(event) => event.stopPropagation()}>
      <button type="button" className={BUTTON} onClick={() => onView(paper)} aria-label={`View paper ${paper.paperId}`} title="View record">
        <Eye size={14} strokeWidth={1.5} />
      </button>
      {canStatus ? (
        <button type="button" className={BUTTON} onClick={() => onStatus(paper)} aria-label={`Change status of paper ${paper.paperId}`} title="Change status">
          <PencilLine size={14} strokeWidth={1.5} />
        </button>
      ) : null}
      {canAssign ? (
        <button type="button" className={BUTTON} onClick={() => onAssign(paper)} aria-label={`Assign reviewers to paper ${paper.paperId}`} title="Assign reviewers">
          <UserPlus size={14} strokeWidth={1.5} />
        </button>
      ) : null}
      {canReview ? (
        <button type="button" className={BUTTON} onClick={() => onReview(paper)} aria-label={`Review paper ${paper.paperId}`} title="Review">
          <ClipboardCheck size={14} strokeWidth={1.5} />
        </button>
      ) : null}
      {canDelete ? (
        <button type="button" className={BUTTON} onClick={() => onDelete(paper)} aria-label={`Delete paper ${paper.paperId}`} title="Delete">
          <Trash2 size={14} strokeWidth={1.5} />
        </button>
      ) : null}
    </div>
  );
}
