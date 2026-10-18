import { describe, expect, it } from 'vitest';
import { can, Capability, PersonaId, PERSONAS, Session } from './personas';

const ALL_CAPABILITIES: Capability[] = [
  'browseAll',
  'createPaper',
  'editStatus',
  'deletePaper',
  'assignReviewer',
  'oracleDryRun',
  'oracleCommit',
  'submitReview',
  'resetNeo4j',
  'exportCsv',
  'viewAnalytics',
  'viewPaths',
  'viewBenchmark',
  'viewSchema',
  'viewWalkthrough',
  'viewAdmin',
];

const ALL_PERSONAS: PersonaId[] = ['evaluator', 'chair', 'reviewer', 'author', 'admin'];

describe('personas.test.ts: Persona Matrix and Capability Enforcement', () => {
  it('returns false for null or undefined session across all capabilities', () => {
    for (const cap of ALL_CAPABILITIES) {
      expect(can(null, cap)).toBe(false);
    }
  });

  it('verifies Evaluator persona capabilities', () => {
    const session: Session = { persona: 'evaluator' };
    expect(can(session, 'browseAll')).toBe(true);
    expect(can(session, 'createPaper')).toBe(true);
    expect(can(session, 'assignReviewer')).toBe(true);
    expect(can(session, 'oracleDryRun')).toBe(true);
    expect(can(session, 'submitReview')).toBe(true);
    expect(can(session, 'exportCsv')).toBe(true);
    expect(can(session, 'viewAnalytics')).toBe(true);
    expect(can(session, 'viewPaths')).toBe(true);
    expect(can(session, 'viewBenchmark')).toBe(true);
    expect(can(session, 'viewSchema')).toBe(true);
    expect(can(session, 'viewWalkthrough')).toBe(true);

    // Evaluator cannot perform destructive or schema-altering actions
    expect(can(session, 'editStatus')).toBe(false);
    expect(can(session, 'deletePaper')).toBe(false);
    expect(can(session, 'oracleCommit')).toBe(false);
    expect(can(session, 'resetNeo4j')).toBe(false);
    expect(can(session, 'viewAdmin')).toBe(false);
  });

  it('verifies Program Chair persona capabilities', () => {
    const session: Session = { persona: 'chair' };
    expect(can(session, 'browseAll')).toBe(true);
    expect(can(session, 'createPaper')).toBe(true);
    expect(can(session, 'assignReviewer')).toBe(true);
    expect(can(session, 'oracleDryRun')).toBe(true);
    expect(can(session, 'exportCsv')).toBe(true);
    expect(can(session, 'viewAnalytics')).toBe(true);
    expect(can(session, 'viewPaths')).toBe(true);

    expect(can(session, 'editStatus')).toBe(false);
    expect(can(session, 'deletePaper')).toBe(false);
    expect(can(session, 'oracleCommit')).toBe(false);
    expect(can(session, 'resetNeo4j')).toBe(false);
    expect(can(session, 'viewAdmin')).toBe(false);
  });

  it('verifies Reviewer persona capabilities are restricted to their scope', () => {
    const session: Session = { persona: 'reviewer', identity: { kind: 'reviewer', id: 2, name: 'Alice' } };
    expect(can(session, 'submitReview')).toBe(true);
    expect(can(session, 'exportCsv')).toBe(true);

    expect(can(session, 'browseAll')).toBe(false);
    expect(can(session, 'createPaper')).toBe(false);
    expect(can(session, 'editStatus')).toBe(false);
    expect(can(session, 'deletePaper')).toBe(false);
    expect(can(session, 'assignReviewer')).toBe(false);
    expect(can(session, 'oracleDryRun')).toBe(false);
    expect(can(session, 'oracleCommit')).toBe(false);
    expect(can(session, 'resetNeo4j')).toBe(false);
    expect(can(session, 'viewAdmin')).toBe(false);
  });

  it('verifies Author persona capabilities', () => {
    const session: Session = { persona: 'author', identity: { kind: 'author', id: 1, name: 'Emma' } };
    expect(can(session, 'createPaper')).toBe(true);
    expect(can(session, 'exportCsv')).toBe(true);
    expect(can(session, 'viewAnalytics')).toBe(true);
    expect(can(session, 'viewPaths')).toBe(true);

    expect(can(session, 'browseAll')).toBe(false);
    expect(can(session, 'editStatus')).toBe(false);
    expect(can(session, 'deletePaper')).toBe(false);
    expect(can(session, 'assignReviewer')).toBe(false);
    expect(can(session, 'submitReview')).toBe(false);
    expect(can(session, 'viewAdmin')).toBe(false);
  });

  it('verifies Admin persona has full system capabilities', () => {
    const session: Session = { persona: 'admin', adminToken: 'secret' };
    for (const cap of ALL_CAPABILITIES) {
      expect(can(session, cap)).toBe(true);
    }
  });

  it('defines valid landing paths and nav entries for all personas', () => {
    for (const id of ALL_PERSONAS) {
      const p = PERSONAS[id];
      expect(p).toBeDefined();
      expect(p.id).toBe(id);
      expect(p.landing.startsWith('/app/')).toBe(true);
      expect(p.nav.length).toBeGreaterThan(0);
      for (const item of p.nav) {
        expect(item.to.startsWith('/app/')).toBe(true);
        expect(item.label.length).toBeGreaterThan(0);
      }
    }
  });
});
