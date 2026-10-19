const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function num(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toLocaleString('en-US');
}

export function score(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(1);
}

export function ms(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toFixed(2)} ms`;
}

export function pct(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toFixed(1)}%`;
}

export function plural(count: number, singular: string, pluralWord?: string): string {
  return `${count} ${count === 1 ? singular : (pluralWord ?? `${singular}s`)}`;
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1))}…`;
}

export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function formatDeployment(rawUri: string | null | undefined): string {
  if (!rawUri || rawUri === '—') return 'Graph Database';
  const lower = rawUri.toLowerCase();
  if (lower.includes('auradb') || lower.includes('databases.neo4j.io') || lower.includes('+s') || lower.includes('cloud')) {
    return 'Neo4j AuraDB (Cloud)';
  }
  if (lower.includes('127.0.0.1') || lower.includes('localhost') || lower.includes('desktop')) {
    return 'Neo4j Desktop (Local)';
  }
  return 'Neo4j Graph Database';
}

export function formatDatabaseName(rawDb: string | null | undefined): string {
  if (!rawDb || rawDb === '—') return 'Production Graph';
  if (/^[0-9a-f]{8,}$/i.test(rawDb) || rawDb.length > 20) {
    return 'Production Graph';
  }
  return rawDb === 'neo4j' ? 'Production Graph' : rawDb;
}

export function formatEngine(rawDsn: string | null | undefined): string {
  if (!rawDsn || rawDsn === '—') return 'Relational Database';
  const lower = rawDsn.toLowerCase();
  if (lower.includes('embedded') || lower.includes('csv') || lower.includes('in-memory')) {
    return 'Oracle In-Memory Engine';
  }
  if (lower.includes('127.0.0.1') || lower.includes('localhost') || lower.includes('1521')) {
    return 'Oracle AI Database 26ai (Local)';
  }
  return 'Oracle AI Database 26ai (Cloud)';
}

export function formatSchemaUser(rawUser: string | null | undefined): string {
  if (!rawUser || rawUser === '—') return 'Conference Schema';
  return 'Conference Schema';
}

