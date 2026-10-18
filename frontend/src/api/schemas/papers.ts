import { z } from 'zod';
import { recommendationEnum } from './common';

export const authorBriefSchema = z.object({
  authorId: z.number(),
  name: z.string(),
  email: z.string().nullable().optional(),
  affiliation: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  authorOrder: z.number(),
  isCorresponding: z.boolean(),
});

export const keywordSchema = z.object({ keywordId: z.number(), keyword: z.string() });

export const paperListItemSchema = z.object({
  paperId: z.number(),
  title: z.string(),
  abstract: z.string().nullable(),
  status: z.string(),
  submissionDate: z.string().nullable(),
  confId: z.number().nullable(),
  confName: z.string().nullable(),
  trackId: z.number().nullable(),
  trackName: z.string().nullable(),
  authors: z.array(authorBriefSchema),
  keywords: z.array(keywordSchema),
  reviewCount: z.number(),
  avgScore: z.number().nullable(),
  pendingReviewCount: z.number(),
});

export const paperListSchema = z.object({
  items: z.array(paperListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

export const assignmentSchema = z.object({
  reviewerId: z.number(),
  name: z.string(),
  email: z.string().nullable(),
  affiliation: z.string().nullable(),
  expertise: z.string().nullable(),
  assignedDate: z.string().nullable(),
  hasReviewed: z.boolean(),
});

export const reviewSchema = z.object({
  reviewId: z.number(),
  reviewerId: z.number(),
  reviewerName: z.string().nullable(),
  score: z.number(),
  comments: z.string(),
  recommendation: z.string(),
  reviewDate: z.string().nullable(),
});

export const paperDetailSchema = z.object({
  paperId: z.number(),
  title: z.string(),
  abstract: z.string().nullable(),
  status: z.string(),
  submissionDate: z.string().nullable(),
  conference: z.object({
    confId: z.number(),
    name: z.string(),
    year: z.number().nullable(),
    venue: z.string().nullable(),
  }),
  track: z.object({ trackId: z.number(), name: z.string() }),
  authors: z.array(authorBriefSchema),
  keywords: z.array(keywordSchema),
  assignments: z.array(assignmentSchema),
  reviews: z.array(reviewSchema),
  avgScore: z.number().nullable(),
  pendingReviewCount: z.number(),
});

export const createPaperResultSchema = paperDetailSchema;

export const assignmentResultSchema = z.object({
  reviewerId: z.number(),
  reviewerName: z.string(),
  paperId: z.number(),
  paperTitle: z.string(),
  paperStatus: z.string(),
  assignedDate: z.string().nullable(),
});

export const reviewResultSchema = z.object({
  reviewId: z.number(),
  reviewerId: z.number(),
  reviewerName: z.string(),
  paperId: z.number(),
  paperTitle: z.string(),
  paperStatus: z.string(),
  score: z.number(),
  recommendation: recommendationEnum,
  comments: z.string(),
  reviewDate: z.string().nullable(),
  autoAccepted: z.boolean(),
});

export const deletionResultSchema = z.object({
  success: z.boolean(),
  deletedPaperId: z.number(),
  message: z.string(),
});

export const scoringModelSchema = z.object({
  formula: z.string(),
  weights: z.record(z.number()),
  exclusions: z.string(),
});

export const recommendationSchema = z.object({
  reviewerId: z.number(),
  name: z.string(),
  email: z.string().nullable(),
  affiliation: z.string().nullable(),
  expertise: z.string().nullable(),
  sharedKeywords: z.array(z.string()),
  sharedKeywordCount: z.number(),
  keywordScore: z.number(),
  expertiseScore: z.number(),
  workload: z.number(),
  workloadPenalty: z.number(),
  totalScore: z.number(),
});

export const recommendResultSchema = z.object({
  paperId: z.number(),
  recommendations: z.array(recommendationSchema),
  scoring_model: scoringModelSchema,
});

export const coiPairSchema = z.object({
  paperId: z.number(),
  reviewerId: z.number(),
  paperTitle: z.string().nullable(),
  paperStatus: z.string().nullable(),
  reviewerName: z.string().nullable(),
  reviewerEmail: z.string().nullable(),
  reviewerExpertise: z.string().nullable(),
  conflictingAuthorId: z.number().nullable(),
  conflictingAuthorName: z.string().nullable(),
  reason: z.string().nullable(),
});

export const coiPairsSchema = z.object({ items: z.array(coiPairSchema), count: z.number() });

export const oracleAssignSchema = z.object({
  dry_run: z.boolean().optional(),
  conflict: z.boolean().optional(),
  would_succeed: z.boolean().optional(),
  message: z.string().optional(),
  paperId: z.number().optional(),
  reviewerId: z.number().optional(),
  procedure_error: z.string().nullable().optional(),
  trigger_error: z.string().nullable().optional(),
  explanation: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  success: z.boolean().optional(),
  committed: z.boolean().optional(),
});

export type PaperListItem = z.infer<typeof paperListItemSchema>;
export type PaperList = z.infer<typeof paperListSchema>;
export type PaperDetail = z.infer<typeof paperDetailSchema>;
export type AuthorBrief = z.infer<typeof authorBriefSchema>;
export type Keyword = z.infer<typeof keywordSchema>;
export type Assignment = z.infer<typeof assignmentSchema>;
export type Review = z.infer<typeof reviewSchema>;
export type RecommendResult = z.infer<typeof recommendResultSchema>;
export type RecommendationItem = z.infer<typeof recommendationSchema>;
export type CoiPair = z.infer<typeof coiPairSchema>;
export type OracleAssignResult = z.infer<typeof oracleAssignSchema>;
export type ReviewResult = z.infer<typeof reviewResultSchema>;
export type AssignmentResult = z.infer<typeof assignmentResultSchema>;
