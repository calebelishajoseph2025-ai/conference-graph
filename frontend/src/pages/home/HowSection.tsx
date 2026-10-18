import { useEffect, useRef, useState, type RefObject } from 'react';
import { Trace } from './Trace';

function useInView<T extends Element>(): { ref: RefObject<T>; inView: boolean } {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, inView };
}

function Arrow({ d, delay, inView }: { d: string; delay: number; inView: boolean }) {
  return (
    <path
      d={d}
      fill="none"
      stroke="rgb(var(--text) / .45)"
      strokeWidth="1.4"
      markerEnd="url(#arrowhead)"
      pathLength={1}
      strokeDasharray="1"
      strokeDashoffset={inView ? 0 : 1}
      style={{ transition: `stroke-dashoffset 500ms var(--ease-out) ${delay}ms` }}
    />
  );
}

const STAGES = [
  { tag: 'DA1', title: 'ER model and BCNF', body: 'Thirteen tables normalised to Boyce-Codd normal form, with the constraints the conference actually needs.' },
  { tag: 'DA2', title: 'SQL and PL/SQL', body: 'Procedures and triggers: sp_assign_reviewer, trg_no_self_review and trg_flag_paper, enforced inside Oracle.' },
  { tag: 'DA3', title: 'The graph model', body: 'Eight node types, twelve relationship types, and a dashboard that compares both databases live.' },
];

export function HowSection() {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <section id="architecture" className="scroll-mt-16 py-20 lg:py-[120px]">
      <div className="relative mx-auto max-w-content px-6">
      <Trace />
      <p className="text-caption text-muted">System Architecture</p>
      <h2 className="mt-3 max-w-[20ch] text-[clamp(26px,3vw,38px)] font-semibold leading-[1.14] tracking-[-0.03em] text-ink">
        One API in front of two databases that do not know about each other.
      </h2>
      <div ref={ref} className="mt-8 overflow-x-auto rounded-lg border border-line bg-surface p-3">
        <svg viewBox="0 0 1080 310" className="min-w-[760px] w-full" role="img" aria-label="Architecture: the React browser app calls the FastAPI layer, which reads and writes Oracle AI Database 26ai and Neo4j. A dashed SAME_PERSON_AS edge links the two database boxes.">
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0 0 L8 4 L0 8 z" fill="rgb(var(--text) / .45)" />
            </marker>
          </defs>
          <g fontFamily="Geist Variable">
            <rect x="30" y="105" width="200" height="100" rx="10" fill="rgb(var(--surface-2))" stroke="rgb(var(--border-strong))" />
            <text x="50" y="140" fontSize="15" fontWeight="600" fill="rgb(var(--text))">Browser</text>
            <text x="50" y="162" fontSize="11" fill="rgb(var(--text-muted))">React · TypeScript</text>
            <text x="50" y="180" fontSize="11" fill="rgb(var(--text-faint))">no direct database access</text>

            <rect x="300" y="105" width="200" height="100" rx="10" fill="rgb(var(--surface-2))" stroke="rgb(var(--border-strong))" />
            <text x="320" y="140" fontSize="15" fontWeight="600" fill="rgb(var(--text))">FastAPI</text>
            <text x="320" y="162" fontSize="11" fill="rgb(var(--text-muted))">/api · one contract</text>
            <text x="320" y="180" fontSize="11" fill="rgb(var(--text-faint))">validates every response</text>

            <rect x="620" y="30" width="250" height="100" rx="10" fill="rgb(var(--surface-2))" stroke="rgb(var(--border-strong))" />
            <text x="640" y="63" fontSize="14" fontWeight="600" fill="rgb(var(--text))">Oracle AI Database 26ai Free</text>
            <text x="640" y="84" fontSize="11" fill="rgb(var(--text-muted))">13 tables · PL/SQL · triggers</text>
            <text x="640" y="101" fontSize="11" fill="rgb(var(--text-faint))">the relational baseline</text>

            <rect x="620" y="200" width="250" height="100" rx="10" fill="rgb(var(--surface-2))" stroke="rgb(var(--border-strong))" />
            <text x="640" y="233" fontSize="14" fontWeight="600" fill="rgb(var(--text))">Neo4j</text>
            <text x="640" y="254" fontSize="11" fill="rgb(var(--text-muted))">8 node types · 12 relationships</text>
            <text x="640" y="271" fontSize="11" fill="rgb(var(--text-faint))">the graph view</text>

            <Arrow d="M232 155 L298 155" delay={0} inView={inView} />
            <Arrow d="M502 143 C 555 130, 570 95, 618 82" delay={120} inView={inView} />
            <Arrow d="M502 167 C 555 180, 570 215, 618 228" delay={200} inView={inView} />

            <line
              x1="905"
              y1="132"
              x2="905"
              y2="198"
              stroke="rgb(var(--text) / .5)"
              strokeDasharray="4 4"
            />
            <text x="918" y="160" fontSize="10" fill="rgb(var(--text-muted))" fontFamily="Geist Mono Variable">SAME_PERSON_AS</text>
            <text x="918" y="176" fontSize="10" fill="rgb(var(--text-faint))">one edge, not an email join</text>

            <text x="30" y="262" fontSize="11" fill="rgb(var(--text-faint))">
              a reviewer who is also an author is one edge between the two models
            </text>
          </g>
        </svg>
      </div>
      <ol className="mt-8 grid gap-6 border-t border-line pt-8 md:grid-cols-3">
        {STAGES.map((stage) => (
          <li key={stage.tag}>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-faint">{stage.tag}</span>
              <span className="h-px flex-1 bg-line" aria-hidden />
            </div>
            <h3 className="mt-3 text-[16px] font-semibold text-ink">{stage.title}</h3>
            <p className="mt-2 text-small leading-relaxed text-muted">{stage.body}</p>
          </li>
        ))}
      </ol>
      </div>
    </section>
  );
}
