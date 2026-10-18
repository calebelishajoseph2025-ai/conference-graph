import { z } from 'zod';

export const authorProfileSchema = z.object({
  authorId: z.number(),
  name: z.string(),
  affiliation: z.string().nullable(),
  email: z.string().nullable(),
  country: z.string().nullable(),
  linkedReviewerId: z.number().nullable(),
  linkedReviewerName: z.string().nullable(),
  papers: z.array(
    z.object({
      paperId: z.number(),
      title: z.string(),
      status: z.string(),
      submissionDate: z.string().nullable(),
      authorOrder: z.number(),
      isCorresponding: z.boolean(),
      trackName: z.string().nullable(),
      avgScore: z.number().nullable(),
      reviewCount: z.number(),
    })
  ),
  totalPapers: z.number(),
  coAuthors: z.array(
    z.object({
      authorId: z.number(),
      name: z.string(),
      affiliation: z.string().nullable(),
      sharedPapers: z.number(),
    })
  ),
});

export const reviewerProfileSchema = z.object({
  reviewerId: z.number(),
  name: z.string(),
  affiliation: z.string().nullable(),
  email: z.string().nullable(),
  expertise: z.string().nullable(),
  country: z.string().nullable(),
  linkedAuthorId: z.number().nullable(),
  linkedAuthorName: z.string().nullable(),
  avgScoreGiven: z.number().nullable(),
  totalReviews: z.number(),
  activeWorkload: z.number(),
  totalAssignments: z.number(),
  workload: z.number(),
  assignedPapers: z.array(
    z.object({
      paperId: z.number(),
      title: z.string(),
      status: z.string(),
      trackName: z.string().nullable(),
      assignedDate: z.string().nullable(),
      hasReviewed: z.boolean(),
      score: z.number().nullable(),
      recommendation: z.string().nullable(),
    })
  ),
});

export type AuthorProfile = z.infer<typeof authorProfileSchema>;
export type ReviewerProfile = z.infer<typeof reviewerProfileSchema>;
