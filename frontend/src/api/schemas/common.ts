import { z } from 'zod';

export const statusEnum = z.enum(['Submitted', 'Under Review', 'Accepted', 'Rejected']);
export const recommendationEnum = z.enum(['Accept', 'Reject', 'Minor Revision', 'Major Revision']);

export const graphNodeSchema = z.object({
  id: z.string(),
  elementId: z.string().optional(),
  label: z.string(),
  type: z.string(),
  props: z.record(z.unknown()).default({}),
});

export const graphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.string(),
  props: z.record(z.unknown()).default({}),
});

export const graphSchema = z.object({
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
});

export type GraphNode = z.infer<typeof graphNodeSchema>;
export type GraphEdge = z.infer<typeof graphEdgeSchema>;
export type GraphPayload = z.infer<typeof graphSchema>;

export const healthSchema = z.object({
  status: z.enum(['healthy', 'degraded']),
  neo4j: z.object({
    status: z.string(),
    uri: z.string(),
    database: z.string(),
    nodes: z.number().nullable(),
    relationships: z.number().nullable(),
    same_person_as: z.number().nullable(),
    elapsed_ms: z.number(),
    error: z.string().nullable(),
  }),
  oracle: z.object({
    status: z.string(),
    dsn: z.string(),
    user: z.string(),
    tables: z.record(z.number()),
    total_rows: z.number().nullable(),
    elapsed_ms: z.number(),
    error: z.string().nullable(),
  }),
  meta: z.record(z.unknown()),
});
export type Health = z.infer<typeof healthSchema>;

export const parityRowSchema = z.object({
  category: z.string(),
  entity: z.string(),
  neo4j: z.number().nullable(),
  oracle: z.number().nullable(),
  difference: z.number().nullable(),
  match: z.boolean(),
});
export const paritySchema = z.object({
  overall_match: z.boolean(),
  summary: z.object({
    total_checks: z.number(),
    matched_checks: z.number(),
    unmatched_checks: z.number(),
  }),
  rows: z.array(parityRowSchema),
  note: z.string(),
});
export type Parity = z.infer<typeof paritySchema>;
export type ParityRow = z.infer<typeof parityRowSchema>;

export const adminResetSchema = z.object({
  status: z.string(),
  database: z.string(),
  nodes: z.number(),
  relationships: z.number(),
  same_person_as: z.number(),
  elapsed_ms: z.number(),
});

export const datasetStatusSchema = z.object({
  demo: z.object({ available: z.boolean() }),
  scale: z.object({
    available: z.boolean(),
    reason: z.string().nullable().optional(),
    neo4j_scale_db: z.string().optional(),
    oracle_scale_user: z.string().optional(),
  }),
});
export type DatasetStatus = z.infer<typeof datasetStatusSchema>;

export const compareStatsSchema = z.object({
  dataset: z.string(),
  oracle: z.object({ authors: z.number(), papers: z.number(), coauthorPairs: z.number() }),
  neo4j: z.object({ authors: z.number(), papers: z.number(), coauthorPairs: z.number() }),
  confirmedMatch: z.boolean(),
});
export type CompareStats = z.infer<typeof compareStatsSchema>;

export const queryMetaSchema = z.record(z.unknown());
