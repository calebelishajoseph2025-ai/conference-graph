import type { z } from 'zod';
import { ApiError, apiErrorFromResponse, toApiError } from './errors';

export interface ApiOptions<T> {
  schema: z.ZodType<T>;
  envelope?: 'wrapped' | 'flat';
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  adminToken?: string;
  signal?: AbortSignal;
}

export interface ApiResult<T> {
  data: T;
  meta: Record<string, unknown> | null;
}

const DEFAULT_REMOTE_URL = 'https://conference-graph-api.onrender.com';
const RAW_API_URL = (
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.PROD ? DEFAULT_REMOTE_URL : '')
).replace(/\/$/, '');
const BASE = RAW_API_URL ? `${RAW_API_URL}/api` : '/api';
const BACKEND_DISPLAY_URL = RAW_API_URL || 'http://127.0.0.1:8000';
const TIMEOUT_MS = 15000;

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function apiFetch<T>(path: string, options: ApiOptions<T>): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = (): void => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', onAbort);
  }

  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (options.adminToken) headers['X-Admin-Token'] = options.adminToken;

    let response: Response;
    try {
      response = await fetch(`${BASE}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
    } catch {
      throw new ApiError(0, `Cannot reach the backend at ${BACKEND_DISPLAY_URL}. Is it running?`);
    }

    const body = await readBody(response);
    if (!response.ok) throw apiErrorFromResponse(response.status, body);

    if (options.envelope === 'wrapped') {
      if (typeof body !== 'object' || body === null || !('data' in body)) {
        throw new ApiError(0, 'The backend returned a response without its data envelope.');
      }
      const wrapped = body as { data: unknown; meta?: unknown };
      const meta =
        typeof wrapped.meta === 'object' && wrapped.meta !== null
          ? (wrapped.meta as Record<string, unknown>)
          : null;
      try {
        return { data: options.schema.parse(wrapped.data), meta };
      } catch (error) {
        throw toApiError(error);
      }
    }

    try {
      return { data: options.schema.parse(body), meta: null };
    } catch (error) {
      throw toApiError(error);
    }
  } finally {
    window.clearTimeout(timer);
    if (options.signal) options.signal.removeEventListener('abort', onAbort);
  }
}
