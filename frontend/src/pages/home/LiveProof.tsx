import { WifiOff } from 'lucide-react';
import { useHealth, useParity } from '@/api/hooks/queries';
import { Stat } from '@/components/ui/Stat';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

export function LiveProof() {
  const health = useHealth();
  const parity = useParity();
  const offline = health.isError;
  const matched = parity.data?.rows.filter((row) => row.match).length ?? null;
  const total = parity.data?.rows.length ?? null;

  const items = [
    { caption: 'Graph nodes', value: health.data?.neo4j.nodes ?? null, hint: 'Neo4j' },
    { caption: 'Relationships', value: health.data?.neo4j.relationships ?? null, hint: 'Neo4j' },
    { caption: 'Oracle rows', value: health.data?.oracle.total_rows ?? null, hint: '13 tables' },
    { caption: 'Parity checks', value: matched !== null && total !== null ? `${matched} / ${total}` : null, hint: 'matched' },
  ];

  return (
    <section aria-label="Live proof" className="border-y border-line bg-surface/40">
      <div className="mx-auto max-w-content px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-caption text-muted">Live proof, read from both databases just now</p>
          {offline ? (
            <Badge tone="bad" icon={<WifiOff size={12} strokeWidth={1.5} />}>
              Backend offline
            </Badge>
          ) : (
            <Badge tone="ok" dot>
              Live data
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-y-8 divide-line lg:grid-cols-4 lg:divide-x">
          {items.map((item, index) => (
            <div key={item.caption} className={index === 0 ? 'lg:pr-8' : 'lg:px-8'}>
              {health.isLoading || parity.isLoading ? (
                <div>
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-3 h-12 w-28" />
                </div>
              ) : (
                <Stat
                  caption={item.caption}
                  value={offline ? '—' : item.value}
                  hint={offline ? 'Backend offline' : item.hint}
                  live={!offline}
                  className="[&>div:nth-child(2)]:text-[clamp(28px,3.4vw,44px)]"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
