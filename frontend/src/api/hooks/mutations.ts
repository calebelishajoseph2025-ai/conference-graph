import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../client';
import { keys } from '../keys';
import {
  assignmentResultSchema,
  deletionResultSchema,
  oracleAssignSchema,
  paperDetailSchema,
  reviewResultSchema,
} from '../schemas/papers';
import { adminResetSchema } from '../schemas/common';
import type { PaperDetail } from '../schemas/papers';

export interface CreatePaperBody {
  title: string;
  abstract: string;
  confId: number;
  trackId: number;
  authors: { authorId: number; authorOrder: number; isCorresponding: boolean }[];
  keywordIds: number[];
}

export interface UpdatePaperBody {
  title?: string;
  abstract?: string;
  status?: string;
}

function usePaperInvalidation() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: ['papers'] });
    void client.invalidateQueries({ queryKey: ['paper'] });
    void client.invalidateQueries({ queryKey: keys.parity });
    void client.invalidateQueries({ queryKey: keys.health });
    void client.invalidateQueries({ queryKey: ['recommend'] });
    void client.invalidateQueries({ queryKey: ['author'] });
    void client.invalidateQueries({ queryKey: ['reviewer'] });
  };
}

export function useCreatePaper() {
  const invalidate = usePaperInvalidation();
  return useMutation({
    mutationFn: (body: CreatePaperBody) =>
      apiFetch('/papers', { schema: paperDetailSchema, envelope: 'wrapped', method: 'POST', body }).then((r) => r.data),
    retry: 0,
    onSuccess: invalidate,
  });
}

export function useUpdatePaper() {
  const invalidate = usePaperInvalidation();
  return useMutation({
    mutationFn: ({ id, body, adminToken }: { id: number; body: UpdatePaperBody; adminToken?: string }) =>
      apiFetch(`/papers/${id}`, {
        schema: paperDetailSchema,
        envelope: 'wrapped',
        method: 'PATCH',
        body,
        adminToken,
      }).then((r) => r.data),
    retry: 0,
    onSuccess: invalidate,
  });
}

export function useDeletePaper() {
  const invalidate = usePaperInvalidation();
  return useMutation({
    mutationFn: ({ id, adminToken }: { id: number; adminToken?: string }) =>
      apiFetch(`/papers/${id}?confirm=true`, {
        schema: deletionResultSchema,
        envelope: 'wrapped',
        method: 'DELETE',
        adminToken,
      }).then((r) => r.data),
    retry: 0,
    onSuccess: invalidate,
  });
}

export function useAssignReviewer() {
  const invalidate = usePaperInvalidation();
  return useMutation({
    mutationFn: ({ paperId, reviewerId }: { paperId: number; reviewerId: number }) =>
      apiFetch(`/papers/${paperId}/assignments`, {
        schema: assignmentResultSchema,
        envelope: 'wrapped',
        method: 'POST',
        body: { reviewerId },
      }).then((r) => r.data),
    retry: 0,
    onSuccess: invalidate,
  });
}

export function useCreateReview() {
  const invalidate = usePaperInvalidation();
  return useMutation({
    mutationFn: ({
      paperId,
      reviewerId,
      score,
      comments,
      recommendation,
    }: {
      paperId: number;
      reviewerId: number;
      score: number;
      comments: string;
      recommendation: string;
    }) =>
      apiFetch(`/papers/${paperId}/reviews`, {
        schema: reviewResultSchema,
        envelope: 'wrapped',
        method: 'POST',
        body: { reviewerId, score, comments, recommendation },
      }).then((r) => r.data),
    retry: 0,
    onSuccess: invalidate,
  });
}

export function useOracleAssign() {
  const invalidate = usePaperInvalidation();
  return useMutation({
    mutationFn: ({
      paperId,
      reviewerId,
      commit,
      confirm,
      adminToken,
    }: {
      paperId: number;
      reviewerId: number;
      commit: boolean;
      confirm: boolean;
      adminToken?: string;
    }) =>
      apiFetch('/oracle/assign-reviewer', {
        schema: oracleAssignSchema,
        envelope: 'wrapped',
        method: 'POST',
        body: { paperId, reviewerId, commit, confirm },
        adminToken,
      }).then((r) => r.data),
    retry: 0,
    onSuccess: invalidate,
  });
}

export function useResetNeo4j() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (adminToken: string) =>
      apiFetch('/admin/reset-neo4j', {
        schema: adminResetSchema,
        envelope: 'wrapped',
        method: 'POST',
        body: { confirm: true },
        adminToken,
      }).then((r) => r.data),
    retry: 0,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.parity });
      void client.invalidateQueries({ queryKey: keys.health });
      void client.invalidateQueries({ queryKey: ['papers'] });
      void client.invalidateQueries({ queryKey: ['graph'] });
      void client.invalidateQueries({ queryKey: ['central'] });
    },
  });
}

export type { PaperDetail };
