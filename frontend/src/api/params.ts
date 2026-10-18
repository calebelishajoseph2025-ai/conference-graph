export interface PaperListParams {
  q?: string;
  status?: string;
  confId?: string;
  page?: number;
  pageSize?: number;
}

export function papersListParams(params: PaperListParams): Record<string, string> {
  const query: Record<string, string> = {};
  const trimmed = params.q?.trim() ?? '';
  if (trimmed) query.q = trimmed.slice(0, 100);
  if (params.status) query.status = params.status;
  if (params.confId) query.confId = params.confId;
  query.page = String(params.page ?? 1);
  query.pageSize = String(params.pageSize ?? 10);
  return query;
}

export function intParam(value: string | null, fallback: number | null = null): number | null {
  if (value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
