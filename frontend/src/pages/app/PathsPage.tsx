import { useSearchParams } from 'react-router-dom';
import { useSession } from '@/session/SessionProvider';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { intParam } from '@/api/params';
import { ShortestPathPanel } from './paths/ShortestPathPanel';
import { ReachPanel } from './paths/ReachPanel';

export function PathsPage() {
  const [params, setParams] = useSearchParams();
  const { session } = useSession();
  const myAuthorId = session?.identity?.kind === 'author' ? session.identity.id : null;
  const mode = params.get('mode') === 'hops' ? 'hops' : 'shortest';
  const from = intParam(params.get('from')) ?? (mode === 'shortest' && !params.has('from') ? myAuthorId : null);
  const to = intParam(params.get('to'));
  const author = intParam(params.get('author')) ?? (mode === 'hops' && !params.has('author') ? myAuthorId : null);
  const hops = Math.min(3, Math.max(1, Number(params.get('hops') ?? 2) || 2));

  const update = (changes: Record<string, string | null>): void => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === null) next.delete(key);
      else next.set(key, value);
    });
    setParams(next);
  };

  return (
    <div>
      <PageHeader
        title="Collaboration paths"
        description="Shortest co-authorship chains and bounded reachability, computed by the graph database."
      />
      <Tabs
        label="Path view"
        value={mode}
        onChange={(value) => update({ mode: value === 'shortest' ? null : value })}
        tabs={[
          { value: 'shortest', label: 'Shortest path' },
          { value: 'hops', label: 'Within N hops' },
        ]}
      />
      <div className="pt-4">
        {mode === 'shortest' ? (
          <ShortestPathPanel
            from={from}
            to={to}
            onFrom={(value) => update({ from: value === null ? null : String(value) })}
            onTo={(value) => update({ to: value === null ? null : String(value) })}
            onPreset={(nextFrom, nextTo) => update({ from: String(nextFrom), to: String(nextTo) })}
          />
        ) : (
          <ReachPanel
            author={author}
            hops={hops}
            onAuthor={(value) => update({ author: value === null ? null : String(value) })}
            onHops={(value) => update({ hops: String(value) })}
          />
        )}
      </div>
    </div>
  );
}
