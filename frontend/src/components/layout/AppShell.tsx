import { Outlet } from 'react-router-dom';
import { MonitorUp } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

function SmallScreenNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6 lg:hidden">
      <div className="max-w-sm text-center">
        <MonitorUp className="mx-auto text-muted" size={28} strokeWidth={1.5} />
        <h1 className="mt-4 text-h3 text-ink">Use a larger screen</h1>
        <p className="mt-2 text-small text-muted">
          The comparison workspace needs at least 1024 pixels of width. Open this page on a laptop or desktop.
        </p>
        <a href="/" className="mt-4 inline-block text-small text-accent-text underline underline-offset-4">
          Back to the home page
        </a>
      </div>
    </div>
  );
}

export function AppShell() {
  return (
    <>
      <SmallScreenNotice />
      <div className="hidden min-h-screen bg-bg lg:flex">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-sm focus:bg-surface-3 focus:px-3 focus:py-2 focus:text-ink"
        >
          Skip to content
        </a>
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main id="main-content" className="mx-auto w-full max-w-content flex-1 px-6 py-6 xl:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}
