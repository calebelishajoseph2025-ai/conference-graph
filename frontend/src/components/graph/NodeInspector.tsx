import { ArrowRight, Expand, MousePointerClick } from 'lucide-react';
import type { ReactNode } from 'react';
import type { GraphNode } from '@/api/schemas/common';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CopyButton } from '@/components/ui/CopyButton';
import { EmptyState } from '@/components/ui/ErrorState';
import { formatDate, score } from '@/lib/format';

const PROP_LABELS: Record<string, string> = {
  paperId: 'Paper ID',
  authorId: 'Author ID',
  reviewerId: 'Reviewer ID',
  confId: 'Conference ID',
  conferenceId: 'Conference ID',
  trackId: 'Track ID',
  keywordId: 'Keyword ID',
  sessionId: 'Session ID',
  presentationId: 'Presentation ID',
  submissionDate: 'Submitted',
  assignedDate: 'Assigned',
  reviewDate: 'Reviewed',
  avgScore: 'Average Score',
  authorOrder: 'Author Order',
  isCorresponding: 'Corresponding',
  reviewCount: 'Reviews',
  totalPapers: 'Total Papers',
  sharedPapers: 'Shared Papers',
  conflictType: 'Conflict Type',
  coAuthors: 'Co-Authors',
  conferenceName: 'Conference',
  trackName: 'Track',
};

function formatPropKey(key: string): string {
  if (PROP_LABELS[key]) return PROP_LABELS[key];
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatPropValue(key: string, value: unknown): ReactNode {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') {
    return value ? <Badge tone="accent" className="px-1.5 py-0 text-[10px]">Yes</Badge> : 'No';
  }
  if (/date/i.test(key) && typeof value === 'string') {
    return formatDate(value);
  }
  if (typeof value === 'number' && /score/i.test(key)) {
    return score(value);
  }
  return String(value);
}

export function NodeInspector({
  node,
  onExpand,
  editable = false,
}: {
  node: GraphNode | null;
  onExpand?: (depth: 1 | 2) => void;
  editable?: boolean;
}) {
  if (!node) {
    return (
      <EmptyState
        icon={<MousePointerClick size={22} strokeWidth={1.5} />}
        title="Select a node"
        hint="Click any node in the graph to read its properties and traverse from it."
      />
    );
  }
  const entries = Object.entries(node.props);
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-caption text-faint">{node.type}</p>
          <p className="mt-1 break-words text-small font-medium text-ink">{node.label}</p>
        </div>
        <span className="shrink-0 rounded-sm border border-line px-1.5 py-0.5 font-mono text-[10px] text-faint">{node.id}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-1">
        <CopyButton text={String(node.props[`${node.type.toLowerCase()}Id`] ?? node.id)} label="Copy id" />
      </div>
      <dl className="mt-4 divide-y divide-line border-t border-line">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-baseline gap-3 py-2">
            <dt className="w-[42%] shrink-0 text-[11px] font-medium text-faint" title={key}>
              {formatPropKey(key)}
            </dt>
            <dd className="min-w-0 flex-1 break-words text-[12px] text-muted">
              {formatPropValue(key, value)}
            </dd>
          </div>
        ))}
        {entries.length === 0 ? <p className="py-2 text-[12px] text-faint">This node has no properties.</p> : null}
      </dl>
      {editable && onExpand ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => onExpand(1)}>
            <Expand size={14} strokeWidth={1.5} />
            Expand 1 hop
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onExpand(2)}>
            <ArrowRight size={14} strokeWidth={1.5} />
            Expand 2 hops
          </Button>
        </div>
      ) : null}
    </div>
  );
}
