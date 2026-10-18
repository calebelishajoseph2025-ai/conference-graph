export const PAPER_STATUSES = ['Submitted', 'Under Review', 'Accepted', 'Rejected'] as const;
export type PaperStatus = (typeof PAPER_STATUSES)[number];

export const RECOMMENDATIONS = ['Accept', 'Reject', 'Minor Revision', 'Major Revision'] as const;
export type Recommendation = (typeof RECOMMENDATIONS)[number];

export const NEXT_STATUS: Record<PaperStatus, PaperStatus[]> = {
  Submitted: ['Under Review', 'Rejected'],
  'Under Review': ['Accepted', 'Rejected'],
  Accepted: [],
  Rejected: [],
};

export function statusTone(status: string): 'ok' | 'warn' | 'bad' | 'neutral' {
  if (status === 'Accepted') return 'ok';
  if (status === 'Under Review') return 'warn';
  if (status === 'Rejected') return 'bad';
  return 'neutral';
}

export function scoreZone(value: number): string {
  if (value <= 4) return 'Weak';
  if (value <= 7) return 'Mixed';
  if (value === 8) return 'Strong';
  return 'Auto-accept';
}
