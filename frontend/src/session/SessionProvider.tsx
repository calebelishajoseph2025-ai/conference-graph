import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Identity, PersonaId, Session } from './personas';
import { loadStoredSession, saveStoredSession, clearStoredSession } from '@/auth/session';

interface SessionContextValue {
  session: Session | null;
  signIn: (persona: PersonaId, identity?: Identity, adminToken?: string) => void;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }): JSX.Element {
  const [session, setSession] = useState<Session | null>(loadStoredSession);

  const signIn = useCallback((persona: PersonaId, identity?: Identity, adminToken?: string) => {
    const nextSession: Session = { persona, identity, adminToken };
    saveStoredSession(nextSession);
    setSession(nextSession);
  }, []);

  const signOut = useCallback(() => {
    clearStoredSession();
    setSession(null);
  }, []);

  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
