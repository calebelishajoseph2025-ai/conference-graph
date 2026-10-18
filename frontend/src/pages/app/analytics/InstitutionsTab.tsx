import { Download } from 'lucide-react';
import type { Institutions } from '@/api/schemas/analytics';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { exportToCsv } from '@/lib/csv';
import { num, plural } from '@/lib/format';

export function InstitutionsTab({ data, loading }: { data: Institutions | undefined; loading: boolean }) {
  const pairs = data?.institutionPairs ?? [];
  const top = data?.topInstitutions ?? [];
  const maxJoint = Math.max(1, ...pairs.map((pair) => pair.jointPapers));
  const maxAuthors = Math.max(1, ...top.map((item) => item.authorCount));

  if (loading) return <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-[480px]" /><Skeleton className="h-[480px]" /></div>;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader
          title="Institution collaboration"
          description="Pairs with the most joint papers."
          actions={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportToCsv('institution-pairs', ['institution1', 'institution2', 'jointPapers', 'authors1', 'authors2'],
                pairs.map((pair) => [pair.institution1, pair.institution2, pair.jointPapers, pair.authors1, pair.authors2]))}
            >
              <Download size={14} strokeWidth={1.5} /> CSV
            </Button>
          }
        />
        <CardBody className="p-0">
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-left text-[12px]" aria-label="Institution collaboration pairs">
              <thead>
                <tr className="sticky top-0 z-10 bg-surface-2">
                  <th scope="col" className="border-b border-line px-4 py-2.5 text-caption font-medium text-muted">Pair</th>
                  <th scope="col" className="border-b border-line px-4 py-2.5 text-right text-caption font-medium text-muted">Joint</th>
                  <th scope="col" className="border-b border-line px-4 py-2.5 text-right text-caption font-medium text-muted">Authors</th>
                </tr>
              </thead>
              <tbody>
                {pairs.map((pair) => (
                  <tr key={`${pair.institution1}-${pair.institution2}`} className="border-b border-line/60">
                    <td className="px-4 py-2.5 text-muted">{pair.institution1} <span className="text-faint">with</span> {pair.institution2}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-[11px] text-ink tabular">{num(pair.jointPapers)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-[11px] text-faint tabular">{pair.authors1} + {pair.authors2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Top institutions"
          description="Distinct authors and papers per affiliation."
          actions={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportToCsv('top-institutions', ['institution', 'authors', 'papers'],
                top.map((item) => [item.institution, item.authorCount, item.paperCount]))}
            >
              <Download size={14} strokeWidth={1.5} /> CSV
            </Button>
          }
        />
        <CardBody className="space-y-3">
          {top.map((item) => (
            <div key={item.institution}>
              <div className="flex items-baseline justify-between gap-3 text-small">
                <span className="min-w-0 truncate text-ink">{item.institution}</span>
                <span className="shrink-0 font-mono text-[11px] text-faint tabular">{plural(item.authorCount, 'author')} · {plural(item.paperCount, 'paper')}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-surface-3" aria-hidden>
                <div className="h-full rounded-full bg-ink/70" style={{ width: `${Math.round((item.authorCount / maxAuthors) * 100)}%` }} />
              </div>
            </div>
          ))}
          <p className="border-t border-line pt-3 text-[11px] text-faint">The busiest pair shares {num(maxJoint)} joint papers.</p>
        </CardBody>
      </Card>
    </div>
  );
}
