import { describe, expect, it } from 'vitest';
import {
  formatDatabaseName,
  formatDate,
  formatDeployment,
  formatEngine,
  formatSchemaUser,
  initials,
  ms,
  num,
  pct,
  plural,
  score,
  titleCase,
  truncate,
} from './format';
import { cumulativeByHop } from './reach';

describe('format.test.ts: Display and text formatting helpers', () => {
  it('formats dates consistently or falls back to em dash', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('2024-03-15')).toBe('15 Mar 2024');
  });

  it('formats numbers with thousand separators or em dash', () => {
    expect(num(null)).toBe('—');
    expect(num(undefined)).toBe('—');
    expect(num(1500)).toBe('1,500');
    expect(num(0)).toBe('0');
  });

  it('formats scores with 1 decimal point precision', () => {
    expect(score(null)).toBe('—');
    expect(score(8)).toBe('8.0');
    expect(score(7.666)).toBe('7.7');
  });

  it('formats milliseconds with 2 decimal places', () => {
    expect(ms(null)).toBe('—');
    expect(ms(14.285)).toBe('14.29 ms');
  });

  it('formats percentages with 1 decimal place', () => {
    expect(pct(null)).toBe('—');
    expect(pct(85.43)).toBe('85.4%');
  });

  it('handles pluralization correctly', () => {
    expect(plural(1, 'paper')).toBe('1 paper');
    expect(plural(3, 'paper')).toBe('3 papers');
    expect(plural(0, 'paper')).toBe('0 papers');
    expect(plural(2, 'person', 'people')).toBe('2 people');
  });

  it('truncates strings cleanly with ellipsis', () => {
    expect(truncate('Short', 10)).toBe('Short');
    expect(truncate('A very long title that exceeds the limit', 12)).toBe('A very long…');
  });

  it('formats title case and initials', () => {
    expect(titleCase('under review')).toBe('Under review');
    expect(initials('Emma Krishnan')).toBe('EK');
    expect(initials('Yuki')).toBe('Y');
    expect(initials('Single')).toBe('S');
  });

  it('abstracts infrastructure and connection details safely', () => {
    expect(formatDeployment(null)).toBe('Graph Database');
    expect(formatDeployment('neo4j+s://978b0364.databases.neo4j.io')).toBe('Neo4j AuraDB (Cloud)');
    expect(formatDeployment('bolt://127.0.0.1:7687')).toBe('Neo4j Desktop (Local)');

    expect(formatDatabaseName(null)).toBe('Production Graph');
    expect(formatDatabaseName('978b0364')).toBe('Production Graph');
    expect(formatDatabaseName('neo4j')).toBe('Production Graph');

    expect(formatEngine(null)).toBe('Relational Database');
    expect(formatEngine('embedded://data/*.csv')).toBe('Oracle In-Memory Engine');
    expect(formatEngine('localhost:1521/FREEPDB1')).toBe('Oracle AI Database 26ai (Local)');

    expect(formatSchemaUser(null)).toBe('Conference Schema');
    expect(formatSchemaUser('academic')).toBe('Conference Schema');
  });
});

describe('reach.test.ts: cumulativeByHop calculation', () => {
  it('computes cumulative reach sums up to maxHops', () => {
    const byHop = { 1: 5, 2: 10, 3: 39 };
    const cumulative = cumulativeByHop(byHop, 3);
    expect(cumulative).toEqual([5, 15, 54]);
  });

  it('handles string keys and missing intermediate hops safely', () => {
    const byHop = { '1': 4, '3': 12 };
    const cumulative = cumulativeByHop(byHop, 3);
    expect(cumulative).toEqual([4, 4, 16]);
  });

  it('handles empty or undefined byHop maps', () => {
    expect(cumulativeByHop(null, 3)).toEqual([0, 0, 0]);
    expect(cumulativeByHop(undefined, 3)).toEqual([0, 0, 0]);
    expect(cumulativeByHop({}, 3)).toEqual([0, 0, 0]);
  });
});
