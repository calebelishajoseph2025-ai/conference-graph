import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Play, Timer, TriangleAlert } from 'lucide-react';
import { useAuthor, useCompare, useCompareStats, useDatasetStatus } from '@/api/hooks/queries';
import { toApiError } from '@/api/errors';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ErrorState, EmptyState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { SmartCombobox } from '@/components/domain/SmartCombobox';
import { EnginePanel } from './benchmark/EnginePanel';
import { intParam } from '@/api/params';
import { ms } from '@/lib/format';
import { cn } from '@/lib/cn';

const SCENARIOS = [
  { key: 'coauthors', title: 'Direct co-authors', description: 'Who wrote a paper with this author?', params: ['author'] },
  { key: 'within-hops', title: 'Within N hops', description: 'Who is reachable through co-authorship, up to three hops?', params: ['author', 'hops'] },
  { key: 'shortest-path', title: 'Shortest path', description: 'How are two authors connected?', params: ['from', 'to'] },
  { key: 'conflict-check', title: 'Conflict check', description: 'Which reviewer–paper pairs are self-conflicts?', params: [] },
  { key: 'avg-score', title: 'Average score', description: 'What is the average review score, overall and by track?', params: [] },
] as const;

type ScenarioKey = (typeof SCENARIOS)[number]['key'];

