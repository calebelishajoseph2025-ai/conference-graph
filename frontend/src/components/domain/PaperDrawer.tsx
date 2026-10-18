import type { ReactNode } from 'react';
import { usePaper } from '@/api/hooks/queries';
import { Drawer } from '@/components/ui/Drawer';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { StatusBadge } from './StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { formatDate, score } from '@/lib/format';

export function PaperDrawer({
  paperId,
  open,
  onOpenChange,
  blind = false,
  footer,
}: {
  paperId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blind?: boolean;
  footer?: ReactNode;
}) {
  const paper = usePaper(open ? paperId : null);
  const data = paper.data;

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      eyebrow={paperId ? <span className="font-mono">Paper #{paperId}</span> : undefined}
      title={data?.title ?? (paper.isLoading ? 'Loading paper…' : 'Paper')}
      status={
        data ? (
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={data.status} />
            <Badge>{data.track.name}</Badge>
            <Badge>{data.conference.name} {data.conference.year ?? ''}</Badge>
          </div>
        ) : undefined
      }
      footer={footer}
    >
      {paper.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : paper.isError ? (
        <ErrorState error={paper.error} onRetry={() => void paper.refetch()} />
      ) : data ? (
        <div className="space-y-7">
          <section>
            <h3 className="text-caption text-faint">Abstract</h3>
            <p className="mt-2 text-small leading-relaxed text-muted">{data.abstract ?? 'No abstract recorded.'}</p>
          </section>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-caption text-faint">Average score</p>
              <p className="mt-1 text-[20px] font-medium text-ink tabular">{score(data.avgScore)}</p>
            </div>
            <div>
              <p className="text-caption text-faint">Reviews</p>
              <p className="mt-1 text-[20px] font-medium text-ink tabular">{data.reviews.length}</p>
            </div>
            <div>
              <p className="text-caption text-faint">Pending</p>
              <p className="mt-1 text-[20px] font-medium text-ink tabular">{data.pendingReviewCount}</p>
            </div>
            <div>
              <p className="text-caption text-faint">Submitted</p>
              <p className="mt-1 text-[13px] text-ink">{formatDate(data.submissionDate)}</p>
            </div>
          </section>

          <section>
            <h3 className="text-caption text-faint">Authors, in order</h3>
            <ol className="mt-2 divide-y divide-line border-y border-line">
              {[...data.authors].sort((a, b) => a.authorOrder - b.authorOrder).map((author) => (
                <li key={author.authorId} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="text-small text-ink">
                      <span className="mr-1.5 font-mono text-[11px] text-faint">{author.authorOrder}.</span>
                      {author.name}
                      {author.isCorresponding ? (
                        <Badge tone="accent" className="ml-2 px-1.5 py-0 text-[10px]">
                          corresponding
                        </Badge>
                      ) : null}
                    </p>
                    <p className="text-caption text-muted">
                      {author.affiliation ?? 'No affiliation'} · {author.country ?? '—'}
                      {!blind && author.email ? ` · ${author.email}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h3 className="text-caption text-faint">Keywords</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {data.keywords.map((keyword) => (
                <Badge key={keyword.keywordId}>{keyword.keyword}</Badge>
              ))}
              {data.keywords.length === 0 ? <p className="text-small text-faint">None recorded.</p> : null}
            </div>
          </section>

          <section>
            <h3 className="text-caption text-faint">Reviews</h3>
            <div className="mt-2 space-y-2">
              {data.reviews.map((review) => (
                <article key={review.reviewId} className="rounded-md border border-line bg-surface-2 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-small text-ink">
                      {blind ? `Anonymous reviewer #${review.reviewerId}` : review.reviewerName}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] text-ink tabular">{review.score}/10</span>
                      <Badge tone={review.recommendation === 'Accept' ? 'ok' : review.recommendation === 'Reject' ? 'bad' : 'warn'}>
                        {review.recommendation}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-muted">{review.comments}</p>
                  <p className="mt-2 text-[11px] text-faint">{formatDate(review.reviewDate)}</p>
                </article>
              ))}
              {data.reviews.length === 0 ? <p className="text-small text-faint">No reviews yet.</p> : null}
            </div>
          </section>

          <section>
            <h3 className="text-caption text-faint">Assigned reviewers</h3>
            <ul className="mt-2 divide-y divide-line border-y border-line">
              {data.assignments.map((assignment) => (
                <li key={assignment.reviewerId} className="flex items-start justify-between gap-3 py-2">
                  <div>
                    <p className="text-small text-ink">
                      {blind ? `Reviewer #${assignment.reviewerId}` : assignment.name}
                    </p>
                    <p className="text-caption text-muted">
                      {assignment.expertise ?? 'General'} · assigned {formatDate(assignment.assignedDate)}
                    </p>
                  </div>
                  <Badge tone={assignment.hasReviewed ? 'ok' : 'neutral'}>{assignment.hasReviewed ? 'reviewed' : 'pending'}</Badge>
                </li>
              ))}
              {data.assignments.length === 0 ? <li className="py-2 text-small text-faint">No reviewers assigned.</li> : null}
            </ul>
          </section>
        </div>
      ) : null}
    </Drawer>
  );
}
