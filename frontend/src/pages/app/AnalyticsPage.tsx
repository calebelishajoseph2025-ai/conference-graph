import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useCentralAuthors, useInstitutions } from '@/api/hooks/queries';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { ErrorState } from '@/components/ui/ErrorState';
import { QueryPanel } from '@/components/graph/QueryPanel';
import { CentralityTab } from './analytics/CentralityTab';
import { InstitutionsTab } from './analytics/InstitutionsTab';
import { AreasTab } from './analytics/AreasTab';

const TABS = [
  { value: 'centrality', label: 'Degree centrality' },
  { value: 'institutions', label: 'Institutions' },
  { value: 'areas', label: 'Research areas' },
] as const;
type TabKey = (typeof TABS)[number]['value'];
const LIMITS = [10, 15, 25, 50];

export function AnalyticsPage() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.some((item) => item.value === params.get('tab')) ? params.get('tab') : 'centrality') as TabKey;
  const limit = LIMITS.includes(Number(params.get('limit'))) ? Number(params.get('limit')) : 15;
  const [filter, setFilter] = useState('');
  const central = useCentralAuthors(limit);
  const institutions = useInstitutions(limit);
  const loading = central.isLoading || institutions.isLoading;

  const update = (changes: Record<string, string | null>): void => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === null) next.delete(key);
      else next.set(key, value);
    });
    setParams(next, { replace: true });
  };

  const refresh = (): void => {
    void central.refetch();
    void institutions.refetch();
  };

  return (
    <div>
      <PageHeader
        title="Network analytics"
        description="Degree, collaboration and reach, computed in Neo4j. No aggregates are cached."
        actions={<Button variant="secondary" size="sm" onClick={refresh}><RefreshCw size={14} strokeWidth={1.5} /> Refresh</Button>}
      />

      <Tabs
        label="Analytics view"
        value={tab}
        onChange={(value) => { setFilter(''); update({ tab: value === 'centrality' ? null : value }); }}
        tabs={TABS.map((item) => ({ value: item.value, label: item.label }))}
      />

      <div className="pt-4">
        {central.isError || institutions.isError ? (
          <ErrorState error={central.error ?? institutions.error} onRetry={refresh} />
        ) : tab === 'centrality' ? (
          <CentralityTab data={central.data} loading={loading} limit={limit} filter={filter} onFilter={setFilter} onLimit={(value) => update({ limit: value === 15 ? null : String(value) })} />
        ) : tab === 'institutions' ? (
          <InstitutionsTab data={institutions.data} loading={loading} />
        ) : (
          <AreasTab data={institutions.data} loading={loading} />
        )}

        {tab === 'centrality' && central.data ? (
          <div className="mt-4"><QueryPanel query={central.data.cypher} elapsedMs={central.data.elapsed_ms} title="Cypher used for centrality" /></div>
        ) : null}

        {institutions.data && tab !== 'centrality' ? (
          <details className="mt-4 rounded-md border border-line bg-surface px-4 py-3">
            <summary className="cursor-pointer text-caption text-faint">Analytics Cypher, all queries</summary>
            <div className="mt-3 space-y-3">
              {institutions.data.cyphers.map((item) => (
                <div key={item.name}>
                  <p className="mb-1 font-mono text-[11px] text-muted">{item.name}</p>
                  <pre className="overflow-auto rounded-sm bg-surface-2 p-2 font-mono text-[11px] text-muted">{item.cypher}</pre>
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}
