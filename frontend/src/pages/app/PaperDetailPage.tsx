import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, PencilLine, Trash2, UserCheck, ClipboardCheck } from 'lucide-react';
import { usePaper } from '@/api/hooks/queries';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusDialog } from '@/components/domain/StatusDialog';
import { DeleteDialog } from '@/components/domain/DeleteDialog';
import { formatDate, plural, score } from '@/lib/format';
import { useSession } from '@/session/SessionProvider';
import { can } from '@/session/personas';
import { useState } from 'react';

export function PaperDetailPage() {
  const { paperId } = useParams();
  const id = Number(paperId);
  const paper = usePaper(Number.isInteger(id) && id > 0 ? id : null);
  const { session } = useSession();
  const navigate = useNavigate();
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (paper.isError) {
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/papers')}>
          <ArrowLeft size={14} strokeWidth={1.5} /> Back to papers
        </Button>
        <div className="mt-4"><ErrorState error={paper.error} onRetry={() => void paper.refetch()} /></div>
      </div>
    );
  }

  if (!paper.data) {
    return <div className="space-y-3"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-56 w-full" /></div>;
  }

  const data = paper.data;
  const accepted = data.status === 'Accepted';

  return (
    <div>
      <Link to="/app/papers" className="mb-4 inline-flex items-center gap-1.5 text-caption text-muted hover:text-ink">
        <ArrowLeft size={13} strokeWidth={1.5} /> All papers
      </Link>
      <PageHeader
        eyebrow={`Paper #${data.paperId}`}
        title={data.title}
        description={`${data.conference.name} ${data.conference.year ?? ''} · ${data.conference.venue ?? ''} · ${data.track.name}`}
        actions={
          <>
            {can(session, 'assignReviewer') ? (
              <Button variant="secondary" size="sm" onClick={() => navigate(`/app/assignments?paperId=${data.paperId}`)}>
                <UserCheck size={14} strokeWidth={1.5} /> Assign reviewers
              </Button>
            ) : null}
            {can(session, 'submitReview') ? (
              <Button size="sm" onClick={() => navigate(`/app/reviews?paperId=${data.paperId}`)}>
                <ClipboardCheck size={14} strokeWidth={1.5} /> Review
              </Button>
            ) : null}
          </>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <StatusBadge status={data.status} />
        <Badge>submitted {formatDate(data.submissionDate)}</Badge>
        <Badge>{plural(data.reviews.length, 'review')}</Badge>
        <Badge>{data.pendingReviewCount} pending</Badge>
        {accepted ? <Badge tone="ok">accepted</Badge> : null}
        {can(session, 'editStatus') ? (
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setStatusOpen(true)}><PencilLine size={14} strokeWidth={1.5} /> Change status</Button>
            <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 size={14} strokeWidth={1.5} /> Delete</Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Abstract" />
            <CardBody><p className="max-w-[76ch] text-small leading-relaxed text-muted">{data.abstract ?? 'No abstract recorded.'}</p></CardBody>
          </Card>

          <Card>
            <CardHeader title="Authors" description="In authorship order." />
            <CardBody>
              <ol className="divide-y divide-line">
                {[...data.authors].sort((a, b) => a.authorOrder - b.authorOrder).map((author) => (
                  <li key={author.authorId} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-small text-ink">
                        <span className="mr-2 font-mono text-[11px] text-faint">{author.authorOrder}</span>
                        {author.name}
                        {author.isCorresponding ? <Badge tone="accent" className="ml-2">corresponding</Badge> : null}
                      </p>
                      <p className="mt-0.5 text-caption text-muted">
                        {author.affiliation ?? 'No affiliation'}{author.country ? ` · ${author.country}` : ''}{author.email ? ` · ${author.email}` : ''}
                      </p>
                    </div>
                    <Link to={`/app/graph?type=author&id=${author.authorId}`} className="text-caption text-muted underline underline-offset-4 hover:text-ink">Graph</Link>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Reviews" description="Scores and recommendations." />
            <CardBody>
              <div className="space-y-3">
                {data.reviews.map((review) => (
                  <article key={review.reviewId} className="rounded-md border border-line bg-surface-2 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-small text-ink">{review.reviewerName}</p>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[12px] text-ink tabular">{review.score}/10</span>
                        <Badge tone={review.recommendation === 'Accept' ? 'ok' : review.recommendation === 'Reject' ? 'bad' : 'warn'}>{review.recommendation}</Badge>
                      </div>
                    </div>
                    <p className="mt-2 text-[12px] leading-relaxed text-muted">{review.comments}</p>
                    <p className="mt-2 text-[11px] text-faint">{formatDate(review.reviewDate)}</p>
                  </article>
                ))}
                {data.reviews.length === 0 ? <p className="text-small text-faint">No reviews submitted yet.</p> : null}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Score" />
            <CardBody>
              <p className="text-grad text-[44px] font-medium leading-none tracking-[-0.04em] tabular">{score(data.avgScore)}</p>
              <p className="mt-1 text-caption text-faint">average of {plural(data.reviews.length, 'review')}</p>
              <div className="mt-4 space-y-2">
                {data.keywords.map((keyword) => <Badge key={keyword.keywordId}>{keyword.keyword}</Badge>)}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Assignments" description={plural(data.assignments.length, 'reviewer')} />
            <CardBody>
              <ul className="divide-y divide-line">
                {data.assignments.map((assignment) => (
                  <li key={assignment.reviewerId} className="py-3 first:pt-0 last:pb-0">
                    <p className="text-small text-ink">{assignment.name}</p>
                    <p className="text-caption text-muted">{assignment.expertise ?? 'General'} · {assignment.affiliation ?? '—'}</p>
                    <div className="mt-1.5"><Badge tone={assignment.hasReviewed ? 'ok' : 'neutral'}>{assignment.hasReviewed ? 'review submitted' : 'awaiting review'}</Badge></div>
                  </li>
                ))}
                {data.assignments.length === 0 ? <li className="text-small text-faint">No reviewers assigned.</li> : null}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>

      <StatusDialog paper={data} open={statusOpen} onOpenChange={setStatusOpen} adminToken={session?.adminToken} onUpdated={() => void paper.refetch()} />
      <DeleteDialog paper={data} open={deleteOpen} onOpenChange={setDeleteOpen} adminToken={session?.adminToken} onDeleted={() => navigate('/app/papers')} />
    </div>
  );
}
