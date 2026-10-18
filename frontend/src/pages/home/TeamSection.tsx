import { useState } from 'react';
import { LogoMark } from '@/components/brand/Logo';
import { initials } from '@/lib/format';
import { Trace } from './Trace';

const TEAM = [
  {
    name: 'Caleb Elisha Joseph',
    regNo: '25BCE1399',
    role: 'Lead developer',
    detail: 'Backend API and frontend.',
    file: '/team/caleb.jpg',
    initials: 'CJ',
  },
  {
    name: 'Kavya S',
    regNo: '25BCE1365',
    role: 'Relational database designer',
    detail: 'Oracle ER model, BCNF, SQL and PL/SQL (DA1 and DA2).',
    file: '/team/kavya.jpg',
    initials: 'KS',
  },
  {
    name: 'Harishankar S',
    regNo: '25BCE1398',
    role: 'Graph database engineer',
    detail: 'Neo4j model, Cypher queries and the SQL vs Cypher benchmark (DA3).',
    file: '/team/harishankar.jpg',
    initials: 'HS',
  },
];

function Portrait({ name, file, fallback }: { name: string; file: string; fallback: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="rounded-full border border-line p-2 transition-transform duration-base hover:scale-[1.03]">
      <div className="overflow-hidden rounded-full border border-line-strong bg-surface-3">
        {failed ? (
          <div className="flex h-[150px] w-[150px] items-center justify-center text-[28px] font-medium text-ink sm:h-[180px] sm:w-[180px]">
            {fallback}
          </div>
        ) : (
          <img
            src={file}
            alt={name}
            width={180}
            height={180}
            onError={() => setFailed(true)}
            className="h-[150px] w-[150px] object-cover sm:h-[180px] sm:w-[180px]"
          />
        )}
      </div>
    </div>
  );
}

export function TeamSection() {
  return (
    <section id="team" className="scroll-mt-16 py-20 lg:py-[120px]">
      <div className="relative mx-auto max-w-content px-6">
      <Trace />
      <div className="text-center">
        <p className="text-caption text-muted">The people behind it</p>
        <h2 className="mt-3 text-[clamp(26px,3vw,36px)] font-semibold tracking-[-0.03em] text-ink">The team</h2>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8">
        {TEAM.map((member) => (
          <figure key={member.name} className="flex flex-col items-center gap-4 text-center">
            <Portrait name={member.name} file={member.file} fallback={initials(member.name)} />
            <figcaption className="flex flex-col items-center">
              <span className="text-[16px] font-semibold tracking-[-0.01em] text-ink">{member.name}</span>
              <span className="mt-1 font-mono text-[12px] text-muted tabular-nums">{member.regNo}</span>
              <span className="mt-2 text-small font-medium text-ink">{member.role}</span>
              <p className="mt-1 max-w-[32ch] text-caption leading-relaxed text-muted">{member.detail}</p>
            </figcaption>
          </figure>
        ))}
      </div>
      </div>
    </section>
  );
}

export function StackSection() {
  const stack = ['Oracle AI Database 26ai', 'Neo4j', 'FastAPI', 'React', 'TypeScript'];
  return (
    <section aria-label="Stack" className="border-y border-line py-6">
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center">
        {stack.map((item, index) => (
          <span key={item} className="flex items-center gap-6">
            <span className="text-small font-semibold tracking-[-0.01em] text-muted">{item}</span>
            {index < stack.length - 1 ? <span className="hidden h-3 w-px bg-line-strong sm:block" aria-hidden /> : null}
          </span>
        ))}
      </div>
    </section>
  );
}

export function HomeFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-content flex-col gap-4 px-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2">
          <LogoMark size={22} className="mt-0.5 text-ink" />
          <div>
            <p className="text-[13px] font-semibold text-ink">Conference Graph</p>
            <p className="mt-1 max-w-[60ch] text-caption text-faint">
              University DBMS project, DA3, Modern Database Technology. Oracle AI Database 26ai and Neo4j.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-caption text-muted">
          <a href="#overview" className="hover:text-ink">Overview</a>
          <a href="#comparison" className="hover:text-ink">SQL vs Cypher</a>
          <a href="#architecture" className="hover:text-ink">Architecture</a>
          <a href="#features" className="hover:text-ink">Features</a>
          <a href="#team" className="hover:text-ink">Team</a>
          <a href="#choose" className="hover:text-ink">Choose a view</a>
        </div>
      </div>
    </footer>
  );
}
