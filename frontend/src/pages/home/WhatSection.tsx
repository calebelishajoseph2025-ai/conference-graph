import content from '@/content/projectContent.json';
import { Trace } from './Trace';

export function WhatSection() {
  const nodeTypes = content.schemaNodes.length;
  const edgeTypes = content.schemaEdges.length;
  const facts = [
    {
      label: 'Relational design',
      body: '13 tables in Boyce-Codd normal form on Oracle, with procedures and triggers that enforce the rules.',
      note: 'DA1 and DA2',
    },
    {
      label: 'Graph design',
      body: `The same data as ${nodeTypes} node types and ${edgeTypes} relationship types in Neo4j.`,
      note: 'DA3',
    },
    {
      label: 'A live audit',
      body: 'Every count, status and average is compared between the two databases, on demand.',
      note: 'Parity',
    },
  ];
  return (
    <section id="overview" className="scroll-mt-16 py-20 lg:py-[120px]">
      <div className="relative mx-auto max-w-content px-6">
        <Trace />
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-20">
        <div>
          <p className="text-caption text-muted">System Overview</p>
          <h2 className="mt-3 max-w-[16ch] text-[clamp(28px,3.2vw,40px)] font-semibold leading-[1.12] tracking-[-0.03em] text-ink">
            One conference, modelled twice.
          </h2>
          <p className="mt-4 max-w-[52ch] text-small text-muted">
            A working academic conference management system: papers, authors, reviewers, reviews, sessions and
            presentations, held in Oracle and in Neo4j at the same time.
          </p>
        </div>
        <div className="divide-y divide-line border-t border-line">
          {facts.map((fact) => (
            <div key={fact.label} className="grid gap-2 py-5 sm:grid-cols-[132px_1fr] sm:gap-6">
              <div>
                <p className="text-[13px] font-medium text-ink">{fact.label}</p>
                <p className="mt-0.5 text-caption text-faint">{fact.note}</p>
              </div>
              <p className="max-w-[52ch] text-small leading-relaxed text-muted">{fact.body}</p>
            </div>
          ))}
        </div>
        </div>
      </div>
    </section>
  );
}
