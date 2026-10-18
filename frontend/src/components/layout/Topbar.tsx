import { Link, useLocation } from 'react-router-dom';
import { HealthPills } from './HealthPills';
import { PersonaChip } from './PersonaChip';

const ROUTE_LABELS: Record<string, string> = {
  '/app': 'Overview',
  '/app/overview': 'Overview',
  '/app/walkthrough': 'Walkthrough',
  '/app/graph': 'Graph Explorer',
  '/app/papers': 'Papers',
  '/app/assignments': 'Reviewer Assignment',
  '/app/reviews': 'Reviews',
  '/app/paths': 'Collaboration Paths',
  '/app/analytics': 'Network Analytics',
  '/app/benchmark': 'SQL vs Cypher',
  '/app/schema': 'Schema & Evidence',
  '/app/admin': 'Administration',
  '/app/my-papers': 'My Papers',
  '/app/my-reviews': 'My Reviews',
};

function getPageTitle(pathname: string): string | null {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  if (pathname.startsWith('/app/papers/')) {
    const id = pathname.replace('/app/papers/', '');
    return `Paper #${id}`;
  }
  if (pathname.startsWith('/app/assignments/')) {
    const id = pathname.replace('/app/assignments/', '');
    return `Assignment #${id}`;
  }
  if (pathname.startsWith('/app/reviews/')) {
    const id = pathname.replace('/app/reviews/', '');
    return `Review #${id}`;
  }
  if (pathname.startsWith('/app/my-papers/')) {
    const id = pathname.replace('/app/my-papers/', '');
    return `Paper #${id}`;
  }
  return null;
}

export function Topbar() {
  const { pathname } = useLocation();
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-[52px] items-center justify-between gap-4 border-b border-line bg-bg/85 px-5 backdrop-blur-md">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[12px]">
        <Link to="/" className="text-faint transition-colors duration-fast hover:text-ink">
          Home
        </Link>
        <span className="text-line-strong select-none" aria-hidden>/</span>
        <span className="text-muted">Workspace</span>
        {pageTitle ? (
          <>
            <span className="text-line-strong select-none" aria-hidden>/</span>
            <span className="truncate font-medium text-ink">{pageTitle}</span>
          </>
        ) : null}
      </nav>
      <div className="flex items-center gap-2.5">
        <HealthPills />
        <PersonaChip />
      </div>
    </header>
  );
}
