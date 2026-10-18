import type { Session } from '@/session/personas';

const SESSION_STORAGE_KEY = 'conference_graph_session';

export function loadStoredSession(): Session | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function saveStoredSession(session: Session): void {
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  } catch {
    // Ignore storage quota or access errors in restricted iframe/browser modes
  }
}

export function clearStoredSession(): void {
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}
