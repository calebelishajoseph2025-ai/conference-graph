import { useState } from 'react';
import { Database, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';
import { useHealth, useParity } from '@/api/hooks/queries';
import { useResetNeo4j } from '@/api/hooks/mutations';
import { toApiError } from '@/api/errors';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Label } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSession } from '@/session/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { ms, num } from '@/lib/format';

export function AdminPage() {
  const health = useHealth();
  const parity = useParity();
  const { session } = useSession();
  const reset = useResetNeo4j();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const token = session?.adminToken;

  const neo4j = health.data?.neo4j;
  const oracle = health.data?.oracle;

  const runReset = async (): Promise<void> => {
    if (!token) return;
    try {
      const result = await reset.mutateAsync(token);
      toast('Neo4j reset complete', { tone: 'success', description: `${num(result.nodes)} nodes and ${num(result.relationships)} relationships restored from the seed CSV files.` });
      setOpen(false);
      setTyped('');
      void health.refetch();
      void parity.refetch();
    } catch (error) {
      toast('Reset failed', { tone: 'error', description: toApiError(error).message });
    }
  };

  return (
    <div>
      <PageHeader
        title="Administration"
        description="Connection details, parity evidence and the one destructive operation."
        actions={
          <Button variant="secondary" size="sm" onClick={() => { void health.refetch(); void parity.refetch(); }}>
            <RefreshCw size={14} strokeWidth={1.5} /> Refresh
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Neo4j" description={neo4j?.database ?? 'Graph database'} actions={<Badge tone={neo4j?.status === 'connected' ? 'ok' : 'bad'}>{neo4j?.status ?? 'checking'}</Badge>} />
          <CardBody>
            {health.isLoading ? <Skeleton className="h-32" /> : neo4j ? (
              <dl className="grid grid-cols-2 gap-3 text-small">
                <div className="col-span-2"><dt className="text-caption text-faint">URI</dt><dd className="mt-0.5 break-all font-mono text-[11px] text-muted">{neo4j.uri}</dd></div>
                <div><dt className="text-caption text-faint">Nodes</dt><dd className="mt-0.5 text-[20px] text-ink tabular">{num(neo4j.nodes)}</dd></div>
                <div><dt className="text-caption text-faint">Relationships</dt><dd className="mt-0.5 text-[20px] text-ink tabular">{num(neo4j.relationships)}</dd></div>
                <div><dt className="text-caption text-faint">SAME_PERSON_AS</dt><dd className="mt-0.5 text-[20px] text-ink tabular">{num(neo4j.same_person_as)}</dd></div>
                <div><dt className="text-caption text-faint">Latency</dt><dd className="mt-0.5 font-mono text-[12px] text-muted">{ms(neo4j.elapsed_ms)}</dd></div>
                {neo4j.error ? <p className="col-span-2 text-[12px] text-bad">{neo4j.error}</p> : null}
              </dl>
            ) : <ErrorState error={health.error} onRetry={() => void health.refetch()} compact />}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Oracle AI Database 26ai" description={oracle?.user ?? 'Relational database'} actions={<Badge tone={oracle?.status === 'connected' ? 'ok' : 'bad'}>{oracle?.status ?? 'checking'}</Badge>} />
          <CardBody>
            {health.isLoading ? <Skeleton className="h-32" /> : oracle ? (
              <dl className="grid grid-cols-2 gap-3 text-small">
                <div className="col-span-2"><dt className="text-caption text-faint">DSN</dt><dd className="mt-0.5 break-all font-mono text-[11px] text-muted">{oracle.dsn}</dd></div>
                <div><dt className="text-caption text-faint">Rows</dt><dd className="mt-0.5 text-[20px] text-ink tabular">{num(oracle.total_rows)}</dd></div>
                <div><dt className="text-caption text-faint">Tables</dt><dd className="mt-0.5 text-[20px] text-ink tabular">{Object.keys(oracle.tables).length}</dd></div>
                <div className="col-span-2"><dt className="text-caption text-faint">Latency</dt><dd className="mt-0.5 font-mono text-[12px] text-muted">{ms(oracle.elapsed_ms)}</dd></div>
                {oracle.error ? <p className="col-span-2 text-[12px] text-bad">{oracle.error}</p> : null}
              </dl>
            ) : <ErrorState error={health.error} onRetry={() => void health.refetch()} compact />}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Parity audit"
          description={parity.data?.note ?? 'Compares every count between the two databases.'}
          actions={parity.data ? <Badge tone={parity.data.overall_match ? 'ok' : 'bad'}>{parity.data.summary.matched_checks} of {parity.data.summary.total_checks} match</Badge> : null}
        />
        <CardBody className="p-0">
          <div className="max-h-[360px] overflow-auto">
            <table className="w-full text-left text-small" aria-label="Parity checks">
              <thead>
                <tr className="sticky top-0 bg-surface-2">
                  <th scope="col" className="px-4 py-2 text-caption font-medium text-muted">Category</th>
                  <th scope="col" className="px-4 py-2 text-caption font-medium text-muted">Check</th>
                  <th scope="col" className="px-4 py-2 text-right text-caption font-medium text-muted">Neo4j</th>
                  <th scope="col" className="px-4 py-2 text-right text-caption font-medium text-muted">Oracle</th>
                  <th scope="col" className="px-4 py-2 text-right text-caption font-medium text-muted">Difference</th>
                  <th scope="col" className="px-4 py-2 text-right text-caption font-medium text-muted">Status</th>
                </tr>
              </thead>
              <tbody>
                {parity.data?.rows.map((row) => (
                  <tr key={`${row.category}-${row.entity}`} className="border-b border-line/60">
                    <td className="px-4 py-2 text-caption text-faint">{row.category}</td>
                    <td className="px-4 py-2 text-muted">{row.entity}</td>
                    <td className="px-4 py-2 text-right font-mono text-[11px] text-ink tabular">{row.neo4j ?? '—'}</td>
                    <td className="px-4 py-2 text-right font-mono text-[11px] text-ink tabular">{row.oracle ?? '—'}</td>
                    <td className="px-4 py-2 text-right font-mono text-[11px] text-muted tabular">{row.difference ?? '—'}</td>
                    <td className="px-4 py-2 text-right"><Badge tone={row.match ? 'ok' : 'bad'}>{row.match ? 'match' : 'differs'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card className="mt-4 border-bad/40">
        <CardHeader
          title="Danger zone"
          description="Reset Neo4j from the seed CSV files. This deletes the graph and rebuilds it."
          actions={<ShieldAlert size={16} strokeWidth={1.5} className="text-bad" />}
        />
        <CardBody>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2">
              <Database size={16} strokeWidth={1.5} className="mt-0.5 text-muted" />
              <p className="max-w-[70ch] text-small text-muted">
                Oracle is the source of truth. The reset drops the Neo4j graph and reloads every node and relationship.
                Papers, reviews and assignments in Oracle are untouched.
              </p>
            </div>
            <Button variant="danger" onClick={() => setOpen(true)} disabled={!token}>
              <Trash2 size={14} strokeWidth={1.5} /> Reset Neo4j from CSV
            </Button>
          </div>
          {!token ? <p className="mt-2 text-[12px] text-warn">The admin token is missing from this session. Sign in as Admin again.</p> : null}
        </CardBody>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(value) => { if (!reset.isPending) setOpen(value); }}
        title="Reset the Neo4j graph?"
        description="This deletes every node and relationship, then reloads from the seed CSV files."
        size="sm"
        footer={
          <>
            <Button variant="secondary" data-cancel onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="danger" disabled={typed !== 'RESET NEO4J' || !token} loading={reset.isPending} onClick={() => void runReset()}>
              Reset from CSV
            </Button>
          </>
        }
      >
        <div>
          <Label htmlFor="reset-confirm" hint="exact phrase">Type RESET NEO4J to confirm</Label>
          <Input id="reset-confirm" value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" placeholder="RESET NEO4J" />
        </div>
      </Dialog>
    </div>
  );
}
