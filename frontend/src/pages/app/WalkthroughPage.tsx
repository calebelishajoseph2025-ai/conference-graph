import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, CheckCircle2, Circle, Play, ShieldCheck, TriangleAlert } from 'lucide-react';
import content from '@/content/projectContent.json';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useCollabPath, useCompare, useHealth, useParity, useCentralAuthors, useWithinHops } from '@/api/hooks/queries';
import { cumulativeByHop } from '@/lib/reach';
import { cn } from '@/lib/cn';

const steps = content.demoSteps;

function Verdict({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={ok ? 'ok' : 'warn'} icon={ok ? <ShieldCheck size={12} strokeWidth={1.5} /> : <TriangleAlert size={12} strokeWidth={1.5} />}>
        {label}
      </Badge>
      <span className="font-mono text-[11px] text-muted">{detail}</span>
    </div>
  );
}

function ParityCheck() {
  const health = useHealth();
  const parity = useParity();
  if (health.isLoading || parity.isLoading) return <p className="text-caption text-faint">Reading both databases…</p>;
  if (!health.data || !parity.data) return <Verdict ok={false} label="Differs" detail="health or parity unavailable" />;
  const matched = parity.data.rows.filter((row) => row.match).length;
  const connected = health.data.neo4j.status === 'connected' && health.data.oracle.status === 'connected';
  return <Verdict ok={parity.data.overall_match && connected} label={parity.data.overall_match && connected ? 'Verified' : 'Differs'} detail={`${matched} of ${parity.data.rows.length} checks · Neo4j ${health.data.neo4j.status} · Oracle ${health.data.oracle.status}`} />;
}

function PathCheck() {
  const path = useCollabPath(1, 60);
  if (path.isLoading) return <p className="text-caption text-faint">Traversing from author 1 to 60…</p>;
  if (path.isError || !path.data) return <Verdict ok={false} label="Differs" detail="path request failed" />;
  return <Verdict ok={path.data.found && path.data.hops === 3} label={path.data.found && path.data.hops === 3 ? 'Verified' : 'Differs'} detail={`actual ${path.data.hops ?? 'no'} hops from author 1 to 60`} />;
}

function HopsCheck() {
  const reach = useWithinHops(1, 3);
  if (reach.isLoading) return <p className="text-caption text-faint">Counting reachable authors…</p>;
  if (!reach.data) return <Verdict ok={false} label="Differs" detail="traversal failed" />;
  const cumulative = cumulativeByHop(reach.data?.byHop, 3);
  const ok = cumulative[0] === 5 && cumulative[1] === 15 && cumulative[2] === 54;
  return <Verdict ok={ok} label={ok ? 'Verified' : 'Differs'} detail={`actual cumulative ${cumulative.join(' / ')} at 1 / 2 / 3 hops`} />;
}

function CentralCheck() {
  const central = useCentralAuthors(1);
  if (central.isLoading) return <p className="text-caption text-faint">Ranking authors…</p>;
  const top = central.data?.authors[0];
  if (!top) return <Verdict ok={false} label="Differs" detail="no centrality rows" />;
  const expectedName = 'Yuki Zhang';
  const expectedDegree = 30;
  const ok = top.name === expectedName && top.distinctCoauthors === expectedDegree;
  return <Verdict ok={ok} label={ok ? 'Verified' : 'Differs'} detail={`actual top: ${top.name}, ${top.distinctCoauthors} co-authors`} />;
}

function ResultsCheck() {
  const compare = useCompare('shortest-path', { fromAuthorId: 1, toAuthorId: 60, dataset: 'demo' });
  if (compare.isLoading) return <p className="text-caption text-faint">Running the shortest-path benchmark…</p>;
  if (compare.isError || !compare.data) return <Verdict ok={false} label="Differs" detail="benchmark failed" />;
  return <Verdict ok={compare.data.resultsMatch} label={compare.data.resultsMatch ? 'Verified' : 'Differs'} detail={compare.data.matchDetail} />;
}

const CHECKS: Record<string, () => JSX.Element> = {
  parity: ParityCheck,
  path: PathCheck,
  hops: HopsCheck,
  central: CentralCheck,
  resultsMatch: ResultsCheck,
};

