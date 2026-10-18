import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ApiError, apiErrorFromResponse, toApiError } from './errors';

describe('errors.test.ts: API Error Normalization and Extraction', () => {
  it('extracts structured 409 conflict of interest with graph path', () => {
    const rawBody = {
      detail: {
        error: 'CONFLICT_OF_INTEREST',
        explanation: 'Reviewer 2 is a co-author with author 1',
        message: 'Reviewer cannot be assigned due to conflict of interest.',
        path: {
          nodes: [
            { id: 'Author:1', label: 'Emma Krishnan', type: 'Author', props: {} },
            { id: 'Paper:1', label: 'Adaptive Query Optimization', type: 'Paper', props: {} },
            { id: 'Author:2', label: 'Reviewer Person', type: 'Author', props: {} },
          ],
          edges: [
            { id: 'e1', source: 'Author:1', target: 'Paper:1', type: 'WROTE', props: {} },
            { id: 'e2', source: 'Author:2', target: 'Paper:1', type: 'WROTE', props: {} },
          ],
        },
      },
      error_id: 'err-12345',
    };

    const err = apiErrorFromResponse(409, rawBody);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(409);
    expect(err.message).toBe('Reviewer 2 is a co-author with author 1');
    expect(err.conflict).toBeDefined();
    expect(err.conflict?.error).toBe('CONFLICT_OF_INTEREST');
    expect(err.conflict?.path?.nodes.length).toBe(3);
    expect(err.conflict?.path?.edges.length).toBe(2);
  });

  it('normalizes FastAPI 422 validation error arrays', () => {
    const rawBody = {
      detail: [
        { loc: ['body', 'title'], msg: 'String should have at least 1 character' },
        { loc: ['body', 'score'], msg: 'Input should be less than or equal to 10' },
      ],
    };

    const err = apiErrorFromResponse(422, rawBody);
    expect(err.status).toBe(422);
    expect(err.message).toContain('title: String should have at least 1 character');
    expect(err.message).toContain('score: Input should be less than or equal to 10');
  });

  it('handles plain string error detail and error_id', () => {
    const rawBody = {
      detail: 'Paper not found.',
      error_id: 'req-abc-999',
    };

    const err = apiErrorFromResponse(404, rawBody);
    expect(err.status).toBe(404);
    expect(err.message).toBe('Paper not found.');
    expect(err.errorId).toBe('req-abc-999');
  });

  it('toApiError passes through ApiError instances unchanged', () => {
    const original = new ApiError(403, 'Forbidden action');
    const result = toApiError(original);
    expect(result).toBe(original);
  });

  it('toApiError transforms ZodError to schema mismatch error', () => {
    const schema = z.object({ id: z.number() });
    const parseResult = schema.safeParse({ id: 'not-a-number' });
    expect(parseResult.success).toBe(false);
    if (!parseResult.success) {
      const err = toApiError(parseResult.error);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.message).toContain('The backend returned a response shape this app does not understand.');
    }
  });

  it('toApiError handles DOMException AbortError and Timeout', () => {
    const abortDom = new DOMException('The user aborted a request.', 'AbortError');
    expect(toApiError(abortDom).message).toBe('The request was cancelled.');

    const timeoutError = new Error('Request timed out');
    timeoutError.name = 'AbortError';
    expect(toApiError(timeoutError).message).toContain('timed out');
  });

  it('toApiError handles standard and unknown exceptions safely', () => {
    const standardErr = new Error('Network offline');
    expect(toApiError(standardErr).message).toBe('Network offline');

    const weirdObject = { weird: true };
    expect(toApiError(weirdObject).message).toBe('Something went wrong.');
  });
});
