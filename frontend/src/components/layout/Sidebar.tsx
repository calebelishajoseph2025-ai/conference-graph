import { NavLink } from 'react-router-dom';
import { useState, type ReactNode } from 'react';
import {
  Activity, ClipboardCheck, FileText, Gauge, ListChecks, Network, PanelLeftClose, PanelLeftOpen,
  Route, Shield, Table2, Timer, UserCheck, Waypoints,
} from 'lucide-react';
import { useSession } from '@/session/SessionProvider';
import { PERSONAS } from '@/session/personas';
import { cn } from '@/lib/cn';
import { Tooltip } from '@/components/ui/Tooltip';
import { LogoMark } from '@/components/brand/Logo';

const ICONS: Record<string, ReactNode> = {
  '/app/walkthrough': <ListChecks size={17} strokeWidth={1.5} />,
  '/app/overview': <Gauge size={17} strokeWidth={1.5} />,
  '/app/graph': <Waypoints size={17} strokeWidth={1.5} />,
  '/app/papers': <FileText size={17} strokeWidth={1.5} />,
  '/app/assignments': <UserCheck size={17} strokeWidth={1.5} />,
  '/app/reviews': <ClipboardCheck size={17} strokeWidth={1.5} />,
  '/app/paths': <Route size={17} strokeWidth={1.5} />,
  '/app/analytics': <Activity size={17} strokeWidth={1.5} />,
  '/app/benchmark': <Timer size={17} strokeWidth={1.5} />,
  '/app/schema': <Table2 size={17} strokeWidth={1.5} />,
  '/app/admin': <Shield size={17} strokeWidth={1.5} />,
  '/app/my-papers': <FileText size={17} strokeWidth={1.5} />,
  '/app/my-reviews': <ClipboardCheck size={17} strokeWidth={1.5} />,
};

export function Sidebar() {
  const { session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  if (!session) return null;
  const nav = PERSONAS[session.persona].nav;

  return (
    <aside
      className={cn(
        'sticky top-0 z-30 flex h-screen shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-base ease-out',
        collapsed ? 'w-16' : 'w-[232px]'
      )}
    >
      <div className={cn('flex h-[52px] items-center border-b border-line', collapsed ? 'justify-center px-2' : 'px-4')}>
        <NavLink to="/" className="flex items-center gap-2 text-ink" aria-label="Conference Graph home">
          <LogoMark size={22} />
          {collapsed ? null : <span className="text-[14px] font-semibold tracking-[-0.02em]">Conference Graph</span>}
        </NavLink>
      </div>
      <nav aria-label="Workspace" className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {nav.map((item) => (
            <li key={item.to}>
              <Tooltip label={item.label}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors duration-fast',
                      collapsed ? 'justify-center px-0' : '',
                      isActive
                        ? 'bg-surface-2 font-medium text-ink'
                        : 'text-muted hover:bg-surface-2/60 hover:text-ink'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={cn('shrink-0 transition-colors duration-fast', isActive ? 'text-ink' : 'text-muted group-hover:text-ink')}>
                        {ICONS[item.to] ?? <Network size={17} strokeWidth={1.5} />}
                      </span>
                      {collapsed ? null : <span className="truncate">{item.label}</span>}
                    </>
                  )}
                </NavLink>
              </Tooltip>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-line p-2">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className={cn(
            'flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-[12px] text-faint transition-colors duration-fast hover:bg-surface-2 hover:text-ink',
            collapsed && 'justify-center px-0'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={16} strokeWidth={1.5} /> : <PanelLeftClose size={16} strokeWidth={1.5} />}
          {collapsed ? null : <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
