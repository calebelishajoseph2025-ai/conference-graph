import { Link } from 'react-router-dom';
import { Database, Network } from 'lucide-react';
import { useHealth } from '@/api/hooks/queries';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/cn';
import {
  formatDatabaseName,
  formatDeployment,
  formatEngine,
  formatSchemaUser,
} from '@/lib/format';

function statusText(value: string | undefined): string {
  if (!value) return 'Checking';
  return value === 'connected' ? 'Connected' : 'Unreachable';
}

function Pill({
  label,
  status,
  icon,
  detail,
}: {
  label: string;
  status: string | undefined;
  icon: JSX.Element;
  detail: string;
}) {
  const connected = status === 'connected';
  return (
    <Tooltip label={detail}>
      <Link
        to="/app/overview"
        className="inline-flex items-center gap-2 rounded-full border border-line px-2.5 py-1 text-[12px] text-muted transition-colors duration-fast hover:border-line-strong hover:text-ink"
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', connected ? 'bg-ok' : status ? 'bg-bad' : 'bg-faint')} aria-hidden />
        <span className="hidden sm:inline">{icon}</span>
        <span>{label}</span>
        <span className={cn('hidden md:inline', connected ? 'text-faint' : 'text-bad')}>{statusText(status)}</span>
      </Link>
    </Tooltip>
  );
}

export function HealthPills() {
  const health = useHealth();
  const neo4j = health.data?.neo4j;
  const oracle = health.data?.oracle;
  return (
    <div className="flex items-center gap-2">
      <Pill
        label="Neo4j"
        status={health.isError ? 'unreachable' : neo4j?.status}
        icon={<Network size={13} strokeWidth={1.5} />}
        detail={neo4j ? `${formatDeployment(neo4j.uri)} · ${formatDatabaseName(neo4j.database)}` : 'Neo4j status'}
      />
      <Pill
        label="Oracle"
        status={health.isError ? 'unreachable' : oracle?.status}
        icon={<Database size={13} strokeWidth={1.5} />}
        detail={oracle ? `${formatEngine(oracle.dsn)} · ${formatSchemaUser(oracle.user)}` : 'Oracle status'}
      />
    </div>
  );
}
