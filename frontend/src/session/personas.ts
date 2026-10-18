export type PersonaId = 'evaluator' | 'chair' | 'reviewer' | 'author' | 'admin';
export type IdentityKind = 'author' | 'reviewer';

export interface Identity {
  kind: IdentityKind;
  id: number;
  name: string;
}

export interface Session {
  persona: PersonaId;
  identity?: Identity;
  adminToken?: string;
}

export type Capability =
  | 'browseAll'
  | 'createPaper'
  | 'editStatus'
  | 'deletePaper'
  | 'assignReviewer'
  | 'oracleDryRun'
  | 'oracleCommit'
  | 'submitReview'
  | 'resetNeo4j'
  | 'exportCsv'
  | 'viewAnalytics'
  | 'viewPaths'
  | 'viewBenchmark'
  | 'viewSchema'
  | 'viewWalkthrough'
  | 'viewAdmin';

const MATRIX: Record<PersonaId, Capability[]> = {
  evaluator: [
    'browseAll', 'createPaper', 'assignReviewer', 'oracleDryRun', 'submitReview', 'exportCsv',
    'viewAnalytics', 'viewPaths', 'viewBenchmark', 'viewSchema', 'viewWalkthrough',
  ],
  chair: ['browseAll', 'createPaper', 'assignReviewer', 'oracleDryRun', 'exportCsv', 'viewAnalytics', 'viewPaths'],
  reviewer: ['submitReview', 'exportCsv'],
  author: ['createPaper', 'exportCsv', 'viewAnalytics', 'viewPaths'],
  admin: [
    'browseAll', 'createPaper', 'editStatus', 'deletePaper', 'assignReviewer', 'oracleDryRun',
    'oracleCommit', 'submitReview', 'resetNeo4j', 'exportCsv', 'viewAnalytics', 'viewPaths',
    'viewBenchmark', 'viewSchema', 'viewWalkthrough', 'viewAdmin',
  ],
};

export function can(session: Session | null, capability: Capability): boolean {
  if (!session) return false;
  return MATRIX[session.persona].includes(capability);
}

export interface PersonaInfo {
  id: PersonaId;
  label: string;
  landing: string;
  blurb: string;
  nav: { to: string; label: string }[];
}

const ALL: { to: string; label: string }[] = [
  { to: '/app/walkthrough', label: 'Walkthrough' },
  { to: '/app/overview', label: 'Overview' },
  { to: '/app/graph', label: 'Graph Explorer' },
  { to: '/app/papers', label: 'Papers' },
  { to: '/app/assignments', label: 'Reviewer Assignment' },
  { to: '/app/reviews', label: 'Reviews' },
  { to: '/app/paths', label: 'Collaboration Paths' },
  { to: '/app/analytics', label: 'Network Analytics' },
  { to: '/app/benchmark', label: 'SQL vs Cypher' },
  { to: '/app/schema', label: 'Schema & Evidence' },
];

const pick = (...paths: string[]): { to: string; label: string }[] =>
  paths.map((path) => {
    const found = ALL.find((item) => item.to === path);
    return found ?? { to: path, label: path };
  });

export const PERSONAS: Record<PersonaId, PersonaInfo> = {
  evaluator: {
    id: 'evaluator',
    label: 'Evaluator',
    landing: '/app/walkthrough',
    blurb: 'A guided walkthrough of the best evidence, in order.',
    nav: ALL,
  },
  chair: {
    id: 'chair',
    label: 'Program chair',
    landing: '/app/overview',
    blurb: 'Run the conference: papers, reviewer assignment, analytics.',
    nav: pick('/app/overview', '/app/papers', '/app/assignments', '/app/reviews', '/app/graph', '/app/paths', '/app/analytics'),
  },
  reviewer: {
    id: 'reviewer',
    label: 'Reviewer',
    landing: '/app/my-reviews',
    blurb: 'Your assigned papers and a review form.',
    nav: [
      { to: '/app/my-reviews', label: 'My Reviews' },
      { to: '/app/graph', label: 'Graph Explorer' },
    ],
  },
  author: {
    id: 'author',
    label: 'Author',
    landing: '/app/my-papers',
    blurb: 'Your papers, statuses and collaboration network.',
    nav: [
      { to: '/app/my-papers', label: 'My Papers' },
      { to: '/app/paths', label: 'Collaboration Paths' },
      { to: '/app/graph', label: 'Graph Explorer' },
      { to: '/app/analytics', label: 'Network Analytics' },
    ],
  },
  admin: {
    id: 'admin',
    label: 'Admin',
    landing: '/app/overview',
    blurb: 'Everything, plus destructive operations.',
    nav: [...ALL, { to: '/app/admin', label: 'Administration' }],
  },
};

export const PERSONA_ORDER: PersonaId[] = ['evaluator', 'chair', 'reviewer', 'author', 'admin'];
