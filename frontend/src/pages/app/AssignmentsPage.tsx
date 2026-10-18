import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useOracleAssign, useAssignReviewer } from '@/api/hooks/mutations';
import { useCoiPairs, usePaper, useRecommend } from '@/api/hooks/queries';
import { toApiError, type ConflictDetail } from '@/api/errors';
import type { OracleAssignResult } from '@/api/schemas/papers';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { SmartCombobox } from '@/components/domain/SmartCombobox';
import { RecommendationCard } from '@/components/domain/RecommendationCard';
import { ConflictPanel } from '@/components/domain/ConflictPanel';
import { useSession } from '@/session/SessionProvider';
import { can } from '@/session/personas';
import { useToast } from '@/components/ui/Toast';
import { formatDate, truncate } from '@/lib/format';
import { intParam } from '@/api/params';
import { OraclePanel, RiskyDemo } from './assignments/AssignmentPanels';

export function AssignmentsPage() {
  const [params, setParams] = useSearchParams();
  const { session } = useSession();
  const { toast } = useToast();
  const { paperId: pathPaperId } = useParams();
  const paperId = intParam(pathPaperId ?? null) ?? intParam(params.get('paperId'));
  const paper = usePaper(paperId);
  const recommendations = useRecommend(paperId, 8);
  const risky = params.get('risky') === '1';
  const coi = useCoiPairs();
  const riskyPair = risky && paperId !== null ? coi.data?.items.find((item) => item.paperId === paperId) ?? null : null;
  const assign = useAssignReviewer();
  const oracle = useOracleAssign();

  const [conflict, setConflict] = useState<{ detail: ConflictDetail; reviewerName: string } | null>(null);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [oracleReviewer, setOracleReviewer] = useState<{ id: number; name: string } | null>(null);
  const [dryRun, setDryRun] = useState<OracleAssignResult | null>(null);
  const [dryError, setDryError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    setConflict(null);
    setDryRun(null);
    setDryError('');
    setOracleReviewer(null);
  }, [paperId]);

  useEffect(() => {
    if (riskyPair) {
      setOracleReviewer((previous) =>
        previous?.id === riskyPair.reviewerId
          ? previous
          : { id: riskyPair.reviewerId, name: riskyPair.reviewerName ?? `Reviewer #${riskyPair.reviewerId}` }
      );
      return;
    }
    const first = recommendations.data?.recommendations[0];
    if (first) setOracleReviewer((previous) => previous ?? { id: first.reviewerId, name: first.name });
  }, [recommendations.data, riskyPair]);

  const selectPaper = (id: number | null): void => {
    const next = new URLSearchParams(params);
    if (id) next.set('paperId', String(id));
    else next.delete('paperId');
    next.delete('risky');
    setParams(next);
  };

  const openRisky = (): void => {
    const next = new URLSearchParams(params);
    next.set('paperId', '1');
    next.set('risky', '1');
    setParams(next);
  };

  const runAssign = async (reviewerId: number): Promise<void> => {
    if (!paperId) return;
    setAssigningId(reviewerId);
    setConflict(null);
    try {
      const result = await assign.mutateAsync({ paperId, reviewerId });
      toast('Reviewer assigned', { tone: 'success', description: `${result.reviewerName} is now assigned to paper #${paperId}.` });
      void paper.refetch();
      void recommendations.refetch();
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.conflict) {
        const name = recommendations.data?.recommendations.find((item) => item.reviewerId === reviewerId)?.name
          ?? riskyPair?.reviewerName
          ?? `#${reviewerId}`;
        setConflict({ detail: apiError.conflict, reviewerName: name });
      } else {
        toast('Could not assign the reviewer', { tone: 'error', description: apiError.message });
      }
    } finally {
      setAssigningId(null);
    }
  };

  const runDryRun = async (): Promise<void> => {
    if (!paperId || !oracleReviewer) return;
    setDryError('');
    setDryRun(null);
    try {
      const result = await oracle.mutateAsync({ paperId, reviewerId: oracleReviewer.id, commit: false, confirm: false, adminToken: session?.adminToken });
      setDryRun(result);
    } catch (error) {
      setDryError(toApiError(error).message);
    }
  };

  const runCommit = async (): Promise<void> => {
    if (!paperId || !oracleReviewer) return;
    try {
      const result = await oracle.mutateAsync({ paperId, reviewerId: oracleReviewer.id, commit: true, confirm: true, adminToken: session?.adminToken });
      toast('Committed through Oracle', { tone: 'success', description: result.message ?? 'The assignment was written to both databases.' });
      setConfirmed(false);
      setDryRun(result);
      void paper.refetch();
      void recommendations.refetch();
    } catch (error) {
      toast('Commit failed', { tone: 'error', description: toApiError(error).message });
    }
  };

  const roster = paper.data?.assignments ?? [];

  return (
    <div>
      <PageHeader
        title="Reviewer assignment"
        description="Rank reviewers by an explainable score, catch conflicts before they happen, and run the Oracle procedure."
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full max-w-xl">
          <p className="mb-1.5 text-caption text-faint">Paper</p>
          <SmartCombobox
            kind="paper"
            value={paper.data ? { id: paper.data.paperId, label: paper.data.title } : null}
            onSelect={(option) => selectPaper(option.id)}
            onClear={() => selectPaper(null)}
            placeholder="Search papers by title"
          />
        </div>
        {paper.data ? (
          <Link to={`/app/papers/${paper.data.paperId}`} className="pb-1 text-caption text-muted underline underline-offset-4 hover:text-ink">
            Open paper page
          </Link>
        ) : null}
      </div>

      {paperId === null ? (
        <Card>
          <EmptyState
            icon={<Sparkles size={22} strokeWidth={1.5} />}
            title="Choose a paper"
            hint="Pick a paper to see ranked reviewers, its current roster, and the Oracle assignment procedure."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => selectPaper(1)}>Open paper #1</Button>
                <Button variant="secondary" size="sm" onClick={openRisky}>Try the risky pair</Button>
              </div>
            }
          />
        </Card>
      ) : paper.isError ? (
        <ErrorState error={paper.error} onRetry={() => void paper.refetch()} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            {paper.data ? (
              <Card>
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-caption text-faint">Paper #{paper.data.paperId}</p>
                      <h2 className="mt-1 text-h3 leading-tight text-ink">{paper.data.title}</h2>
                      <p className="mt-1 max-w-[68ch] text-caption text-muted">{truncate(paper.data.abstract ?? '', 200)}</p>
                    </div>
                    <StatusBadge status={paper.data.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {paper.data.keywords.map((keyword) => <Badge key={keyword.keywordId}>{keyword.keyword}</Badge>)}
                  </div>
                </CardBody>
              </Card>
            ) : (
              <Skeleton className="h-40 w-full" />
            )}

            {conflict ? <ConflictPanel conflict={conflict.detail} reviewerName={conflict.reviewerName} onDismiss={() => setConflict(null)} /> : null}

            {risky && paperId !== null ? (
              <RiskyDemo
                riskyPair={riskyPair}
                loading={coi.isLoading}
                assigning={assigningId !== null}
                onDirectAssign={(reviewerId) => void runAssign(reviewerId)}
                onLoad={setOracleReviewer}
              />
            ) : null}

            <Card>
              <CardHeader
                title="Ranked reviewers"
                description={recommendations.data ? recommendations.data.scoring_model.exclusions : 'Scored by shared keywords, expertise and workload.'}
                actions={<Badge tone="accent">live scoring</Badge>}
              />
              <CardBody>
                {recommendations.isError ? (
                  <ErrorState error={recommendations.error} onRetry={() => void recommendations.refetch()} compact />
                ) : recommendations.isLoading ? (
                  <div className="space-y-2">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-28" />)}</div>
                ) : recommendations.data && recommendations.data.recommendations.length > 0 ? (
                  <>
                    <div className="space-y-2">
                      {recommendations.data.recommendations.map((item, index) => (
                        <RecommendationCard
                          key={item.reviewerId}
                          rank={index + 1}
                          recommendation={item}
                          assigning={assigningId === item.reviewerId}
                          disabled={assigningId !== null}
                          onAssign={(id) => void runAssign(id)}
                        />
                      ))}
                    </div>
                    <details className="mt-4 rounded-md border border-line bg-surface-2 px-3 py-2">
                      <summary className="cursor-pointer text-caption text-faint">How the score is built</summary>
                      <p className="mt-2 text-[12px] text-muted">{recommendations.data.scoring_model.formula}</p>
                      <dl className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-faint">
                        {Object.entries(recommendations.data.scoring_model.weights).map(([key, value]) => (
                          <div key={key} className="flex justify-between gap-2">
                            <dt className="font-mono">{key}</dt><dd className="tabular">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  </>
                ) : (
                  <EmptyState title="No eligible reviewers" hint="Every reviewer may already be assigned or conflicted." />
                )}
              </CardBody>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader title="Current roster" description={`${roster.length} assigned`} />
              <CardBody>
                {roster.length === 0 ? (
                  <p className="text-small text-faint">No reviewers assigned to this paper.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {roster.map((assignment) => (
                      <li key={assignment.reviewerId} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="truncate text-small text-ink">{assignment.name}</p>
                          <p className="truncate text-caption text-muted">{assignment.expertise ?? 'General'} · {formatDate(assignment.assignedDate)}</p>
                        </div>
                        <Badge tone={assignment.hasReviewed ? 'ok' : 'neutral'}>{assignment.hasReviewed ? 'reviewed' : 'pending'}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            {can(session, 'oracleDryRun') ? (
              <OraclePanel
                panel={oracleReviewer}
                onChange={(reviewer) => { setOracleReviewer(reviewer); setDryRun(null); }}
                dryRun={dryRun}
                dryError={dryError}
                confirmed={confirmed}
                onConfirmedChange={setConfirmed}
                canCommit={can(session, 'oracleCommit')}
                pending={oracle.isPending}
                onDryRun={() => void runDryRun()}
                onCommit={() => void runCommit()}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
