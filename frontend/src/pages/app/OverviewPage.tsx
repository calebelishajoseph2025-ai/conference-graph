import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Plus, RefreshCw } from 'lucide-react';
import { useHealth, usePapers, useParity } from '@/api/hooks/queries';
import { PageHeader } from '@/components/layout/PageHeader';
import { Stat } from '@/components/ui/Stat';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState, EmptyState } from '@/components/ui/ErrorState';
import { StackedBar } from '@/components/charts/StackedBar';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Tabs } from '@/components/ui/Tabs';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { PaperDrawer } from '@/components/domain/PaperDrawer';
import { AddPaperDialog } from '@/components/domain/AddPaperDialog';
import type { PaperListItem } from '@/api/schemas/papers';
import { useSession } from '@/session/SessionProvider';
import { can } from '@/session/personas';
import { formatDate, ms, num, score, truncate } from '@/lib/format';

const STATUS_ORDER = ['Accepted', 'Rejected', 'Under Review', 'Submitted'];
const PARITY_TABS = ['All', 'Nodes', 'Relationships', 'Paper Status', 'Review Metrics'];

export function OverviewPage() {
  const health = useHealth();
  const parity = useParity();
  const papers = usePapers({ page: 1, pageSize: 6 });
  const { session } = useSession();
  const [selected, setSelected] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [parityTab, setParityTab] = useState('All');

  const statusSegments = useMemo(() => {
    const rows = parity.data?.rows.filter((row) => row.category === 'Paper Status') ?? [];
    return STATUS_ORDER.map((status) => ({
      label: status,
      value: rows.find((row) => row.entity === `Status: ${status}`)?.neo4j ?? 0,
    }));
  }, [parity.data]);

  const nodeRows = parity.data?.rows.filter((row) => row.category === 'Nodes') ?? [];
  const parityRows = parity.data?.rows.filter((row) => parityTab === 'All' || row.category === parityTab) ?? [];
  const matched = parity.data?.rows.filter((row) => row.match).length ?? 0;
  const totalChecks = parity.data?.rows.length ?? 0;

  const columns: Column<PaperListItem>[] = [
    {
      key: 'title',
      header: 'Paper',
      render: (paper) => (
        <div className="min-w-[280px] max-w-[460px]">
          <p className="truncate font-medium text-ink" title={paper.title}>{paper.title}</p>
          <p className="mt-0.5 text-caption text-faint">{paper.trackName ?? 'No track'} · {formatDate(paper.submissionDate)}</p>
        </div>
      ),
    },
    {
      key: 'authors',
      header: 'Authors',
      render: (paper) => (
        <span className="text-muted" title={paper.authors.map((author) => author.name).join(', ')}>
          {truncate(paper.authors.map((author) => author.name).join(', '), 42)}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (paper) => <StatusBadge status={paper.status} /> },
    { key: 'reviews', header: 'Reviews', align: 'right', render: (paper) => paper.reviewCount },
    { key: 'score', header: 'Avg', align: 'right', render: (paper) => score(paper.avgScore) },
  ];

  const refresh = (): void => { void health.refetch(); void parity.refetch(); };

  return (
    <div>
      <PageHeader
        title="Conference overview"
        description="The live state of the demo dataset, read from Oracle and Neo4j at the same moment."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={refresh}>
              <RefreshCw size={14} strokeWidth={1.5} />
              Refresh
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

      {health.isError || parity.isError ? (
        <ErrorState error={health.error ?? parity.error} onRetry={refresh} />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader
                title="Neo4j"
                description={health.isLoading ? 'Checking the graph database…' : `${health.data?.neo4j.uri ?? '—'} · ${health.data?.neo4j.database ?? '—'}`}
                actions={<Badge tone={health.data?.neo4j.status === 'connected' ? 'ok' : 'bad'}>{health.data?.neo4j.status ?? 'checking'}</Badge>}
              />
              <CardBody>
                {health.isLoading ? <Skeleton className="h-20" /> : health.data ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Stat caption="Nodes" value={health.data.neo4j.nodes} live />
                    <Stat caption="Relationships" value={health.data.neo4j.relationships} live />
                    <Stat caption="SAME_PERSON_AS" value={health.data.neo4j.same_person_as} live />
                    <div>
                      <p className="text-caption text-faint">Latency</p>
                      <p className="mt-1 font-mono text-[13px] text-ink">{ms(health.data.neo4j.elapsed_ms)}</p>
                    </div>
                  </div>
                ) : null}
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Oracle AI Database 26ai"
                description={health.isLoading ? 'Checking the relational database…' : `${health.data?.oracle.dsn ?? '—'} · ${health.data?.oracle.user ?? '—'}`}
                actions={<Badge tone={health.data?.oracle.status === 'connected' ? 'ok' : 'bad'}>{health.data?.oracle.status ?? 'checking'}</Badge>}
              />
              <CardBody>
                {health.isLoading ? <Skeleton className="h-20" /> : health.data ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Stat caption="Rows" value={health.data.oracle.total_rows} live />
                    <Stat caption="Tables" value={Object.keys(health.data.oracle.tables).length} live />
                    <div>
                      <p className="text-caption text-faint">Latency</p>
                      <p className="mt-1 font-mono text-[13px] text-ink">{ms(health.data.oracle.elapsed_ms)}</p>
                    </div>
                    <div>
                      <p className="text-caption text-faint">Largest table</p>
                      <p className="mt-1 text-[13px] text-ink">
                        {Object.entries(health.data.oracle.tables).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'}
                      </p>
                    </div>
                  </div>
                ) : null}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Dataset overview" description="Eight node counts, compared row for row with the relational seed." />
            <CardBody className="grid grid-cols-2 gap-6 sm:grid-cols-4 xl:grid-cols-8">
              {parity.isLoading
                ? Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-16" />)
                : nodeRows.map((row) => <Stat key={row.entity} caption={row.entity} value={row.neo4j} hint={row.match ? 'match' : 'differs'} live={row.match} />)}
            </CardBody>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[1fr_1.25fr]">
            <Card>
              <CardHeader
                title="Papers by status"
                description="Counted from the graph, matched against Oracle."
                actions={<Badge tone={(parity.data?.overall_match ?? false) ? 'ok' : 'warn'}>{(parity.data?.overall_match ?? false) ? 'Oracle matches' : 'Check pending'}</Badge>}
              />
              <CardBody>
                {parity.isLoading ? <Skeleton className="h-44" /> : <StackedBar segments={statusSegments} ariaLabel="Paper status distribution" />}
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Database parity"
                description={parity.data ? `${matched} of ${totalChecks} checks match` : 'Comparing every count.'}
                actions={
                  <Button variant="secondary" size="sm" onClick={() => void parity.refetch()} loading={parity.isFetching}>
                    <RefreshCw size={13} strokeWidth={1.5} /> Re-check parity
                  </Button>
                }
              />
              <Tabs
                label="Parity categories"
                value={parityTab}
                onChange={setParityTab}
                tabs={PARITY_TABS.map((category) => ({ value: category, label: category }))}
                right={<Badge tone={parity.data?.overall_match ? 'ok' : 'bad'}>{parity.data?.overall_match ? 'Full parity' : `${parity.data?.summary.unmatched_checks ?? '—'} differences`}</Badge>}
              />
              <div className="max-h-[320px] overflow-auto">
                <table className="w-full text-left text-small" aria-label={`Parity checks for ${parityTab}`}>
                  <thead>
                    <tr className="sticky top-0 bg-surface-2">
                      <th scope="col" className="px-4 py-2 text-caption font-medium text-muted">Check</th>
                      <th scope="col" className="px-4 py-2 text-right text-caption font-medium text-muted">Neo4j</th>
                      <th scope="col" className="px-4 py-2 text-right text-caption font-medium text-muted">Oracle</th>
                      <th scope="col" className="px-4 py-2 text-right text-caption font-medium text-muted">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parityRows.map((row) => (
                      <tr key={`${row.category}-${row.entity}`} className="border-b border-line/60 last:border-0">
                        <td className="px-4 py-2 text-muted">{row.entity}</td>
                        <td className="px-4 py-2 text-right font-mono text-[11px] text-ink tabular">{num(row.neo4j)}</td>
                        <td className="px-4 py-2 text-right font-mono text-[11px] text-ink tabular">{num(row.oracle)}</td>
                        <td className="px-4 py-2 text-right"><Badge tone={row.match ? 'ok' : 'bad'}>{row.match ? 'match' : `Δ ${row.difference ?? '—'}`}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parity.data?.note ? <p className="border-t border-line px-4 py-2.5 text-[11px] leading-relaxed text-faint">{parity.data.note}</p> : null}
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Recent papers"
              description="Six most recent records, read live."
              actions={<Link to="/app/papers" className="inline-flex items-center gap-1 text-caption text-muted hover:text-ink">All papers <ArrowUpRight size={13} strokeWidth={1.5} /></Link>}
            />
            <DataTable
              label="Recent papers"
              columns={columns}
              rows={papers.data?.items ?? []}
              rowKey={(paper) => paper.paperId}
              loading={papers.isLoading}
              onRowClick={(paper) => setSelected(paper.paperId)}
              empty={<EmptyState title="No papers yet" hint="Create a paper to see it here." />}
              skeletonRows={6}
            />
          </Card>
        </div>
      )}

      <PaperDrawer
        paperId={selected}
        open={selected !== null}
        onOpenChange={(open) => { if (!open) setSelected(null); }}
        footer={<Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>}
      />
      <AddPaperDialog open={adding} onOpenChange={setAdding} onCreated={(paper) => setSelected(paper.paperId)} />
    </div>
  );
}
