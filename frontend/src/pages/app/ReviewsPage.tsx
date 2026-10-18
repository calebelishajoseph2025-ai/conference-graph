import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ClipboardCheck, FileText } from 'lucide-react';
import { usePaper, usePapers, useReviewer } from '@/api/hooks/queries';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState, ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { SmartCombobox } from '@/components/domain/SmartCombobox';
import { ReviewForm } from '@/components/domain/ReviewForm';
import { useSession } from '@/session/SessionProvider';
import { formatDate, plural, score, truncate } from '@/lib/format';
import { intParam } from '@/api/params';
import { cn } from '@/lib/cn';

const NEEDS_REVIEW = ['Under Review', 'Submitted'] as const;

export function ReviewsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { session } = useSession();
  const { paperId: pathPaperId } = useParams();
  const selected = intParam(pathPaperId ?? null) ?? intParam(params.get('paperId'));
  const [tab, setTab] = useState<(typeof NEEDS_REVIEW)[number]>('Under Review');
  const [reviewerChoice, setReviewerChoice] = useState<number | null>(null);

  const list = usePapers({ status: tab, page: 1, pageSize: 8 });
  const paper = usePaper(selected);
  const sessionReviewer = session?.identity?.kind === 'reviewer' ? session.identity : null;
  const fallbackReviewer = useReviewer(sessionReviewer ? null : 2);

  useEffect(() => setReviewerChoice(null), [selected]);

  const selectPaper = (id: number): void => {
    navigate(`/app/reviews/${id}`);
  };

  const assignments = paper.data?.assignments ?? [];
  const chosenAssignment =
    assignments.find((item) => item.reviewerId === reviewerChoice)
    ?? assignments.find((item) => !item.hasReviewed)
    ?? assignments[0]
    ?? null;
  const defaultReviewer = sessionReviewer
    ? { id: sessionReviewer.id, name: sessionReviewer.name }
    : chosenAssignment
      ? { id: chosenAssignment.reviewerId, name: chosenAssignment.name }
      : fallbackReviewer.data
        ? { id: fallbackReviewer.data.reviewerId, name: fallbackReviewer.data.name }
        : null;
  const reviewerLocked = Boolean(sessionReviewer || chosenAssignment);

  return (
    <div>
      <PageHeader
        title="Reviews"
        description="Submit a score, comments and a recommendation. The database applies the auto-accept rule."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-full max-w-md">
          <SmartCombobox
            kind="paper"
            value={paper.data ? { id: paper.data.paperId, label: paper.data.title } : null}
            onSelect={(option) => selectPaper(option.id)}
            onClear={() => {
              const next = new URLSearchParams(params);
              next.delete('paperId');
              setParams(next);
            }}
            placeholder="Search any paper by title"
          />
        </div>
        <p className="text-caption text-faint">or pick one from the queue</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.25fr]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <Tabs
              label="Review queue"
              tabs={NEEDS_REVIEW.map((status) => ({ value: status, label: status }))}
              value={tab}
              onChange={(value) => setTab(value)}
              right={<Badge>{list.data?.total ?? '—'} papers</Badge>}
            />
            <div className="divide-y divide-line">
              {list.isError ? (
                <div className="p-4"><ErrorState error={list.error} onRetry={() => void list.refetch()} /></div>
              ) : list.isLoading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}
                </div>
              ) : list.data && list.data.items.length > 0 ? (
                list.data.items.map((item) => (
                  <button
                    key={item.paperId}
                    type="button"
                    onClick={() => selectPaper(item.paperId)}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-fast hover:bg-surface-2',
                      selected === item.paperId && 'bg-surface-2'
                    )}
                  >
                    <FileText size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-faint" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-small font-medium text-ink">{item.title}</p>
                      <p className="mt-0.5 text-caption text-muted">
                        {item.trackName ?? 'No track'} · {plural(item.reviewCount, 'review')}
                        {item.pendingReviewCount > 0 ? ` · ${item.pendingReviewCount} pending` : ''}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </button>
                ))
              ) : (
                <EmptyState
                  icon={<ClipboardCheck size={22} strokeWidth={1.5} />}
                  title={`No papers ${tab.toLowerCase()}`}
                  hint="Choose a paper from the search above to review it directly."
                />
              )}
            </div>
          </Card>

          {paper.data ? (
            <Card>
              <CardHeader title="Existing reviews" description={`Paper #${paper.data.paperId}`} />
              <CardBody>
                {paper.data.reviews.length === 0 ? (
                  <p className="text-small text-faint">No reviews yet. Be the first.</p>
                ) : (
                  <div className="space-y-2">
                    {paper.data.reviews.map((review) => (
                      <div key={review.reviewId} className="rounded-md border border-line bg-surface-2 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-small text-ink">
                            {session?.persona === 'reviewer' ? `Reviewer #${review.reviewerId}` : review.reviewerName}
                          </span>
                          <span className="font-mono text-[12px] text-ink tabular">{review.score}/10</span>
                        </div>
                        <p className="mt-1 text-[12px] text-muted">{review.comments}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <Badge tone={review.recommendation === 'Accept' ? 'ok' : review.recommendation === 'Reject' ? 'bad' : 'warn'}>{review.recommendation}</Badge>
                          <span className="text-[11px] text-faint">{formatDate(review.reviewDate)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          ) : null}
        </div>

        <div>
          {selected === null ? (
            <Card>
              <EmptyState
                title="Choose a paper to review"
                hint="Search by title or select one from the queue. The form records a real review and may auto-accept the paper."
              />
            </Card>
          ) : paper.isError ? (
            <ErrorState error={paper.error} onRetry={() => void paper.refetch()} />
          ) : !paper.data ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <div className="space-y-4">
              <Card>
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-caption text-faint">Paper #{paper.data.paperId}</p>
                      <h2 className="mt-1 text-h3 leading-tight text-ink">{paper.data.title}</h2>
                      <p className="mt-1 text-caption text-muted">{truncate(paper.data.abstract ?? '', 160)}</p>
                    </div>
                    <StatusBadge status={paper.data.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>avg {score(paper.data.avgScore)}</Badge>
                    <Badge>{plural(paper.data.reviews.length, 'review')}</Badge>
                    <Badge>{paper.data.pendingReviewCount} pending</Badge>
                    <Badge>{paper.data.track.name}</Badge>
                  </div>
                </CardBody>
              </Card>
              {assignments.length > 0 ? (
                <Card>
                  <CardHeader title="Assigned reviewers" description="Pick one to write their review. Submitted reviews are locked." />
                  <CardBody className="grid gap-2 sm:grid-cols-2">
                    {assignments.map((assignment) => {
                      const active = chosenAssignment?.reviewerId === assignment.reviewerId;
                      return (
                        <button
                          key={assignment.reviewerId}
                          type="button"
                          disabled={assignment.hasReviewed}
                          aria-pressed={active}
                          onClick={() => setReviewerChoice(assignment.reviewerId)}
                          className={cn(
                            'rounded-md border p-3 text-left transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-60',
                            active ? 'border-ink bg-surface-2' : 'border-line hover:border-line-strong'
                          )}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-small font-medium text-ink">{assignment.name}</span>
                            <Badge tone={assignment.hasReviewed ? 'ok' : 'neutral'}>{assignment.hasReviewed ? 'reviewed' : 'pending'}</Badge>
                          </span>
                          <span className="mt-1 block truncate text-caption text-faint">{assignment.expertise ?? 'General'} · {formatDate(assignment.assignedDate)}</span>
                        </button>
                      );
                    })}
                  </CardBody>
                </Card>
              ) : (
                <p className="rounded-md border border-line bg-surface-2 p-3 text-caption text-faint">
                  This paper has no assigned reviewers. Choose a reviewer in the form to record a review.
                </p>
              )}
              {chosenAssignment?.hasReviewed ? (
                <Card>
                  <CardBody>
                    <p className="text-small font-medium text-ink">Every assigned reviewer has submitted.</p>
                    <p className="mt-1 text-caption text-muted">The paper’s existing reviews are shown on the left. A reviewer can submit only once.</p>
                  </CardBody>
                </Card>
              ) : (
                <ReviewForm
                  key={`${paper.data.paperId}-${defaultReviewer?.id ?? 'none'}`}
                  paperId={paper.data.paperId}
                  paperStatus={paper.data.status}
                  defaultReviewer={defaultReviewer}
                  lockReviewer={reviewerLocked}
                  onSubmitted={() => {
                    void paper.refetch();
                    void list.refetch();
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
