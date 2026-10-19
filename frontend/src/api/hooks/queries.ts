import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../client';
import { keys } from '../keys';
import {
  healthSchema,
  paritySchema,
  datasetStatusSchema,
  compareStatsSchema,
  graphSchema,
  type GraphPayload,
} from '../schemas/common';
import { papersListParams, type PaperListParams } from '../params';
import {
  paperListSchema,
  paperDetailSchema,
  recommendResultSchema,
  coiPairsSchema,
} from '../schemas/papers';
import { authorProfileSchema, reviewerProfileSchema } from '../schemas/profiles';
import {
  searchResultSchema,
  collabPathSchema,
  withinHopsSchema,
  centralAuthorsSchema,
  institutionsSchema,
} from '../schemas/analytics';
import { compareResultSchema } from '../schemas/compare';

const retryOnce = 1;

export function useHealth() {
  return useQuery({
    queryKey: keys.health,
    queryFn: ({ signal }) => apiFetch('/health', { schema: healthSchema, envelope: 'flat', signal }).then((r) => r.data),
    refetchInterval: 30000,
    retry: retryOnce,
  });
}

export function useParity() {
  return useQuery({
    queryKey: keys.parity,
    queryFn: ({ signal }) => apiFetch('/admin/parity', { schema: paritySchema, envelope: 'wrapped', signal }).then((r) => r.data),
    retry: retryOnce,
  });
}

export function usePapers(params: PaperListParams) {
  const query = papersListParams(params);
  return useQuery({
    queryKey: keys.papers(query),
    queryFn: ({ signal }) =>
      apiFetch(`/papers?${new URLSearchParams(query)}`, { schema: paperListSchema, envelope: 'wrapped', signal }).then((r) => r.data),
    retry: retryOnce,
  });
}

export function usePaper(id: number | null) {
  return useQuery({
    queryKey: keys.paper(id ?? 0),
    queryFn: ({ signal }) =>
      apiFetch(`/papers/${id}`, { schema: paperDetailSchema, envelope: 'wrapped', signal }).then((r) => r.data),
    enabled: id !== null && id > 0,
    retry: retryOnce,
  });
}

export function useRecommend(paperId: number | null, limit = 8) {
  return useQuery({
    queryKey: keys.recommend(paperId ?? 0),
    queryFn: ({ signal }) =>
      apiFetch(`/recommend/reviewers?paperId=${paperId}&limit=${limit}`, {
        schema: recommendResultSchema,
        envelope: 'wrapped',
        signal,
      }).then((r) => r.data),
    enabled: paperId !== null && paperId > 0,
    retry: retryOnce,
  });
}

export function useCoiPairs() {
  return useQuery({
    queryKey: keys.coiPairs,
    queryFn: ({ signal }) =>
      apiFetch('/demo/coi-pairs', { schema: coiPairsSchema, envelope: 'wrapped', signal }).then((r) => r.data),
    retry: retryOnce,
  });
}

export function useAuthor(id: number | null) {
  return useQuery({
    queryKey: keys.author(id ?? 0),
    queryFn: ({ signal }) =>
      apiFetch(`/authors/${id}`, { schema: authorProfileSchema, envelope: 'wrapped', signal }).then((r) => r.data),
    enabled: id !== null && id > 0,
    retry: retryOnce,
  });
}

export function useReviewer(id: number | null) {
  return useQuery({
    queryKey: keys.reviewer(id ?? 0),
    queryFn: ({ signal }) =>
      apiFetch(`/reviewers/${id}`, { schema: reviewerProfileSchema, envelope: 'wrapped', signal }).then((r) => r.data),
    enabled: id !== null && id > 0,
    retry: retryOnce,
  });
}

export type SearchType = 'author' | 'reviewer' | 'paper' | 'all';

export function useGraphSearch(query: string, type: SearchType) {
  const q = query.trim();
  return useQuery({
    queryKey: keys.graphSearch(type, q),
    queryFn: ({ signal }) =>
      apiFetch(`/graph/search?q=${encodeURIComponent(q)}&type=${type}&limit=20`, {
        schema: searchResultSchema.array(),
        envelope: 'wrapped',
        signal,
      }).then((r) => r.data),
    enabled: true,
    staleTime: 60000,
    retry: 0,
  });
}

