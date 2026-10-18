import { Link } from 'react-router-dom';
import { LogoMark, Wordmark } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';

const LINKS = [
  { href: '#overview', label: 'Overview' },
  { href: '#comparison', label: 'SQL vs Cypher' },
  { href: '#architecture', label: 'Architecture' },
  { href: '#features', label: 'Features' },
  { href: '#team', label: 'Team' },
];

export function HomeNav() {
  return (
    <nav
      aria-label="Home"
      className="sticky top-0 z-40 border-b border-line/70 bg-bg/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-14 max-w-content items-center justify-between gap-6 px-6">
        <a href="#top" className="flex items-center gap-2 text-ink" aria-label="Conference Graph, back to top">
          <LogoMark size={24} />
          <Wordmark />
        </a>
        <div className="hidden items-center gap-6 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[13px] text-muted transition-colors duration-fast hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link to="/app" className="hidden text-[13px] text-muted transition-colors duration-fast hover:text-ink sm:block">
            Open workspace
          </Link>
          <Button size="sm" onClick={() => document.getElementById('choose')?.scrollIntoView({ behavior: 'smooth' })}>
            Choose a view
          </Button>
        </div>
      </div>
    </nav>
  );
}