function routeFor(step: (typeof steps)[number]): string {
  const params = ('params' in step ? step.params : undefined) as Record<string, string | number | boolean> | undefined;
  const page = step.pageId;
  if (page === 'dashboard') return '/app/overview';
  if (page === 'explorer') {
    const query = new URLSearchParams();
    if (params) Object.entries(params).forEach(([key, value]) => query.set(key, String(value)));
    return `/app/graph?${query.toString()}`;
  }
  if (page === 'compare') return `/app/benchmark/${params?.scenario ?? 'coauthors'}`;
  const base: Record<string, string> = {
    papers: '/app/papers',
    assignments: '/app/assignments',
    reviews: '/app/reviews',
    paths: '/app/paths',
    analytics: '/app/analytics',
  };
  const path = base[page] ?? '/app/overview';
  if (!params) return path;
  const query = new URLSearchParams();
  let paperId: string | null = null;
  Object.entries(params).forEach(([key, value]) => {
    if (key === 'scenario' || key === 'triggerRisky') return;
    if (key === 'paperId' && (page === 'assignments' || page === 'reviews')) {
      paperId = String(value);
      return;
    }
    query.set(key, String(value));
  });
  if (params.triggerRisky) query.set('risky', '1');
  const qs = query.toString();
  const pathWithId = paperId ? `${path}/${paperId}` : path;
  return qs ? `${pathWithId}?${qs}` : pathWithId;
}

export function WalkthroughPage() {
  const navigate = useNavigate();
  const [done, setDone] = useState<Set<number>>(new Set());
  const [verifying, setVerifying] = useState<Record<number, boolean>>({});
  const stepRefs = useRef<(HTMLElement | null)[]>([]);

  const toggleDone = (step: number): void => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });
  };

  const moveFocus = (index: number, direction: number): void => {
    const target = stepRefs.current[index + direction];
    target?.focus();
  };

  return (
    <div>
      <PageHeader
        title="Evaluation walkthrough"
        description="Ten steps, in order, each mapped to a real page and a live check where the backend supports one."
        actions={<Badge tone="accent">{done.size} of {steps.length} done</Badge>}
      />
      <div className="mb-5 h-1 w-full overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done.size} aria-label="Walkthrough progress">
        <div className="h-full bg-ink transition-[width] duration-base" style={{ width: `${(done.size / steps.length) * 100}%` }} />
      </div>

      <ol className="space-y-3">
        {steps.map((step, index) => {
          const completed = done.has(step.step);
          const CheckComponent = 'verify' in step && step.verify ? CHECKS[step.verify] : null;
          return (
            <li key={step.step}>
              <Card
                ref={(element) => { stepRefs.current[index] = element; }}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') { event.preventDefault(); moveFocus(index, 1); }
                  if (event.key === 'ArrowUp') { event.preventDefault(); moveFocus(index, -1); }
                }}
                className={cn('outline-none transition-colors duration-fast focus-visible:border-line-strong', completed && 'border-line-strong')}
              >
                <CardBody className="grid gap-4 sm:grid-cols-[auto_1fr_auto] sm:items-start">
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-full border font-mono text-[12px]', completed ? 'border-ink bg-ink text-bg' : 'border-line text-muted')}>
                    {completed ? <Check size={15} strokeWidth={2} /> : String(step.step).padStart(2, '0')}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[16px] font-semibold text-ink">{step.title}</h2>
                      <Badge>{step.rubricArea}</Badge>
                    </div>
                    <p className="mt-1.5 max-w-[80ch] text-small leading-relaxed text-muted">{step.description}</p>
                    <p className="mt-2 max-w-[80ch] text-caption text-faint">Query preview</p>
                    <pre className="mt-1 overflow-x-auto rounded-sm border border-line bg-surface-2 px-2 py-1.5 font-mono text-[11px] text-muted">{step.queryPreview}</pre>
                    <p className="mt-2 max-w-[80ch] text-[11px] leading-relaxed text-faint">
                      <span className="font-medium text-muted">Seed expectation.</span> {step.expectedOutcome}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {CheckComponent && !verifying[step.step] ? (
                        <Button variant="secondary" size="sm" onClick={() => setVerifying((prev) => ({ ...prev, [step.step]: true }))}>
                          <ShieldCheck size={13} strokeWidth={1.5} /> Verify live
                        </Button>
                      ) : null}
                    </div>
                    {CheckComponent && verifying[step.step] ? <div className="mt-2"><CheckComponent /></div> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-stretch sm:min-w-[130px]">
                    <Button size="sm" className="w-full justify-between" onClick={() => navigate(routeFor(step))}>
                      <span className="inline-flex items-center gap-1.5">
                        <Play size={13} strokeWidth={1.5} />
                        {('params' in step && step.params && 'triggerRisky' in step.params) ? 'Risky demo' : 'Run step'}
                      </span>
                      <ArrowRight size={13} strokeWidth={1.5} />
                    </Button>
                    <Button
                      size="sm"
                      variant={completed ? 'secondary' : 'ghost'}
                      className={cn('w-full justify-center', completed && 'border-ok/40 text-ok hover:text-ok')}
                      onClick={() => toggleDone(step.step)}
                    >
                      {completed ? <CheckCircle2 size={13} strokeWidth={1.5} /> : <Circle size={13} strokeWidth={1.5} />}
                      {completed ? 'Completed' : 'Mark done'}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