export function useNeighborhood(type: string | null, id: number | null, depth: 1 | 2) {
  return useQuery({
    queryKey: keys.neighborhood(type ?? '', id ?? 0, depth),
    queryFn: ({ signal }) =>
      apiFetch(`/graph/neighborhood?type=${type}&id=${id}&depth=${depth}`, {
        schema: graphSchema,
        envelope: 'wrapped',
        signal,
      }).then((r) => ({ data: r.data as GraphPayload, meta: r.meta })),
    enabled: type !== null && id !== null && id > 0,
    retry: 0,
  });
}

export function useGraphOverview(confId: number) {
  return useQuery({
    queryKey: keys.overview(confId),
    queryFn: ({ signal }) =>
      apiFetch(`/graph/overview?confId=${confId}`, { schema: graphSchema, envelope: 'wrapped', signal }).then(
        (r) => r.data as GraphPayload
      ),
    retry: retryOnce,
  });
}

export function useCollabPath(from: number | null, to: number | null) {
  return useQuery({
    queryKey: keys.collabPath(from ?? 0, to ?? 0),
    queryFn: ({ signal }) =>
      apiFetch(`/analytics/collab-path?fromAuthorId=${from}&toAuthorId=${to}`, {
        schema: collabPathSchema,
        envelope: 'flat',
        signal,
      }).then((r) => r.data),
    enabled: from !== null && to !== null,
    retry: 0,
  });
}

export function useWithinHops(id: number | null, hops: number) {
  return useQuery({
    queryKey: keys.withinHops(id ?? 0, hops),
    queryFn: ({ signal }) =>
      apiFetch(`/analytics/within-hops?authorId=${id}&hops=${hops}`, {
        schema: withinHopsSchema,
        envelope: 'flat',
        signal,
      }).then((r) => r.data),
    enabled: id !== null,
    retry: 0,
  });
}

export function useCentralAuthors(limit: number) {
  return useQuery({
    queryKey: keys.central(limit),
    queryFn: ({ signal }) =>
      apiFetch(`/analytics/central-authors?limit=${limit}`, {
        schema: centralAuthorsSchema,
        envelope: 'flat',
        signal,
      }).then((r) => r.data),
    retry: retryOnce,
  });
}

export function useInstitutions(limit: number) {
  return useQuery({
    queryKey: keys.institutions(limit),
    queryFn: ({ signal }) =>
      apiFetch(`/analytics/institutions?limit=${limit}`, {
        schema: institutionsSchema,
        envelope: 'flat',
        signal,
      }).then((r) => r.data),
    retry: retryOnce,
  });
}

export function useDatasetStatus() {
  return useQuery({
    queryKey: keys.datasetStatus,
    queryFn: ({ signal }) =>
      apiFetch('/compare/dataset-status', { schema: datasetStatusSchema, envelope: 'flat', signal }).then((r) => r.data),
    staleTime: 60000,
    retry: retryOnce,
  });
}

export function useCompareStats(dataset: string) {
  return useQuery({
    queryKey: keys.compareStats(dataset),
    queryFn: ({ signal }) =>
      apiFetch(`/compare/stats?dataset=${dataset}`, { schema: compareStatsSchema, envelope: 'flat', signal }).then(
        (r) => r.data
      ),
    retry: retryOnce,
  });
}

export function useCompare(scenario: string | null, params: Record<string, string | number>, enabled = true) {
  const query = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  );
  return useQuery({
    queryKey: keys.compare(scenario ?? '', query.toString()),
    queryFn: ({ signal }) =>
      apiFetch(`/compare/${scenario}?${query.toString()}`, {
        schema: compareResultSchema,
        envelope: 'flat',
        signal,
      }).then((r) => r.data),
    enabled: enabled && scenario !== null,
    retry: 0,
  });
}
