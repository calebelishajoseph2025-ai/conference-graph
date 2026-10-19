import { LogoMark } from '@/components/brand/Logo';

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
          <a href="#choose" className="hover:text-ink">Choose a view</a>
        </div>
      </div>
    </footer>
  );
}
