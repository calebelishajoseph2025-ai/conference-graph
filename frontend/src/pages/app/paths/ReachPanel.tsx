import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Network } from 'lucide-react';
import { useAuthor, useWithinHops } from '@/api/hooks/queries';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState, ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { SmartCombobox } from '@/components/domain/SmartCombobox';
import { QueryPanel } from '@/components/graph/QueryPanel';
import { exportToCsv } from '@/lib/csv';
import { num, plural } from '@/lib/format';
import { cumulativeByHop } from '@/lib/reach';

export function ReachPanel({
  author,
  hops,
  onAuthor,
  onHops,
}: {
  author: number | null;
  hops: number;
  onAuthor: (id: number | null) => void;
  onHops: (hops: number) => void;
}) {
  const authorProfile = useAuthor(author);
  const reach = useWithinHops(author, hops);
  const reachThree = useWithinHops(author, 3);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  const rows = (reach.data?.authors ?? []).filter((row) => row.name.toLowerCase().includes(filter.toLowerCase()));
  const byHop = reachThree.data?.byHop ?? reach.data?.byHop ?? {};
  const cumulative = cumulativeByHop(byHop, 3);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Reachable within N hops" description="A recursive traversal from one author, bounded by co-authorship distance." />
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <p className="mb-1.5 text-caption text-faint">Starting author</p>
              <SmartCombobox
                kind="author"
                value={authorProfile.data ? { id: authorProfile.data.authorId, label: authorProfile.data.name } : null}
                onSelect={(option) => onAuthor(option.id)}
                onClear={() => onAuthor(null)}
                placeholder="Search an author"
              />
            </div>
            <SegmentedControl
              label="Hop bound"
              value={String(hops)}
              onChange={(value) => onHops(Number(value))}
              options={[{ value: '1', label: '1 hop' }, { value: '2', label: '2 hops' }, { value: '3', label: '3 hops' }]}
            />
          </div>
        </CardBody>
      </Card>

      {author === null ? (
        <Card>
          <EmptyState icon={<Network size={22} strokeWidth={1.5} />} title="Choose an author" hint="The traversal returns every author within the selected number of hops." />
        </Card>
      ) : reach.isError ? (
        <ErrorState error={reach.error} onRetry={() => void reach.refetch()} />
      ) : reach.isLoading ? (
        <Skeleton className="h-80 w-full" />
      ) : reach.data ? (
        <div className="space-y-4">
          <Card>
            <CardBody>
              <div className="grid gap-6 sm:grid-cols-[1fr_1.2fr] sm:items-center">
                <div>
                  <p className="text-caption text-faint">Reachable authors</p>
                  <p className="mt-1 text-[44px] font-medium leading-none text-ink tabular">{num(reach.data.totalReachable)}</p>
                  <p className="mt-2 text-small text-muted">
                    from {reach.data.author.name} within {plural(reach.data.hops, 'hop')}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-4"
                    onClick={() => exportToCsv('reachable-authors', ['authorId', 'name', 'affiliation', 'country', 'hops'], reach.data?.authors.map((row) => [row.authorId, row.name, row.affiliation, row.country, row.hops]) ?? [])}
                  >
                    <Download size={14} strokeWidth={1.5} /> Export CSV
                  </Button>
                </div>
                <div>
                  <p className="mb-2 text-caption text-faint">Cumulative reach by bound</p>
                  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                    {cumulative.map((value, index) => (
                      <div key={index} className="rounded-md border border-line px-3 py-2">
                        <p className="text-caption text-faint">≤ {index + 1} {index === 0 ? 'hop' : 'hops'}</p>
                        <p className="mt-1 font-mono text-[20px] leading-none text-ink tabular">{num(value)}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-faint">Cumulative totals at 1, 2 and 3 hops, computed from the per-hop counts returned by the API.</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Authors by distance"
              description="Intermediate papers show how each author connects."
              actions={<Badge>{rows.length} shown</Badge>}
            />
            <div className="border-b border-line px-4 py-2">
              <input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Filter by name"
                aria-label="Filter reachable authors by name"
                className="h-8 w-full max-w-xs rounded-sm border border-line bg-surface-2 px-2 text-[12px] text-ink placeholder:text-faint"
              />
            </div>
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-left text-small" aria-label="Reachable authors">
                <thead>
                  <tr className="sticky top-0 bg-surface-2">
                    <th scope="col" className="px-4 py-2 text-caption font-medium text-muted">Author</th>
                    <th scope="col" className="px-4 py-2 text-caption font-medium text-muted">Affiliation</th>
                    <th scope="col" className="px-4 py-2 text-right text-caption font-medium text-muted">Hops</th>
                    <th scope="col" className="px-4 py-2 text-caption font-medium text-muted">Via papers</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.authorId}
                      tabIndex={0}
                      className="cursor-pointer border-b border-line/60 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                      onClick={() => navigate(`/app/graph?type=author&id=${row.authorId}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          navigate(`/app/graph?type=author&id=${row.authorId}`);
                        }
                      }}
                      title="Open this author in Graph Explorer"
                    >
                      <td className="px-4 py-2">
                        <span className="text-ink">{row.name}</span>
                        <span className="ml-1.5 font-mono text-[10px] text-faint">#{row.authorId}</span>
                      </td>
                      <td className="px-4 py-2 text-muted">{row.affiliation ?? '—'}<span className="text-faint">{row.country ? ` · ${row.country}` : ''}</span></td>
                      <td className="px-4 py-2 text-right font-mono text-[11px] text-ink tabular">{row.hops}</td>
                      <td className="px-4 py-2 text-[11px] text-muted">
                        {row.intermediatePapers.slice(0, 2).map((paper) => paper.title).join(' · ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <QueryPanel query={reach.data.cypher} elapsedMs={reach.data.elapsed_ms} title="Cypher used for the bounded traversal" />
        </div>
      ) : null}
    </div>
  );
}
