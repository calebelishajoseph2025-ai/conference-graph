import type { ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { useSession } from './SessionProvider';
import { can, PERSONAS, type Capability } from './personas';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function RequireSession({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const location = useLocation();
  if (!session) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/?next=${encodeURIComponent(next)}`} replace />;
  }
  return <>{children}</>;
}

export function AccessDenied() {
  const { session } = useSession();
  const navigate = useNavigate();
  const landing = session ? PERSONAS[session.persona].landing : '/';
  return (
    <Card className="mx-auto mt-10 max-w-lg p-8 text-center">
      <LockKeyhole className="mx-auto text-muted" size={26} strokeWidth={1.5} />
      <h1 className="mt-4 text-h3 text-ink">This page isn’t part of your view</h1>
      <p className="mt-2 text-small text-muted">
        {session
          ? `The ${PERSONAS[session.persona].label.toLowerCase()} view does not include this page.`
          : 'Sign in from the home page to open a workspace.'}
      </p>
      <Button className="mt-5" onClick={() => navigate(landing)}>
        Go to my landing page
      </Button>
    </Card>
  );
}

export function RequireCapability({ capability, children }: { capability: Capability; children: ReactNode }) {
  const { session } = useSession();
  if (!can(session, capability)) return <AccessDenied />;
  return <>{children}</>;
}
