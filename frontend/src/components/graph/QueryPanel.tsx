import { Code2 } from 'lucide-react';
import { CopyButton } from '@/components/ui/CopyButton';
import { ms } from '@/lib/format';

export function QueryPanel({
  query,
  params,
  elapsedMs,
  title = 'Cypher used',
  cypherLabel = 'Cypher',
}: {
  query: string;
  params?: Record<string, unknown> | null;
  elapsedMs?: number | null;
  title?: string;
  cypherLabel?: string;
}) {
  const paramText = params ? JSON.stringify(params) : '';
  return (
    <div className="rounded-md border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-3 py-2">
        <div className="flex items-center gap-2 text-[12px] text-muted">
          <Code2 size={13} strokeWidth={1.5} />
          {title}
          {elapsedMs !== undefined && elapsedMs !== null ? (
            <span className="font-mono text-[11px] text-faint">{ms(elapsedMs)}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {paramText ? <CopyButton text={paramText} label="Copy params" /> : null}
          <CopyButton text={query} label={`Copy ${cypherLabel.toLowerCase()}`} />
        </div>
      </div>
      <pre className="max-h-56 overflow-auto px-3 py-3 font-mono text-[11px] leading-relaxed text-muted">
        <code>{query}</code>
      </pre>
      {paramText ? (
        <div className="border-t border-line px-3 py-2">
          <p className="mb-1 text-caption text-faint">Params</p>
          <code className="break-all font-mono text-[11px] text-muted">{paramText}</code>
        </div>
      ) : null}
    </div>
  );
}
