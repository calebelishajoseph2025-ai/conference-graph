import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  compareStatsSchema,
  datasetStatusSchema,
  graphSchema,
  healthSchema,
  paritySchema,
} from './schemas/common';
import {
  coiPairsSchema,
  paperDetailSchema,
  paperListSchema,
  recommendResultSchema,
} from './schemas/papers';
import { authorProfileSchema, reviewerProfileSchema } from './schemas/profiles';
import {
  centralAuthorsSchema,
  collabPathSchema,
  institutionsSchema,
  searchResultSchema,
  withinHopsSchema,
} from './schemas/analytics';
import { compareResultSchema } from './schemas/compare';

import healthFixture from './__fixtures__/health.json';
import parityFixture from './__fixtures__/parity.json';
import paper1Fixture from './__fixtures__/paper-1.json';
import paper110Fixture from './__fixtures__/paper-110.json';
import papersFixture from './__fixtures__/papers.json';
import author1Fixture from './__fixtures__/author-1.json';
import reviewer2Fixture from './__fixtures__/reviewer-2.json';
import centralAuthorsFixture from './__fixtures__/central-authors.json';
import collabPathFixture from './__fixtures__/collab-path.json';
import withinHopsFixture from './__fixtures__/within-hops.json';
import institutionsFixture from './__fixtures__/institutions.json';
import compareCoauthorsFixture from './__fixtures__/compare-coauthors.json';
import compareShortestPathFixture from './__fixtures__/compare-shortest-path.json';
import compareStatsFixture from './__fixtures__/compare-stats.json';
import datasetStatusFixture from './__fixtures__/dataset-status.json';
import recommendFixture from './__fixtures__/recommend.json';
import coiPairsFixture from './__fixtures__/coi-pairs.json';
import neighborhoodFixture from './__fixtures__/neighborhood.json';
import graphSearchAllFixture from './__fixtures__/graph-search-all.json';

function unwrap<T>(fixture: unknown): T {
  if (fixture && typeof fixture === 'object' && 'data' in fixture) {
    return (fixture as { data: T }).data;
  }
  return fixture as T;
}

describe('schemas.test.ts: Zod Schema Validation against Real Fixtures', () => {
  it('validates healthSchema against health.json', () => {
    const parsed = healthSchema.safeParse(healthFixture);
    expect(parsed.success).toBe(true);
  });

  it('validates paritySchema against parity.json', () => {
    const parsed = paritySchema.safeParse(unwrap(parityFixture));
    expect(parsed.success).toBe(true);
  });

  it('validates paperDetailSchema against paper-1.json and paper-110.json', () => {
    const parsed1 = paperDetailSchema.safeParse(unwrap(paper1Fixture));
    expect(parsed1.success).toBe(true);

    const parsed110 = paperDetailSchema.safeParse(unwrap(paper110Fixture));
    expect(parsed110.success).toBe(true);
  });

  it('validates paperListSchema against papers.json', () => {
    const parsed = paperListSchema.safeParse(unwrap(papersFixture));
    expect(parsed.success).toBe(true);
  });

  it('validates authorProfileSchema against author-1.json', () => {
    const parsed = authorProfileSchema.safeParse(unwrap(author1Fixture));
    expect(parsed.success).toBe(true);
  });

  it('validates reviewerProfileSchema against reviewer-2.json', () => {
    const parsed = reviewerProfileSchema.safeParse(unwrap(reviewer2Fixture));
    expect(parsed.success).toBe(true);
  });

  it('validates centralAuthorsSchema against central-authors.json', () => {
    const parsed = centralAuthorsSchema.safeParse(unwrap(centralAuthorsFixture));
    expect(parsed.success).toBe(true);
  });

  it('validates collabPathSchema against collab-path.json', () => {
    const parsed = collabPathSchema.safeParse(unwrap(collabPathFixture));
    expect(parsed.success).toBe(true);
  });

  it('validates withinHopsSchema against within-hops.json', () => {
    const parsed = withinHopsSchema.safeParse(unwrap(withinHopsFixture));
    expect(parsed.success).toBe(true);
  });

  it('validates institutionsSchema against institutions.json', () => {
    const parsed = institutionsSchema.safeParse(unwrap(institutionsFixture));
    expect(parsed.success).toBe(true);
  });

  it('validates compareResultSchema against compare-coauthors.json and compare-shortest-path.json', () => {
    const parsedCo = compareResultSchema.safeParse(compareCoauthorsFixture);
    expect(parsedCo.success).toBe(true);

    const parsedShortest = compareResultSchema.safeParse(compareShortestPathFixture);
    expect(parsedShortest.success).toBe(true);
  });

  it('validates compareStatsSchema against compare-stats.json', () => {
    const parsed = compareStatsSchema.safeParse(unwrap(compareStatsFixture));
    expect(parsed.success).toBe(true);
  });

  it('validates datasetStatusSchema against dataset-status.json', () => {
    const parsed = datasetStatusSchema.safeParse(unwrap(datasetStatusFixture));
    expect(parsed.success).toBe(true);
  });

  it('validates recommendResultSchema against recommend.json', () => {
    const parsed = recommendResultSchema.safeParse(unwrap(recommendFixture));
    expect(parsed.success).toBe(true);
  });

  it('validates coiPairsSchema against coi-pairs.json', () => {
    const parsed = coiPairsSchema.safeParse(unwrap(coiPairsFixture));
    expect(parsed.success).toBe(true);
  });

  it('validates graphSchema against neighborhood.json', () => {
    const parsed = graphSchema.safeParse(unwrap(neighborhoodFixture));
    expect(parsed.success).toBe(true);
  });

  it('validates searchResultSchema against graph-search-all.json', () => {
    const parsed = z.array(searchResultSchema).safeParse(unwrap(graphSearchAllFixture));
    expect(parsed.success).toBe(true);
  });
});
