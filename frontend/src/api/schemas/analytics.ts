import { z } from 'zod';
import { graphEdgeSchema, graphNodeSchema } from './common';

export const searchResultSchema = z.object({
  id: z.string(),
  rawId: z.number(),
  type: z.string(),
  label: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
});

export const collabPathSchema = z.object({
  found: z.boolean(),
  hops: z.number().nullable(),
  fromAuthor: z.object({ authorId: z.number(), name: z.string(), affiliation: z.string().nullable(), country: z.string().nullable() }).nullable(),
  toAuthor: z.object({ authorId: z.number(), name: z.string(), affiliation: z.string().nullable(), country: z.string().nullable() }).nullable(),
  papers: z.array(z.object({ paperId: z.number(), title: z.string(), status: z.string() })),
  path: z.object({ nodes: z.array(graphNodeSchema), edges: z.array(graphEdgeSchema) }),
  explanation: z.string(),
  cypher: z.string(),
  elapsed_ms: z.number(),
  meta: z.record(z.unknown()),
});

export const withinHopsSchema = z.object({
  author: z.object({ authorId: z.number(), name: z.string(), affiliation: z.string().nullable(), country: z.string().nullable() }),
  hops: z.number(),
  totalReachable: z.number(),
  byHop: z.record(z.number()),
  authors: z.array(
    z.object({
      authorId: z.number(),
      name: z.string(),
      affiliation: z.string().nullable(),
      country: z.string().nullable(),
      hops: z.number(),
      intermediatePapers: z.array(z.object({ paperId: z.number(), title: z.string() })),
    })
  ),
  cypher: z.string(),
  elapsed_ms: z.number(),
  meta: z.record(z.unknown()),
});

export const centralAuthorsSchema = z.object({
  limit: z.number(),
  total: z.number(),
  authors: z.array(
    z.object({
      authorId: z.number(),
      name: z.string(),
      affiliation: z.string().nullable(),
      country: z.string().nullable(),
      distinctCoauthors: z.number(),
      paperCount: z.number(),
    })
  ),
  cypher: z.string(),
  elapsed_ms: z.number(),
  meta: z.record(z.unknown()),
});

export const institutionsSchema = z.object({
  institutionPairs: z.array(
    z.object({
      institution1: z.string(),
      institution2: z.string(),
      jointPapers: z.number(),
      authors1: z.number(),
      authors2: z.number(),
    })
  ),
  researchAreas: z.array(z.object({ areaName: z.string(), paperCount: z.number(), percentage: z.number() })),
  tracks: z.array(
    z.object({
      trackId: z.number(),
      trackName: z.string(),
      conferenceName: z.string().nullable(),
      conferenceAcronym: z.string().nullable(),
      paperCount: z.number(),
    })
  ),
  topInstitutions: z.array(z.object({ institution: z.string(), authorCount: z.number(), paperCount: z.number() })),
  totalPapers: z.number(),
  cyphers: z.array(z.object({ name: z.string(), cypher: z.string() })),
  elapsed_ms: z.number(),
  meta: z.record(z.unknown()),
});

export type SearchResult = z.infer<typeof searchResultSchema>;
export type CollabPath = z.infer<typeof collabPathSchema>;
export type WithinHops = z.infer<typeof withinHopsSchema>;
export type CentralAuthors = z.infer<typeof centralAuthorsSchema>;
export type Institutions = z.infer<typeof institutionsSchema>;
