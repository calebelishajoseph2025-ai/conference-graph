import { Trace } from './Trace';

function ConflictDiagram() {
  return (
    <svg viewBox="0 0 360 130" className="w-full" role="img" aria-label="A reviewer joined to an author by SAME_PERSON_AS, and that author wrote the paper.">
      <circle cx="55" cy="65" r="15" fill="rgb(var(--bg))" stroke="rgb(var(--text))" strokeWidth="2.4" />
      <text x="55" y="100" textAnchor="middle" fontSize="10" fill="rgb(var(--text-muted))" fontFamily="Geist Variable">Reviewer</text>
      <line x1="70" y1="65" x2="158" y2="65" stroke="rgb(var(--bad))" strokeWidth="1.5" />
      <text x="114" y="56" textAnchor="middle" fontSize="8" fill="rgb(var(--bad))" fontFamily="Geist Mono Variable">SAME_PERSON_AS</text>
      <circle cx="174" cy="65" r="15" fill="rgb(var(--text))" />
      <text x="174" y="100" textAnchor="middle" fontSize="10" fill="rgb(var(--text-muted))" fontFamily="Geist Variable">Author</text>
      <line x1="189" y1="65" x2="277" y2="65" stroke="rgb(var(--text) / .4)" strokeWidth="1.2" />
      <text x="233" y="56" textAnchor="middle" fontSize="8" fill="rgb(var(--text-muted))" fontFamily="Geist Mono Variable">WROTE</text>
      <rect x="292" y="50" width="36" height="30" rx="5" fill="rgb(var(--surface-3))" stroke="rgb(var(--text))" />
      <text x="310" y="100" textAnchor="middle" fontSize="10" fill="rgb(var(--text-muted))" fontFamily="Geist Variable">Paper</text>
    </svg>
  );
}

function RankDiagram() {
  const rows = [
    { width: '92%', label: '9' },
    { width: '66%', label: '6' },
    { width: '41%', label: '3' },
  ];
  return (
    <div className="space-y-2" aria-hidden>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full" style={{ width: row.width, backgroundImage: 'var(--grad-bar)' }} />
          </div>
          <span className="w-3 font-mono text-[10px] text-faint">{row.label}</span>
        </div>
      ))}
    </div>
  );
}

function AutoAcceptDiagram() {
  return (
    <div className="flex items-center gap-2" aria-hidden>
      <span className="rounded-sm border border-line px-2 py-1 font-mono text-[11px] text-muted">score 9</span>
      <span className="text-faint">→</span>
      <span className="inline-flex items-center gap-1 rounded-full border border-ok/40 px-2 py-1 text-[11px] text-ok">
        <span className="h-1.5 w-1.5 rounded-full bg-ok" /> Accepted
      </span>
    </div>
  );
}

function PathDiagram() {
  return (
    <svg viewBox="0 0 240 40" className="w-full" aria-hidden>
      <line x1="18" y1="20" x2="222" y2="20" stroke="rgb(var(--text) / .3)" strokeWidth="1" />
      {[18, 69, 120, 171, 222].map((x, index) => (
        <circle key={x} cx={x} cy="20" r="5" fill={index % 2 === 0 ? 'rgb(var(--text))' : 'rgb(var(--surface-3))'} stroke="rgb(var(--text))" strokeWidth="1.2" />
      ))}
    </svg>
  );
}

function NetworkDiagram() {
  const nodes = [
    { x: 120, y: 40 }, { x: 60, y: 20 }, { x: 180, y: 18 }, { x: 40, y: 62 }, { x: 196, y: 60 }, { x: 120, y: 10 },
  ];
  return (
    <svg viewBox="0 0 240 80" className="w-full" aria-hidden>
      {nodes.slice(1).map((node) => (
        <line key={`${node.x}-${node.y}`} x1="120" y1="40" x2={node.x} y2={node.y} stroke="rgb(var(--text) / .25)" />
      ))}
      {nodes.map((node, index) => (
        <circle key={`${node.x}-${node.y}`} cx={node.x} cy={node.y} r={index === 0 ? 8 : 5} fill={index === 0 ? 'rgb(var(--accent))' : 'rgb(var(--text))'} />
      ))}
    </svg>
  );
}

const FEATURES = [
  {
    title: 'Explainable reviewer ranking',
    body: 'Each candidate gets a score made of shared keywords, expertise match and workload, and you see every part.',
    diagram: <RankDiagram />,
  },
  {
    title: 'Auto-accept parity',
    body: 'A score of 9 or more on a non-rejected paper sets it to Accepted, in the Oracle trigger and in the graph.',
    diagram: <AutoAcceptDiagram />,
  },
  {
    title: 'Shortest collaboration paths',
    body: 'Find how two researchers connect through shared papers, with every intermediate paper named.',
    diagram: <PathDiagram />,
  },
  {
    title: 'Network analytics',
    body: 'Most connected authors, institution pairs and research areas, straight from the graph.',
    diagram: <NetworkDiagram />,
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-16 py-20 lg:py-[120px]">
      <div className="relative mx-auto max-w-content px-6">
      <Trace />
      <p className="text-caption text-muted">What it does</p>
      <h2 className="mt-3 max-w-[22ch] text-[clamp(26px,3vw,38px)] font-semibold leading-[1.14] tracking-[-0.03em] text-ink">
        The graph earns its place where the question is about connection.
      </h2>
      <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <article className="hairline rounded-lg bg-surface p-6 md:col-span-2">
          <div className="grid gap-6 sm:grid-cols-[1fr_1.1fr] sm:items-center">
            <div>
              <p className="text-caption text-faint">Graph-native</p>
              <h3 className="mt-2 text-h3 text-ink">Conflict-of-interest detection</h3>
              <p className="mt-2 max-w-[46ch] text-small leading-relaxed text-muted">
                A reviewer who is also an author is caught by a single traversal, and the exact path is shown. Oracle
                answers the same question with an email join across two tables.
              </p>
            </div>
            <ConflictDiagram />
          </div>
        </article>
        {FEATURES.map((feature) => (
          <article key={feature.title} className="hairline rounded-lg bg-surface p-5">
            <h3 className="text-[15px] font-semibold text-ink">{feature.title}</h3>
            <p className="mt-2 text-small leading-relaxed text-muted">{feature.body}</p>
            <div className="mt-5">{feature.diagram}</div>
          </article>
        ))}
      </div>
      </div>
    </section>
  );
}