export function BenchmarkPage() {
  const { scenario: pathScenario } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const scenario = (SCENARIOS.some((item) => item.key === pathScenario) ? pathScenario : 'coauthors') as ScenarioKey;
  const current = SCENARIOS.find((item) => item.key === scenario) ?? SCENARIOS[0];
  const dataset = params.get('dataset') === 'scale' ? 'scale' : 'demo';
  const authorId = intParam(params.get('authorId')) ?? 1;
  const fromAuthorId = intParam(params.get('from')) ?? intParam(params.get('fromAuthorId')) ?? 1;
  const toAuthorId = intParam(params.get('to')) ?? intParam(params.get('toAuthorId')) ?? 60;
  const hops = Math.min(3, Math.max(1, Number(params.get('hops') ?? 2) || 2));

  const status = useDatasetStatus();
  const stats = useCompareStats(dataset);
  const scaleAvailable = status.data?.scale.available ?? false;

  const author = useAuthor(scenario === 'shortest-path' ? null : authorId);
  const fromAuthor = useAuthor(fromAuthorId);
  const toAuthor = useAuthor(toAuthorId);

  const queryParams: Record<string, string | number> =
    scenario === 'coauthors' || scenario === 'within-hops'
      ? { authorId, dataset }
      : scenario === 'shortest-path'
        ? { fromAuthorId, toAuthorId, dataset }
        : { dataset };

  const [run, setRun] = useState(false);
  const compare = useCompare(scenario, queryParams, run);

  useEffect(() => {
    setRun(false);
  }, [scenario, dataset]);

  const update = (changes: Record<string, string | null>): void => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === null) next.delete(key);
      else next.set(key, value);
    });
    setParams(next);
    setRun(false);
  };

  const apiError = compare.isError ? toApiError(compare.error) : null;
  const rateLimited = apiError?.status === 429;

  return (
    <div>
      <PageHeader
        title="SQL vs Cypher"
        description="The same question, the same data, measured in both databases. Numbers are reported exactly as returned."
        actions={<Badge tone={stats.data?.confirmedMatch ? 'ok' : 'neutral'}>{stats.data?.confirmedMatch ? 'Verified match' : 'Dataset check'}</Badge>}
      />

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {SCENARIOS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => navigate(`/app/benchmark/${item.key}${dataset === 'scale' ? '?dataset=scale' : ''}`)}
            aria-pressed={scenario === item.key}
            className={cn(
              'rounded-lg border p-3 text-left transition-colors duration-fast',
              scenario === item.key ? 'border-ink bg-surface-3' : 'border-line bg-surface hover:border-line-strong'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-medium text-ink">{item.title}</p>
              {scenario === item.key ? <span className="font-mono text-[9px] tracking-[0.12em] text-faint">active</span> : null}
            </div>
            <p className="mt-1 text-[11px] leading-snug text-muted">{item.description}</p>
          </button>
        ))}
      </div>

      <Card className="mt-4">
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-caption text-faint">Dataset</span>
              <SegmentedControl
                label="Dataset"
                value={dataset}
                onChange={(value) => {
                  if (value === 'scale' && !scaleAvailable) return;
                  const next = new URLSearchParams(params);
                  next.set('dataset', value);
                  setParams(next);
                }}
                options={[
                  { value: 'demo', label: 'Demo' },
                  { value: 'scale', label: scaleAvailable ? 'Scale' : 'Scale (unavailable)', disabled: !scaleAvailable },
                ]}
              />
            </div>
            {stats.data ? (
              <div className="flex flex-wrap items-center gap-2.5 text-[12px] text-muted sm:ml-auto">
                <Badge tone={stats.data.confirmedMatch ? 'ok' : 'warn'}>
                  {stats.data.confirmedMatch ? 'counts match' : 'counts differ'}
                </Badge>
                <span className="text-faint">|</span>
                <span>
                  <strong className="font-medium text-ink">Oracle</strong>{' '}
                  <span className="font-mono text-[11px] tabular text-muted">
                    {stats.data.oracle.authors} authors · {stats.data.oracle.papers} papers · {stats.data.oracle.coauthorPairs} pairs
                  </span>
                </span>
                <span className="text-faint">·</span>
                <span>
                  <strong className="font-medium text-ink">Neo4j</strong>{' '}
                  <span className="font-mono text-[11px] tabular text-muted">
                    {stats.data.neo4j.authors} authors · {stats.data.neo4j.papers} papers · {stats.data.neo4j.coauthorPairs} pairs
                  </span>
                </span>
              </div>
            ) : null}
            {!scaleAvailable && status.data ? (
              <p className="basis-full max-w-[90ch] text-[11px] leading-relaxed text-faint" title={status.data.scale.reason ?? undefined}>
                Scale is disabled: {status.data.scale.reason ?? 'not configured.'}
              </p>
            ) : null}
          </div>

              {current.params.length > 0 ? (
            <div className="flex flex-wrap items-end gap-3">
              {(current.params as readonly string[]).includes('author') ? (
                <div className="w-full max-w-sm">
                  <p className="mb-1.5 text-caption text-faint">Author</p>
                  <SmartCombobox
                    kind="author"
                    value={author.data ? { id: author.data.authorId, label: author.data.name } : { id: authorId, label: `Author #${authorId}` }}
                    onSelect={(option) => update({ authorId: String(option.id) })}
                    placeholder="Search an author"
                  />
                </div>
              ) : null}
              {(current.params as readonly string[]).includes('hops') ? (
                <div>
                  <p className="mb-1.5 text-caption text-faint">Hops</p>
                  <SegmentedControl
                    label="Hop bound"
                    value={String(hops)}
                    onChange={(value) => update({ hops: value })}
                    options={[{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }]}
                  />
                </div>
              ) : null}
              {(current.params as readonly string[]).includes('from') ? (
                <div className="w-full max-w-[260px]">
                  <p className="mb-1.5 text-caption text-faint">From</p>
                  <SmartCombobox kind="author" value={fromAuthor.data ? { id: fromAuthor.data.authorId, label: fromAuthor.data.name } : { id: fromAuthorId, label: `Author #${fromAuthorId}` }} onSelect={(option) => update({ from: String(option.id) })} placeholder="Starting author" />
                </div>
              ) : null}
              {(current.params as readonly string[]).includes('to') ? (
                <div className="w-full max-w-[260px]">
                  <p className="mb-1.5 text-caption text-faint">To</p>
                  <SmartCombobox kind="author" value={toAuthor.data ? { id: toAuthor.data.authorId, label: toAuthor.data.name } : { id: toAuthorId, label: `Author #${toAuthorId}` }} onSelect={(option) => update({ to: String(option.id) })} placeholder="Target author" />
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-small text-muted">This scenario takes no parameters; it runs across the whole dataset.</p>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <Button onClick={() => setRun(true)} loading={compare.isFetching && run}>
              <Play size={14} strokeWidth={1.5} />
              Run benchmark
            </Button>
            <p className="text-[11px] text-faint">One warm-up and five measured runs per engine. Limit 60 requests per minute.</p>
          </div>
        </CardBody>
      </Card>

      <div className="mt-4">
        {!run ? (
          <Card>
            <EmptyState icon={<Timer size={22} strokeWidth={1.5} />} title="Ready to measure" hint="Run the benchmark to see the Oracle and Neo4j plans, timings and sample rows side by side." />
          </Card>
        ) : compare.isError ? (
          <div>
            <ErrorState error={compare.error} onRetry={() => void compare.refetch()} />
            {rateLimited ? <p className="mt-2 flex items-center gap-1.5 text-caption text-warn"><TriangleAlert size={13} strokeWidth={1.5} /> The benchmark limit is 60 requests per minute. Wait a moment before running again.</p> : null}
          </div>
        ) : compare.isLoading || !compare.data ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className={cn('flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4', compare.data.resultsMatch ? 'border-ok/40 bg-ok/5' : 'border-warn/40 bg-warn/5')}>
              <div>
                <p className="text-[14px] font-semibold text-ink">{compare.data.resultsMatch ? 'Results match' : 'Results differ'}</p>
                <p className="mt-1 text-small text-muted">{compare.data.matchDetail}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {compare.data.extra?.violations ? (
                  <Badge tone={compare.data.extra.violations.clean ? 'ok' : 'warn'}>
                    conflicts Oracle {compare.data.extra.violations.oracle} · Neo4j {compare.data.extra.violations.neo4j}
                  </Badge>
                ) : null}
                <Badge tone={compare.data.resultsMatch ? 'ok' : 'warn'}>{compare.data.scenario}</Badge>
              </div>
            </div>

            <Card>
              <CardHeader title="Architectural analysis" description={compare.data.explanation.title} />
              <CardBody className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-caption text-faint">Oracle, relational plan</p>
                  <p className="mt-1 text-small leading-relaxed text-muted">{compare.data.explanation.relational ?? compare.data.explanation.relationalNotes}</p>
                </div>
                <div>
                  <p className="text-caption text-faint">Neo4j, graph traversal</p>
                  <p className="mt-1 text-small leading-relaxed text-muted">{compare.data.explanation.graph ?? compare.data.explanation.graphNotes}</p>
                </div>
                <p className="sm:col-span-2 text-small leading-relaxed text-muted">{compare.data.explanation.why ?? compare.data.explanation.whyGraph}</p>
              </CardBody>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
              <EnginePanel engine={compare.data.oracle} tone="oracle" label="Oracle SQL" />
              <EnginePanel engine={compare.data.neo4j} tone="neo4j" label="Neo4j Cypher" />
            </div>

            <p className="text-caption text-faint">
              Median comparison: Oracle {ms(compare.data.oracle.medianMs)} · Neo4j {ms(compare.data.neo4j.medianMs)}. At demo scale,
              single-query timings are dominated by round-trip overhead; read these as direction, not a verdict.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
