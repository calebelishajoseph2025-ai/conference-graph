import { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { useCreateReview } from '@/api/hooks/mutations';
import { toApiError } from '@/api/errors';
import type { ReviewResult } from '@/api/schemas/papers';
import { RECOMMENDATIONS } from '@/lib/status';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label, Textarea, FieldError } from '@/components/ui/Input';
import { ScoreSlider } from '@/components/ui/ScoreSlider';
import { SmartCombobox } from './SmartCombobox';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';

export function ReviewForm({
  paperId,
  paperStatus,
  defaultReviewer,
  lockReviewer = false,
  onSubmitted,
}: {
  paperId: number;
  paperStatus: string;
  defaultReviewer?: { id: number; name: string } | null;
  lockReviewer?: boolean;
  onSubmitted?: (result: ReviewResult) => void;
}) {
  const [reviewer, setReviewer] = useState<{ id: number; name: string } | null>(defaultReviewer ?? null);
  const [score, setScore] = useState(6);
  const [comments, setComments] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastResult, setLastResult] = useState<ReviewResult | null>(null);
  const create = useCreateReview();
  const { toast } = useToast();

  const autoAccepts = score >= 9 && paperStatus !== 'Rejected' && paperStatus !== 'Accepted';

  const submit = async (): Promise<void> => {
    const found: Record<string, string> = {};
    if (!reviewer) found.reviewer = 'Choose the reviewer.';
    if (!comments.trim()) found.comments = 'Write the review comments.';
    else if (comments.trim().length > 1000) found.comments = 'Comments must be 1,000 characters or fewer.';
    if (!recommendation) found.recommendation = 'Choose a recommendation.';
    setErrors(found);
    if (Object.keys(found).length > 0 || !reviewer) return;
    try {
      const result = await create.mutateAsync({
        paperId,
        reviewerId: reviewer.id,
        score,
        comments: comments.trim(),
        recommendation,
      });
      toast(result.autoAccepted ? 'Review submitted and paper accepted' : 'Review submitted', {
        tone: 'success',
        description: result.autoAccepted ? `Paper #${paperId} moved to Accepted automatically.` : `Review #${result.reviewId} was recorded in both databases.`,
      });
      setComments('');
      setRecommendation('');
      setLastResult(result);
      onSubmitted?.(result);
    } catch (error) {
      toast('Could not submit the review', { tone: 'error', description: toApiError(error).message });
    }
  };

  return (
    <Card>
      <CardHeader title="Write a review" description="Scores are 0–10. A score of 9 or more sets a non-rejected paper to Accepted." />
      <CardBody className="space-y-5">
        {lastResult ? (
          <div className="rounded-md border border-ok/40 bg-ok/5 p-3" role="status">
            <p className="text-small font-medium text-ink">
              Review #{lastResult.reviewId} saved · score {lastResult.score}/10 · {lastResult.recommendation}
            </p>
            <p className="mt-1 text-[12px] text-muted">
              Paper status: {lastResult.paperStatus}
              {lastResult.autoAccepted ? ' — auto-accepted because the score was 9 or higher.' : '.'}
            </p>
          </div>
        ) : null}
        <div>
          <Label htmlFor="review-reviewer">Reviewer</Label>
          {lockReviewer && reviewer ? (
            <p className="text-small text-ink">{reviewer.name} <span className="text-caption text-faint">(signed in)</span></p>
          ) : (
            <SmartCombobox
              kind="reviewer"
              inputId="review-reviewer"
              value={reviewer ? { id: reviewer.id, label: reviewer.name } : null}
              onSelect={(option) => setReviewer({ id: option.id, name: option.label })}
              onClear={() => setReviewer(null)}
              placeholder="Search reviewers"
            />
          )}
          <FieldError>{errors.reviewer}</FieldError>
        </div>

        <ScoreSlider value={score} onChange={setScore} disabled={create.isPending} />

        {autoAccepts ? (
          <div className="flex items-start gap-2 rounded-md border border-warn/40 bg-warn/5 p-3">
            <CheckCircle2 size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-warn" />
            <p className="text-small text-muted">A score of {score} will move this paper to Accepted when you submit.</p>
          </div>
        ) : null}

        <div>
          <Label htmlFor="review-comments" hint={`${comments.length}/1000`}>Comments</Label>
          <Textarea
            id="review-comments"
            value={comments}
            maxLength={1000}
            invalid={Boolean(errors.comments)}
            onChange={(event) => setComments(event.target.value)}
            placeholder="What is strong, what is weak, and what should change?"
          />
          <FieldError>{errors.comments}</FieldError>
        </div>

        <div>
          <Label htmlFor="review-recommendation">Recommendation</Label>
          <div id="review-recommendation" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {RECOMMENDATIONS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={recommendation === option}
                onClick={() => setRecommendation(option)}
                className={cn(
                  'rounded-sm border px-2 py-2 text-[12px] transition-colors duration-fast',
                  recommendation === option ? 'border-ink bg-ink text-bg' : 'border-line text-muted hover:border-line-strong hover:text-ink'
                )}
              >
                {option}
              </button>
            ))}
          </div>
          <FieldError>{errors.recommendation}</FieldError>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-caption text-faint">Both the Oracle procedure and the graph write are attempted.</p>
          <Button onClick={() => void submit()} loading={create.isPending}>
            <Send size={14} strokeWidth={1.5} />
            Submit review
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
