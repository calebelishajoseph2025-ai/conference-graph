import { Download, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CentralAuthors } from '@/api/schemas/analytics';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/ErrorState';
import { exportToCsv } from '@/lib/csv';
import { num } from '@/lib/format';

const LIMITS = [10, 15, 25, 50];

export function CentralityTab({
  data,
  loading,
  limit,
  filter,
  onFilter,
  onLimit,
}: {
  data: CentralAuthors | undefined;
  loading: boolean;
  limit: number;
  filter: string;
  onFilter: (value: string) => void;
  onLimit: (value: number) => void;
}) {
  const authors = (data?.authors ?? []).filter((author) => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return true;
    return author.name.toLowerCase().includes(needle)
      || (author.affiliation ?? '').toLowerCase().includes(needle)
      || (author.country ?? '').toLowerCase().includes(needle);
  });
  const max = Math.max(1, ...authors.map((author) => author.distinctCoauthors));

  const exportCsv = (): void => {
    exportToCsv('degree-centrality', ['rank', 'authorId', 'name', 'affiliation', 'country', 'papers', 'distinctCoauthors'],
      authors.map((author, index) => [index + 1, author.authorId, author.name, author.affiliation, author.country, author.paperCount, author.distinctCoauthors]));
  };

  return (
    <Card>
      <CardHeader
        title="Degree centrality"
        description="Authors ranked by distinct co-authors across every paper. Computed live in Neo4j."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} strokeWidth={1.5} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
              <Input value={filter} onChange={(event) => onFilter(event.target.value)} placeholder="Filter rows" aria-label="Filter authors" className="h-8 w-40 pl-8" />
            </div>
            <select
              aria-label="Number of authors"
              value={limit}
              onChange={(event) => onLimit(Number(event.target.value))}
              className="h-8 rounded-sm border border-line bg-surface-2 px-2 text-[12px] text-ink"
            >
              {LIMITS.map((value) => <option key={value} value={value}>Top {value}</option>)}
            </select>
            <Button variant="secondary" size="sm" onClick={exportCsv} disabled={loading || authors.length === 0}>
              <Download size={14} strokeWidth={1.5} /> CSV
            </Button>
          </div>
        }
      />
      <CardBody className="p-0">
        {loading ? <SkeletonRows rows={8} cols={7} /> : authors.length === 0 ? (
          <div className="p-6"><EmptyState title="No authors match" hint="Clear the filter to see the live ranking." /></div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left text-small" aria-label="Degree centrality by author">
              <thead>
                <tr>
                  <th scope="col" className="border-b border-line bg-surface-2 px-4 py-3 text-caption font-medium text-muted">Rank</th>
                  <th scope="col" className="border-b border-line bg-surface-2 px-4 py-3 text-caption font-medium text-muted">Author</th>
                  <th scope="col" className="border-b border-line bg-surface-2 px-4 py-3 text-caption font-medium text-muted">Institution</th>
                  <th scope="col" className="border-b border-line bg-surface-2 px-4 py-3 text-caption font-medium text-muted">Country</th>
                  <th scope="col" className="border-b border-line bg-surface-2 px-4 py-3 text-right text-caption font-medium text-muted">Papers</th>
                  <th scope="col" className="border-b border-line bg-surface-2 px-4 py-3 text-caption font-medium text-muted">Co-authors</th>
                  <th scope="col" className="border-b border-line bg-surface-2 px-4 py-3 text-right text-caption font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {authors.map((author, index) => (
                  <tr key={author.authorId} className="border-b border-line/70">
                    <td className="px-4 py-3 font-mono text-[11px] text-faint tabular">{String(index + 1).padStart(2, '0')}</td>
                    <td className="px-4 py-3">
                      <span className="block font-medium text-ink">{author.name}</span>
                      <span className="font-mono text-[11px] text-faint">#{author.authorId}</span>
                    </td>
                    <td className="px-4 py-3 text-muted">{author.affiliation ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">{author.country ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-[11px] text-ink tabular">{num(author.paperCount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 text-right font-mono text-[11px] text-ink tabular">{num(author.distinctCoauthors)}</span>
                        <span className="h-1.5 min-w-[40px] flex-1 rounded-full bg-surface-3" aria-hidden>
                          <span className="block h-full rounded-full bg-ink/70" style={{ width: `${Math.round((author.distinctCoauthors / max) * 100)}%` }} />
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/app/paths?from=${author.authorId}`} className="text-caption text-muted underline underline-offset-4 hover:text-ink">Trace paths</Link>
                        <Link to={`/app/graph?type=author&id=${author.authorId}&depth=2`} className="text-caption text-muted underline underline-offset-4 hover:text-ink">Graph</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
