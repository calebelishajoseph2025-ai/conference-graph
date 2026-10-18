import { z } from 'zod';
import { compareStatsSchema } from './common';

export const compareEngineSchema = z.object({
  engine: z.string(),
  query: z.string(),
  params: z.record(z.unknown()),
  rowCount: z.number(),
  timings: z.array(z.number()),
  medianMs: z.number(),
  sampleRows: z.array(z.record(z.unknown())),
});

export const compareExplanationSchema = z.object({
  title: z.string(),
  graphNotes: z.string().optional(),
  relationalNotes: z.string().optional(),
  whyGraph: z.string().optional(),
  graph: z.string().optional(),
  relational: z.string().optional(),
  why: z.string().optional(),
});

export const compareResultSchema = z.object({
  scenario: z.string(),
  dataset: z.string(),
  datasetStats: compareStatsSchema,
  resultsMatch: z.boolean(),
  matchDetail: z.string(),
  explanation: compareExplanationSchema,
  parameters: z.record(z.unknown()),
  oracle: compareEngineSchema,
  neo4j: compareEngineSchema,
  extra: z
    .object({
      violations: z
        .object({ oracle: z.number(), neo4j: z.number(), match: z.boolean(), clean: z.boolean() })
        .optional(),
    })
    .partial()
    .optional(),
});

export type CompareResult = z.infer<typeof compareResultSchema>;
export type CompareEngine = z.infer<typeof compareEngineSchema>;
