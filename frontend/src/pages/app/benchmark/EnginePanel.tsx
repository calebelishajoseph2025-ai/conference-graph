import { Download } from 'lucide-react';
import type { CompareEngine } from '@/api/schemas/compare';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CopyButton } from '@/components/ui/CopyButton';
import { ms, plural } from '@/lib/format';
import { exportToCsv } from '@/lib/csv';

export function EnginePanel({
  engine,
  tone,
  label,
}: {
  engine: CompareEngine;
  tone: 'oracle' | 'neo4j';
  label: string;
}) {
  const columns = Array.from(new Set(engine.sampleRows.flatMap((row) => Object.keys(row))));
  const maxTiming = Math.max(0.001, ...engine.timings);

  const exportSample = (): void => {
    exportToCsv(
      `${tone}-sample-rows`,
      columns,
      engine.sampleRows.map((row) => columns.map((column) => row[column] as string | number | null))
    );
  };

  return (
    <Card className="flex flex-col">
      <CardHeader
        title={label}
        description={engine.engine}
        actions={<Badge tone={tone === 'oracle' ? 'accent' : 'neutral'}>{plural(engine.rowCount, 'row')}</Badge>}
      />
      <CardBody className="flex-1 space-y-4">
        <div>
          <div className="flex items-baseline justify-between">
            <p className="text-caption text-faint">Median, 5 runs</p>
            <p className="text-[26px] font-medium leading-none text-ink tabular">{ms(engine.medianMs)}</p>
          </div>
          <div className="mt-3 flex h-12 items-end gap-1" role="img" aria-label={`Five timings: ${engine.timings.map((timing) => ms(timing)).join(', ')}`}>
            {engine.timings.map((timing, index) => (
              <div
                key={index}
                className="flex-1 rounded-t-sm bg-ink/60"
                style={{ height: `${Math.max(6, (timing / maxTiming) * 100)}%` }}
                title={ms(timing)}
              />
            ))}
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[10px] text-faint tabular">
            <span>min {ms(Math.min(...engine.timings))}</span>
            <span>max {ms(Math.max(...engine.timings))}</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-caption text-faint">Query</p>
            <CopyButton text={engine.query} label="Copy query" />
          </div>
          <pre className="mt-2 max-h-52 overflow-auto rounded-sm border border-line bg-surface-2 p-2 font-mono text-[11px] leading-relaxed text-muted">
            <code>{engine.query.trim()}</code>
          </pre>
          <p className="mt-1.5 break-all font-mono text-[10px] text-faint">params {JSON.stringify(engine.params)}</p>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-caption text-faint">Sample rows</p>
            <Button variant="ghost" size="sm" onClick={exportSample} disabled={engine.sampleRows.length === 0}>
              <Download size={13} strokeWidth={1.5} /> CSV
            </Button>
          </div>
          <div className="mt-2 overflow-x-auto rounded-sm border border-line">
            <table className="w-full text-left text-[11px]" aria-label={`${label} sample rows`}>
              <thead>
                <tr className="bg-surface-2">
                  {columns.map((column) => (
                    <th key={column} scope="col" className="whitespace-nowrap px-2 py-1.5 font-mono font-medium text-faint">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {engine.sampleRows.map((row, index) => (
                  <tr key={index} className="border-t border-line/60">
                    {columns.map((column) => (
                      <td key={column} className="whitespace-nowrap px-2 py-1.5 text-muted tabular">
                        {row[column] === null || row[column] === undefined ? '—' : String(row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
                {engine.sampleRows.length === 0 ? (
                  <tr><td colSpan={Math.max(1, columns.length)} className="px-2 py-2 text-faint">No rows returned.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
