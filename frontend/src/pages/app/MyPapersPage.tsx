import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, UserRound } from 'lucide-react';
import { useAuthor } from '@/api/hooks/queries';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Stat } from '@/components/ui/Stat';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState, EmptyState } from '@/components/ui/ErrorState';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { PaperDrawer } from '@/components/domain/PaperDrawer';
import { AddPaperDialog } from '@/components/domain/AddPaperDialog';
import { useSession } from '@/session/SessionProvider';
import { formatDate, plural, score } from '@/lib/format';
import { useState } from 'react';

export function MyPapersPage() {
  const { paperId } = useParams();
  const navigate = useNavigate();
  const { session } = useSession();
  const authorId = session?.identity?.kind === 'author' ? session.identity.id : null;
  const profile = useAuthor(authorId);
  const [adding, setAdding] = useState(false);
  const drawerId = paperId ? Number(paperId) : null;

  if (authorId === null) {
    return (
      <Card>
        <EmptyState icon={<UserRound size={22} strokeWidth={1.5} />} title="This view needs an author identity" hint="Sign in from the Author card on the home page." />
      </Card>
    );
  }

  if (profile.isError) return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />;
  if (!profile.data) return <Skeleton className="h-96 w-full" />;

  const papers = profile.data.papers;
  const accepted = papers.filter((paper) => paper.status === 'Accepted').length;
  const underReview = papers.filter((paper) => paper.status === 'Under Review').length;
  const scored = papers.filter((paper) => paper.avgScore !== null);
  const average = scored.length > 0 ? scored.reduce((sum, paper) => sum + (paper.avgScore ?? 0), 0) / scored.length : null;

  return (
    <div>
      <PageHeader
        eyebrow="Author view"
        title={profile.data.name}
        description={`${profile.data.affiliation ?? 'No affiliation'}${profile.data.country ? ` · ${profile.data.country}` : ''}`}
        actions={
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus size={15} strokeWidth={1.5} /> Submit a new paper
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardBody className="grid gap-6 sm:grid-cols-4">
              <Stat caption="Papers" value={profile.data.totalPapers} />
              <Stat caption="Accepted" value={accepted} />
              <Stat caption="Under review" value={underReview} />
              <Stat caption="Average score" value={average} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Your papers" description="Select a paper to read its anonymised record." />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-small" aria-label="Your papers">
                <thead>
                  <tr className="border-b border-line bg-surface-2">
                    <th scope="col" className="px-4 py-2 text-caption font-medium text-muted">Title</th>
                    <th scope="col" className="px-4 py-2 text-caption font-medium text-muted">Track</th>
                    <th scope="col" className="px-4 py-2 text-caption font-medium text-muted">Status</th>
                    <th scope="col" className="px-4 py-2 text-right text-caption font-medium text-muted">Position</th>
                    <th scope="col" className="px-4 py-2 text-right text-caption font-medium text-muted">Reviews</th>
                    <th scope="col" className="px-4 py-2 text-right text-caption font-medium text-muted">Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {papers.map((paper) => (
                    <tr
                      key={paper.paperId}
                      tabIndex={0}
                      className="cursor-pointer border-b border-line/60 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                      onClick={() => navigate(`/app/my-papers/${paper.paperId}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          navigate(`/app/my-papers/${paper.paperId}`);
                        }
                      }}
                    >
                      <td className="max-w-[380px] px-4 py-3">
                        <p className="truncate font-medium text-ink" title={paper.title}>{paper.title}</p>
                        <p className="text-caption text-faint">#{paper.paperId} · {formatDate(paper.submissionDate)}</p>
                      </td>
                      <td className="px-4 py-3 text-muted">{paper.trackName ?? '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={paper.status} /></td>
                      <td className="px-4 py-3 text-right text-[12px] text-muted whitespace-nowrap">
                        <span className="inline-flex items-center justify-end gap-1.5">
                          <span className="tabular">{paper.authorOrder}</span>
                          {paper.isCorresponding ? (
                            <Badge tone="accent" className="px-1.5 py-0 text-[10px]">
                              corresponding
                            </Badge>
                          ) : null}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[11px] text-muted tabular">{paper.reviewCount}</td>
                      <td className="px-4 py-3 text-right font-mono text-[11px] text-ink tabular">{score(paper.avgScore)}</td>
                    </tr>
                  ))}
                  {papers.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-small text-faint">No papers submitted yet.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader title="Co-authors" description={`${plural(profile.data.coAuthors.length, 'person', 'people')} across your papers.`} />
          <CardBody>
            <ul className="divide-y divide-line">
              {profile.data.coAuthors.map((coAuthor) => (
                <li key={coAuthor.authorId} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-small text-ink">{coAuthor.name}</p>
                    <p className="truncate text-caption text-muted">{coAuthor.affiliation ?? 'No affiliation'}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                    <Badge className="shrink-0">{coAuthor.sharedPapers} shared</Badge>
                    <Link to={`/app/graph?type=author&id=${coAuthor.authorId}`} className="shrink-0 text-[11px] text-muted underline underline-offset-4 hover:text-ink">Graph</Link>
                  </div>
                </li>
              ))}
              {profile.data.coAuthors.length === 0 ? <li className="text-small text-faint">No co-authors yet.</li> : null}
            </ul>
          </CardBody>
        </Card>
      </div>

      <PaperDrawer
        paperId={drawerId}
        open={drawerId !== null}
        onOpenChange={(open) => { if (!open) navigate('/app/my-papers'); }}
        blind
        footer={<Button variant="secondary" onClick={() => navigate('/app/my-papers')}>Close</Button>}
      />
      <AddPaperDialog open={adding} onOpenChange={setAdding} onCreated={(paper) => { void profile.refetch(); navigate(`/app/my-papers/${paper.paperId}`); }} />
    </div>
  );
}
