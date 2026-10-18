import { useDatasetStatus, useHealth, useParity } from '@/api/hooks/queries';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { num } from '@/lib/format';

function Dot({ ok }: { ok: boolean }) {
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${ok ? 'bg-ok' : 'bg-bad'}`} aria-hidden />;
}

export function EvidenceBlock() {
  const health = useHealth();
  const parity = useParity();
  const dataset = useDatasetStatus();
  const loading = health.isLoading || parity.isLoading || dataset.isLoading;

  if (health.isError || parity.isError || dataset.isError) {
    return (
      <div className="mt-4">
        <ErrorState
          error={health.error ?? parity.error ?? dataset.error}
          onRetry={() => { void health.refetch(); void parity.refetch(); void dataset.refetch(); }}
        />
      </div>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader
        title="Evidence"
        description="Live checks from both databases. Nothing on this page is cached or mocked."
        actions={parity.data ? (
          <Badge tone={parity.data.overall_match ? 'ok' : 'warn'}>
            parity {parity.data.summary.matched_checks}/{parity.data.summary.total_checks}
          </Badge>
        ) : null}
      />
      <CardBody className="grid gap-5 lg:grid-cols-[1fr_1.35fr]">
        <div className="space-y-4">
          <div>
            <p className="text-caption text-faint">Connections</p>
            <div className="mt-2 space-y-2 text-small">
              <div className="flex items-center justify-between gap-3 border-b border-line/60 pb-2">
                <span className="inline-flex items-center gap-2 text-ink"><Dot ok={health.data?.neo4j.status === 'connected'} /> Neo4j</span>
                <span className="font-mono text-[11px] text-muted tabular">
                  {num(health.data?.neo4j.nodes)} nodes · {num(health.data?.neo4j.relationships)} rels
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-line/60 pb-2">
                <span className="inline-flex items-center gap-2 text-ink"><Dot ok={health.data?.oracle.status === 'connected'} /> Oracle</span>
                <span className="font-mono text-[11px] text-muted tabular">
                  {num(health.data?.oracle.total_rows)} rows · {Object.keys(health.data?.oracle.tables ?? {}).length} tables
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink">Demo dataset</span>
                <Badge tone={dataset.data?.demo.available ? 'ok' : 'warn'}>{dataset.data?.demo.available ? 'available' : 'partial'}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink">Scale dataset</span>
                <Badge tone={dataset.data?.scale.available ? 'ok' : 'neutral'}>{dataset.data?.scale.available ? 'available' : 'not installed'}</Badge>
              </div>
            </div>
            {!dataset.data?.scale.available && dataset.data?.scale.reason ? (
              <p className="mt-2 text-[11px] leading-relaxed text-faint">{dataset.data.scale.reason}</p>
            ) : null}
          </div>

          <div>
            <p className="text-caption text-faint">Raw endpoints</p>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px]">
              <a href="/api/health" target="_blank" rel="noreferrer" className="text-muted underline underline-offset-4 hover:text-ink">/api/health</a>
              <a href="/api/admin/parity" target="_blank" rel="noreferrer" className="text-muted underline underline-offset-4 hover:text-ink">/api/admin/parity</a>
              <a href="/api/compare/dataset-status" target="_blank" rel="noreferrer" className="text-muted underline underline-offset-4 hover:text-ink">/api/compare/dataset-status</a>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-caption text-faint">Parity checks</p>
          {loading ? <Skeleton className="mt-2 h-40" /> : (
            <div className="mt-2 overflow-auto rounded-sm border border-line">
              <table className="w-full text-left text-[12px]" aria-label="Oracle and Neo4j parity checks">
                <thead>
                  <tr className="bg-surface-2">
                    <th scope="col" className="px-3 py-1.5 font-medium text-muted">Check</th>
                    <th scope="col" className="px-3 py-1.5 text-right font-medium text-muted">Oracle</th>
                    <th scope="col" className="px-3 py-1.5 text-right font-medium text-muted">Neo4j</th>
                    <th scope="col" className="px-3 py-1.5 text-right font-medium text-muted">Δ</th>
                    <th scope="col" className="px-3 py-1.5 text-right font-medium text-muted">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {(parity.data?.rows ?? []).map((row) => (
                    <tr key={`${row.category}-${row.entity}`} className="border-t border-line/60">
                      <td className="px-3 py-1.5 text-muted">{row.category} · {row.entity}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-[11px] text-ink tabular">{num(row.oracle)}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-[11px] text-ink tabular">{num(row.neo4j)}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-[11px] text-muted tabular">{row.difference ?? '—'}</td>
                      <td className="px-3 py-1.5 text-right">
                        <span className={row.match ? 'text-ok' : 'text-bad'}>{row.match ? 'match' : 'mismatch'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {parity.data ? <p className="mt-2 text-[11px] text-faint">{parity.data.note}</p> : null}
        </div>
      </CardBody>
    </Card>
  );
}
