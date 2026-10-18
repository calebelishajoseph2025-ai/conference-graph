import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { COMPARE_COAUTHORS, SQL_COAUTHORS, lineCount } from '@/content/queries';
import { cn } from '@/lib/cn';

const SQL_KEYWORDS = new Set(['SELECT', 'DISTINCT', 'AS', 'FROM', 'JOIN', 'ON', 'WHERE', 'AND', 'GROUP', 'BY', 'ORDER', 'ASC', 'COUNT', 'NULL']);
const CYPHER_KEYWORDS = new Set(['MATCH', 'WHERE', 'RETURN', 'DISTINCT', 'AS', 'ORDER', 'BY', 'ASC', 'COUNT']);

function tokenize(code: string, kind: 'sql' | 'cypher'): ReactNode[] {
  const keywords = kind === 'sql' ? SQL_KEYWORDS : CYPHER_KEYWORDS;
  const parts = code.split(/(--[^\n]*|\/\/[^\n]*|'[^']*'|\$[a-zA-Z0-9_]+|\b\d+(?:\.\d+)?\b|\b[A-Z]+\b)/g);
  return parts.map((part, index) => {
    if (!part) return null;
    if (part.startsWith('--') || part.startsWith('//')) {
      return <span key={index} className="text-faint italic">{part}</span>;
    }
    if (part.startsWith("'") || part.startsWith('$') || /^\d/.test(part)) {
      return <span key={index} className="text-accent-text">{part}</span>;
    }
    if (keywords.has(part)) {
      return <span key={index} className="font-semibold text-ink">{part}</span>;
    }
    return <span key={index} className="text-muted">{part}</span>;
  });
}

function QueryPanel({
  kind,
  caption,
  code,
  footer,
  className,
}: {
  kind: 'sql' | 'cypher';
  caption: string;
  code: string;
  footer: string;
  className?: string;
}) {
  return (
    <figure className={cn('hairline flex min-h-[300px] flex-col rounded-xl bg-surface p-5 sm:p-6 border border-line', className)}>
      <figcaption className="flex items-center justify-between gap-3 border-b border-line pb-3">
        <span className="text-caption font-medium text-ink">{caption}</span>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[10px] text-faint border border-line">{kind === 'sql' ? 'relational' : 'graph'}</span>
      </figcaption>
      <pre className="mt-4 flex-1 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[12px] leading-[1.8]">
        <code>{tokenize(code, kind)}</code>
      </pre>
      <p className="mt-4 border-t border-line pt-3 text-caption text-faint">{footer}</p>
    </figure>
  );
}

export function WhySection() {
  const sqlLines = lineCount(SQL_COAUTHORS);
  const cypherLines = lineCount(COMPARE_COAUTHORS);
  return (
    <section id="comparison" className="scroll-mt-16 bg-bg text-ink border-t border-line/60">
      <div className="relative mx-auto max-w-content px-6 py-20 lg:py-[120px]">
        <p className="text-caption text-muted">SQL vs Cypher Benchmark</p>
        <h2 className="mt-3 max-w-[22ch] text-[clamp(28px,3.4vw,42px)] font-semibold leading-[1.12] tracking-[-0.03em]">
          Relational stores what exists. A graph stores how things connect.
        </h2>
        <p className="mt-4 max-w-[62ch] text-small text-muted">
          Both queries below answer one question: who co-authored a paper with this author? Nothing is truncated.
        </p>
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <QueryPanel
            kind="sql"
            caption="Oracle SQL"
            code={SQL_COAUTHORS}
            footer={`${sqlLines} lines · two self-joins over PAPER_AUTHOR`}
          />
          <QueryPanel
            kind="cypher"
            caption="Neo4j Cypher"
            code={COMPARE_COAUTHORS}
            footer={`${cypherLines} lines · one traversal to the co-author`}
          />
        </div>
        <div className="mt-10 grid gap-6 border-t border-line pt-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <p className="max-w-[72ch] text-small leading-relaxed text-muted">
            We measure honestly. At this size, Oracle answers many single queries as fast as Neo4j or faster. The graph
            version wins on how little you have to write, and on multi-hop questions that grow with depth.
          </p>
          <a
            href="#choose"
            className="inline-flex items-center gap-1 text-small font-medium text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-fast hover:decoration-ink"
          >
            Run the benchmark
            <ArrowUpRight size={14} strokeWidth={1.5} />
          </a>
        </div>
      </div>
    </section>
  );
}
