import { z } from 'zod';
import type { GraphEdge, GraphNode } from './schemas/common';

export interface ConflictPath {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ConflictDetail {
  error: string;
  explanation?: string;
  message?: string;
  path?: ConflictPath;
}

export class ApiError extends Error {
  status: number;
  detail?: unknown;
  errorId?: string;
  conflict?: ConflictDetail;

  constructor(status: number, message: string, options?: { detail?: unknown; errorId?: string; conflict?: ConflictDetail }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = options?.detail;
    this.errorId = options?.errorId;
    this.conflict = options?.conflict;
  }
}

const conflictPathSchema = z.object({
  nodes: z.array(z.object({ id: z.string(), label: z.string(), type: z.string(), props: z.record(z.unknown()).default({}) })),
  edges: z.array(z.object({ id: z.string(), source: z.string(), target: z.string(), type: z.string(), props: z.record(z.unknown()).default({}) })),
});

function textOfDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const parts = detail.map((item) => {
      if (typeof item === 'object' && item !== null && 'msg' in item) {
        const rec = item as { msg?: unknown; loc?: unknown };
        const loc = Array.isArray(rec.loc) ? rec.loc.filter((p) => p !== 'body').join('.') : '';
        return loc ? `${loc}: ${String(rec.msg)}` : String(rec.msg);
      }
      return JSON.stringify(item);
    });
    return parts.join('; ');
  }
  if (typeof detail === 'object' && detail !== null) {
    const rec = detail as Record<string, unknown>;
    if (typeof rec.message === 'string') return rec.message;
    if (typeof rec.explanation === 'string') return rec.explanation;
    if (typeof rec.error === 'string') return rec.error;
  }
  return '';
}

export function apiErrorFromResponse(status: number, body: unknown): ApiError {
  const rec = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const detail = rec.detail;
  const errorId = typeof rec.error_id === 'string' ? rec.error_id : undefined;

  if (typeof detail === 'object' && detail !== null && !Array.isArray(detail)) {
    const obj = detail as Record<string, unknown>;
    if (obj.error === 'CONFLICT_OF_INTEREST') {
      const parsed = conflictPathSchema.safeParse(obj.path);
      const conflict: ConflictDetail = {
        error: 'CONFLICT_OF_INTEREST',
        explanation: typeof obj.explanation === 'string' ? obj.explanation : undefined,
        message: typeof obj.message === 'string' ? obj.message : undefined,
        path: parsed.success ? parsed.data : undefined,
      };
      return new ApiError(status, conflict.explanation ?? conflict.message ?? 'Conflict of interest detected.', { detail, conflict });
    }
  }

  const message =
    textOfDetail(detail) ||
    (typeof rec.error === 'string' ? rec.error : '') ||
    'The request failed.';

  return new ApiError(status, message, { detail, errorId });
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof z.ZodError) {
    return new ApiError(0, 'The backend returned a response shape this app does not understand.', { detail: error.issues });
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiError(0, 'The request was cancelled.');
  }
  if (error instanceof Error) {
    if (error.name === 'AbortError') return new ApiError(0, 'The request timed out after 15 seconds. Try again.');
    return new ApiError(0, error.message);
  }
  return new ApiError(0, 'Something went wrong.');
}
