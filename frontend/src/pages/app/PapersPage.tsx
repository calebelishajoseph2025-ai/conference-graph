import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Download, Filter, PencilLine, Plus, Search, Trash2 } from 'lucide-react';
import { usePaper, usePapers } from '@/api/hooks/queries';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState } from '@/components/ui/ErrorState';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { PaperDrawer } from '@/components/domain/PaperDrawer';
import { AddPaperDialog } from '@/components/domain/AddPaperDialog';
import { StatusDialog } from '@/components/domain/StatusDialog';
import { DeleteDialog } from '@/components/domain/DeleteDialog';
import { PaperRowActions } from '@/components/domain/PaperRowActions';
import type { PaperListItem } from '@/api/schemas/papers';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { formatDate, score, truncate } from '@/lib/format';
import { exportToCsv } from '@/lib/csv';
import { useSession } from '@/session/SessionProvider';
import { can } from '@/session/personas';
import content from '@/content/projectContent.json';
const STATUSES = ['Submitted', 'Under Review', 'Accepted', 'Rejected'];
const PAGE_SIZES = [10, 25, 50];
export function PapersPage() {
  const [params, setParams] = useSearchParams();
  const { session } = useSession();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);
  const pageSize = PAGE_SIZES.includes(Number(params.get('size'))) ? Number(params.get('size')) : 10;
  const status = params.get('status') ?? '';
  const conf = params.get('conf') ?? '';
  const qParam = params.get('q') ?? '';
  const [q, setQ] = useState(qParam);
  const debounced = useDebouncedValue(q, 250);

  useEffect(() => {
    if (debounced === qParam) return;
    const next = new URLSearchParams(params);
    if (debounced.trim()) next.set('q', debounced.trim().slice(0, 100));
    else next.delete('q');
    next.set('page', '1');
    setParams(next, { replace: true });
  }, [debounced, qParam, params, setParams]);

  const papers = usePapers({ q: qParam, status, confId: conf, page, pageSize });
  const data = papers.data;
  const selectedPaper = usePaper(statusOpen || deleteOpen ? selected : null);

  const setFilter = (key: string, value: string): void => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set('page', '1');
    setParams(next);
  };

  const setPage = (value: number): void => {
    const next = new URLSearchParams(params);
    next.set('page', String(value));
    setParams(next);
  };

  const setPageSize = (value: number): void => {
    const next = new URLSearchParams(params);
    next.set('size', String(value));
    next.set('page', '1');
    setParams(next);
  };

  const columns: Column<PaperListItem>[] = [
    {
      key: 'id',
      header: 'ID',
      render: (paper) => <span className="font-mono text-[11px] text-faint">#{paper.paperId}</span>,
    },
    {
      key: 'title',
      header: 'Title',
      render: (paper) => (
        <div className="min-w-[260px] max-w-[420px]">
          <p className="line-clamp-2 font-medium text-ink" title={paper.title}>{paper.title}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {paper.keywords.slice(0, 2).map((keyword) => (
              <span key={keyword.keywordId} className="text-[11px] text-faint">{keyword.keyword}</span>
            ))}
            {paper.keywords.length > 2 ? <span className="text-[11px] text-faint">+{paper.keywords.length - 2}</span> : null}
          </div>
        </div>
      ),
    },
    {
      key: 'authors',
      header: 'Authors',
      render: (paper) => (
        <span className="text-muted" title={paper.authors.map((author) => author.name).join(', ')}>
          {truncate(paper.authors.map((author) => author.name).join(', '), 34)}
        </span>
      ),
    },
    {
      key: 'track',
      header: 'Track',
      render: (paper) => (
        <div>
          <p className="text-muted">{paper.trackName ?? '—'}</p>
          <p className="text-caption text-faint">{formatDate(paper.submissionDate)}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (paper) => <StatusBadge status={paper.status} /> },
    {
      key: 'reviews',
      header: 'Reviews',
      align: 'right',
      render: (paper) => (
        <span className="text-muted">
          {paper.reviewCount}
          {paper.pendingReviewCount > 0 ? <span className="ml-1 text-warn">+{paper.pendingReviewCount}</span> : null}
        </span>
      ),
    },
    { key: 'score', header: 'Average', align: 'right', render: (paper) => <span className="text-ink">{score(paper.avgScore)}</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (paper) => (
        <PaperRowActions
          paper={paper}
          canStatus={can(session, 'editStatus')}
          canAssign={can(session, 'assignReviewer')}
          canReview={can(session, 'submitReview')}
          canDelete={can(session, 'deletePaper')}
          onView={(row) => setSelected(row.paperId)}
          onStatus={(row) => { setSelected(row.paperId); setStatusOpen(true); }}
          onAssign={(row) => navigate(`/app/assignments/${row.paperId}`)}
          onReview={(row) => navigate(`/app/reviews/${row.paperId}`)}
          onDelete={(row) => { setSelected(row.paperId); setDeleteOpen(true); }}
        />
      ),
    },
  ];

  const exportCurrent = (): void => {
    if (!data) return;
    exportToCsv(
      'papers-page',
      ['paperId', 'title', 'status', 'track', 'conference', 'submissionDate', 'reviewCount', 'avgScore'],
      data.items.map((paper) => [paper.paperId, paper.title, paper.status, paper.trackName, paper.confName, paper.submissionDate, paper.reviewCount, paper.avgScore])
    );
  };

  return (
    <div>
      <PageHeader
        title="Papers"
        description="Create, filter and inspect the conference record. Every row is read from the API."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={exportCurrent} disabled={!data || data.items.length === 0}>
              <Download size={14} strokeWidth={1.5} />
              Export page
            </Button>
            {can(session, 'createPaper') ? (
              <Button size="sm" onClick={() => setAdding(true)}>
                <Plus size={15} strokeWidth={1.5} />
                Add paper
              </Button>
            ) : null}
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" size={14} strokeWidth={1.5} />
            <Input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search titles and abstracts"
              aria-label="Search papers"
              maxLength={100}
              className="pl-8"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter size={13} strokeWidth={1.5} className="text-faint" />
            <select
              aria-label="Filter by status"
              value={status}
              onChange={(event) => setFilter('status', event.target.value)}
              className="h-9 rounded-sm border border-line bg-surface-2 px-2 text-[12px] text-ink"
            >
              <option value="">All statuses</option>
              {STATUSES.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <select
              aria-label="Filter by conference"
              value={conf}
              onChange={(event) => setFilter('conf', event.target.value)}
              className="h-9 max-w-[260px] rounded-sm border border-line bg-surface-2 px-2 text-[12px] text-ink"
            >
              <option value="">All conferences</option>
              {content.referenceData.conferences.map((conference) => (
                <option key={conference.confId} value={conference.confId}>{conference.label}</option>
              ))}
            </select>
          </div>
          <select
            aria-label="Rows per page"
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
            className="h-9 rounded-sm border border-line bg-surface-2 px-2 text-[12px] text-ink"
          >
            {PAGE_SIZES.map((size) => <option key={size} value={size}>{size} per page</option>)}
          </select>
          <Badge>{data ? `${data.total} results` : 'Loading'}</Badge>
        </div>

        {papers.isError ? (
          <div className="p-4"><ErrorState error={papers.error} onRetry={() => void papers.refetch()} /></div>
        ) : (
          <>
            <DataTable
              label="Papers"
              columns={columns}
              rows={data?.items ?? []}
              rowKey={(paper) => paper.paperId}
              loading={papers.isLoading}
              selectedKey={selected}
              onRowClick={(paper) => setSelected(paper.paperId)}
              empty={
                <EmptyState
                  title="No papers match these filters"
                  hint="Clear the search or choose a different status."
                  action={<Button variant="secondary" size="sm" onClick={() => setParams(new URLSearchParams())}>Clear filters</Button>}
                />
              }
            />
            {data ? (
              <Pagination page={data.page} pageSize={data.pageSize} total={data.total} totalPages={data.totalPages} onPage={setPage} />
            ) : null}
          </>
        )}
      </Card>

      <PaperDrawer
        paperId={selected}
        open={selected !== null}
        onOpenChange={(open) => { if (!open) setSelected(null); }}
        footer={
          selected !== null ? (
            <>
              {can(session, 'editStatus') || can(session, 'deletePaper') ? (
                <>
                  <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
                    <Trash2 size={14} strokeWidth={1.5} />
                    Delete
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setStatusOpen(true)}>
                    <PencilLine size={14} strokeWidth={1.5} />
                    Change status
                  </Button>
                </>
              ) : null}
              <Button size="sm" onClick={() => navigate(`/app/papers/${selected}`)}>Open full page</Button>
            </>
          ) : null
        }
      />

      <AddPaperDialog open={adding} onOpenChange={setAdding} onCreated={(paper) => navigate(`/app/papers/${paper.paperId}`)} />
      <StatusDialog
        paper={selectedPaper.data ?? null}
        open={statusOpen}
        onOpenChange={setStatusOpen}
        adminToken={session?.adminToken}
        onUpdated={() => { void papers.refetch(); }}
      />
      <DeleteDialog
        paper={selectedPaper.data ?? null}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        adminToken={session?.adminToken}
        onDeleted={() => { setSelected(null); void papers.refetch(); }}
      />
    </div>
  );
}
