import { Link } from 'react-router-dom';
import { useHealth, useParity } from '@/api/hooks/queries';
import { num } from '@/lib/format';
import { HomeNav } from './HomeNav';
import { HeroGraph } from './HeroGraph';
import { LiveProof } from './LiveProof';
import { WhatSection } from './WhatSection';
import { WhySection } from './WhySection';
import { HowSection } from './HowSection';
import { FeaturesSection } from './FeaturesSection';
import { StackSection, TeamSection, HomeFooter } from './TeamSection';
import { ChooseView } from './ChooseView';

function Hero() {
  const health = useHealth();
  const parity = useParity();
  const matched = parity.data?.rows.filter((row) => row.match).length ?? null;
  const total = parity.data?.rows.length ?? null;
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="spot pointer-events-none absolute inset-x-0 top-0 h-[520px]" />
      <div aria-hidden className="glow pointer-events-none absolute right-0 top-24 h-[420px] w-[520px]" />
      <div className="relative mx-auto max-w-content px-6 pb-12 pt-14 lg:pb-16 lg:pt-16">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line px-2.5 py-1 text-[11px] text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden />
          Live from Oracle 26ai and Neo4j
        </p>
        <h1 className="max-w-full text-[clamp(40px,4.8vw,78px)] font-semibold leading-[0.98] tracking-[-0.05em]">
          <span className="block overflow-hidden">
            <span className="text-grad block animate-reveal">Academic conferences are a graph.</span>
          </span>
          <span className="block overflow-hidden">
            <span className="text-grad block animate-reveal" style={{ animationDelay: '80ms' }}>We built it twice.</span>
          </span>
        </h1>
        <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7 lg:pr-8">
            <p className="max-w-[560px] text-[16px] leading-relaxed text-muted">
              One conference system, two databases: Oracle AI Database 26ai for the relational record and Neo4j for the
              relationships. Same data, different strengths.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="#choose"
                className="inline-flex h-12 items-center rounded-md border border-transparent bg-ink px-5 text-sm font-medium text-bg transition-opacity duration-fast hover:opacity-90"
              >
                Choose a view
              </a>
              <a
                href="#comparison"
                className="inline-flex h-12 items-center rounded-md border border-line-strong px-5 text-sm font-medium text-ink transition-colors duration-fast hover:bg-surface-2"
              >
                See SQL and Cypher compared
              </a>
            </div>
            <p className="mt-4 text-caption text-faint">Live data from both databases.</p>
          </div>
          <div className="relative lg:col-span-5">
            <div className="hairline rounded-xl bg-surface/60 p-4">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-caption text-faint">Conference graph</span>
                <span className="font-mono text-[10px] text-faint">8 types · 12 relationships</span>
              </div>
              <HeroGraph />
              <div className="mt-2 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
                <div>
                  <p className="text-[11px] text-faint">Nodes</p>
                  <p className="mt-0.5 font-mono text-[12px] text-ink tabular">{health.isError ? '—' : num(health.data?.neo4j.nodes)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-faint">Relationships</p>
                  <p className="mt-0.5 font-mono text-[12px] text-ink tabular">{health.isError ? '—' : num(health.data?.neo4j.relationships)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-faint">Parity</p>
                  <p className="mt-0.5 font-mono text-[12px] text-ok tabular">
                    {matched !== null && total !== null ? `${matched}/${total}` : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Home() {
  return (
    <div id="top" className="min-h-screen bg-bg text-ink">
      <HomeNav />
      <main>
        <Hero />
        <LiveProof />
        <WhatSection />
        <WhySection />
        <HowSection />
        <FeaturesSection />
        <StackSection />
        <TeamSection />
        <ChooseView />
      </main>
      <HomeFooter />
      <Link to="/app" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:rounded-sm focus:bg-surface-3 focus:px-3 focus:py-2">
        Open the workspace
      </Link>
    </div>
  );
}
