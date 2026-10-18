import { UserPlus } from 'lucide-react';
import type { RecommendationItem } from '@/api/schemas/papers';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

function ScoreBar({ label, value, max, negative = false }: { label: string; value: number; max: number; negative?: boolean }) {
  const width = Math.min(100, (Math.abs(value) / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="w-[76px] shrink-0 text-[11px] text-faint">{label}</span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn('h-full rounded-full', negative ? 'bg-warn/70' : 'bg-ink/70')}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right font-mono text-[11px] text-muted tabular">
        {value >= 0 ? '+' : '−'}{Math.abs(value).toFixed(1)}
      </span>
    </div>
  );
}

export function RecommendationCard({
  rank,
  recommendation,
  onAssign,
  assigning,
  disabled = false,
}: {
  rank: number;
  recommendation: RecommendationItem;
  onAssign: (reviewerId: number) => void;
  assigning: boolean;
  disabled?: boolean;
}) {
  const item = recommendation;
  const keywordMax = Math.max(3, item.keywordScore);
  const expertiseMax = 5;
  return (
    <article className={cn('rounded-lg border bg-surface p-4', rank === 1 ? 'border-line-strong' : 'border-line')}>
      <div className="flex items-start gap-3">
        <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-[11px]', rank === 1 ? 'border-ink text-ink' : 'border-line text-faint')}>
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 className="truncate text-[14px] font-medium text-ink">{item.name}</h3>
            <span className="font-mono text-[11px] text-faint">#{item.reviewerId}</span>
          </div>
          <p className="mt-0.5 truncate text-caption text-muted">
            {item.expertise ?? 'General'} · {item.affiliation ?? 'No affiliation'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[20px] font-medium leading-none text-ink tabular">{item.totalScore.toFixed(1)}</p>
          <p className="mt-0.5 text-[10px] text-faint">score</p>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <ScoreBar label="Keywords" value={item.keywordScore} max={keywordMax} />
        <ScoreBar label="Expertise" value={item.expertiseScore} max={expertiseMax} />
        <ScoreBar label="Workload" value={-item.workloadPenalty} max={Math.max(1, item.workload)} negative />
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="flex min-w-0 flex-wrap gap-1">
          {item.sharedKeywords.slice(0, 3).map((keyword) => (
            <Badge key={keyword}>{keyword}</Badge>
          ))}
          {item.sharedKeywordCount === 0 ? <span className="text-[11px] text-faint">no shared keywords</span> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[11px] text-faint">{item.workload} active</span>
          <Button size="sm" variant={rank === 1 ? 'primary' : 'secondary'} loading={assigning} disabled={disabled} onClick={() => onAssign(item.reviewerId)}>
            <UserPlus size={13} strokeWidth={1.5} />
            Assign
          </Button>
        </div>
      </div>
    </article>
  );
}
