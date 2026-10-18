import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ClipboardCheck, UserRound } from 'lucide-react';
import { usePaper, useReviewer } from '@/api/hooks/queries';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Stat } from '@/components/ui/Stat';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState, EmptyState } from '@/components/ui/ErrorState';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { ReviewForm } from '@/components/domain/ReviewForm';
import { useSession } from '@/session/SessionProvider';
import { formatDate, score } from '@/lib/format';
import { cn } from '@/lib/cn';

export function MyReviewsPage() {
  const { paperId } = useParams();
  const navigate = useNavigate();
  const { session } = useSession();
  const reviewerId = session?.identity?.kind === 'reviewer' ? session.identity.id : null;
  const profile = useReviewer(reviewerId);
  const selectedId = paperId ? Number(paperId) : null;
  const paper = usePaper(selectedId);

  if (reviewerId === null) {
    return (
      <Card>
        <EmptyState icon={<UserRound size={22} strokeWidth={1.5} />} title="This view needs a reviewer identity" hint="Sign in from the Reviewer card on the home page." />
      </Card>
    );
  }

  if (profile.isError) return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />;
  if (!profile.data) return <Skeleton className="h-96 w-full" />;

  const reviewer = profile.data;
  const assignments = [...reviewer.assignedPapers].sort((a, b) => Number(a.hasReviewed) - Number(b.hasReviewed));
  const selectedAssignment = assignments.find((item) => item.paperId === selectedId) ?? null;

  return (
    <div>
      <PageHeader
        eyebrow="Reviewer view"
        title={reviewer.name}
        description={`${reviewer.expertise ?? 'General'} · ${reviewer.affiliation ?? 'No affiliation'}`}
      />

      {reviewer.linkedAuthorId ? (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-warn/40 bg-warn/5 p-3">
          <AlertTriangle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-warn" />
          <p className="text-small text-muted">
            You are also author <strong className="font-medium text-ink">{reviewer.linkedAuthorName}</strong> (#{reviewer.linkedAuthorId}) in this graph.
            Papers you wrote cannot be assigned to you; the database enforces this.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardBody className="grid gap-6 sm:grid-cols-4">
              <Stat caption="Active workload" value={reviewer.activeWorkload} hint="pending assignments" />
              <Stat caption="Reviews done" value={reviewer.totalReviews} />
              <Stat caption="Assignments" value={reviewer.totalAssignments} />
              <Stat caption="Average given" value={reviewer.avgScoreGiven} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Your assigned papers" description="Pending first. Select one to review it." />
            <div className="divide-y divide-line">
              {assignments.map((assignment) => (
                <button
                  key={assignment.paperId}
                  type="button"
                  onClick={() => navigate(`/app/my-reviews/${assignment.paperId}`)}
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-fast hover:bg-surface-2',
                    selectedId === assignment.paperId && 'bg-surface-2'
                  )}
                >
                  <ClipboardCheck size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-faint" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-small font-medium text-ink">{assignment.title}</p>
                    <p className="mt-0.5 text-caption text-muted">
                      #{assignment.paperId} · {assignment.trackName ?? 'No track'} · assigned {formatDate(assignment.assignedDate)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                    <StatusBadge status={assignment.status} />
                    <Badge tone={assignment.hasReviewed ? 'ok' : 'neutral'}>{assignment.hasReviewed ? 'reviewed' : 'pending'}</Badge>
                  </div>
                </button>
              ))}
              {assignments.length === 0 ? <div className="p-4 text-small text-faint">No papers assigned.</div> : null}
            </div>
          </Card>
        </div>

        <div>
          {!selectedAssignment ? (
            <Card>
              <EmptyState title="Choose a paper" hint="Pick one of your assigned papers to write or revisit the review." />
            </Card>
          ) : selectedAssignment.hasReviewed ? (
            <Card>
              <CardHeader title="Review submitted" description={`Your score for paper #${selectedAssignment.paperId}.`} />
              <CardBody>
                <div className="flex items-baseline gap-3">
                  <span className="text-grad text-[44px] font-medium leading-none tracking-[-0.04em] tabular">{score(selectedAssignment.score)}</span>
                  <span className="text-caption text-faint">/ 10</span>
                  <Badge tone={selectedAssignment.recommendation === 'Accept' ? 'ok' : selectedAssignment.recommendation === 'Reject' ? 'bad' : 'warn'}>
                    {selectedAssignment.recommendation}
                  </Badge>
                </div>
                <p className="mt-3 text-small text-muted">A reviewer submits one review per paper. The existing review is shown, not a second form.</p>
                {paper.data ? (
                  <div className="mt-4 border-t border-line pt-3">
                    <p className="text-small font-medium text-ink">{paper.data.title}</p>
                    <p className="mt-2 text-caption leading-relaxed text-muted">{paper.data.abstract}</p>
                  </div>
                ) : null}
              </CardBody>
            </Card>
          ) : paper.isLoading ? (
            <Skeleton className="h-80" />
          ) : paper.isError ? (
            <ErrorState error={paper.error} onRetry={() => void paper.refetch()} />
          ) : paper.data ? (
            <div className="space-y-4">
              <Card>
                <CardHeader
                  title="Paper under review"
                  description={`#${paper.data.paperId} · blind to author names`}
                  actions={<Badge>{paper.data.track.name}</Badge>}
                />
                <CardBody>
                  <p className="text-small font-medium leading-snug text-ink">{paper.data.title}</p>
                  <p className="mt-2 text-caption leading-relaxed text-muted">{paper.data.abstract}</p>
                </CardBody>
              </Card>
              <ReviewForm
                paperId={paper.data.paperId}
                paperStatus={paper.data.status}
                defaultReviewer={{ id: reviewer.reviewerId, name: reviewer.name }}
                lockReviewer
                onSubmitted={() => { void profile.refetch(); void paper.refetch(); }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
