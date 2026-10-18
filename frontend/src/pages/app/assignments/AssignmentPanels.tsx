import { FlaskConical } from 'lucide-react';
import type { OracleAssignResult } from '@/api/schemas/papers';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { SmartCombobox } from '@/components/domain/SmartCombobox';

export function RiskyDemo({
  riskyPair,
  loading,
  assigning,
  onDirectAssign,
  onLoad,
}: {
  riskyPair: { reviewerId: number; reviewerName: string | null; conflictingAuthorName: string | null; paperId: number } | null;
  loading: boolean;
  assigning: boolean;
  onDirectAssign: (reviewerId: number) => void;
  onLoad: (reviewer: { id: number; name: string }) => void;
}) {
  return (
    <div className="rounded-lg border border-warn/50 bg-warn/5 p-4">
      <div className="flex items-start gap-2">
        <FlaskConical size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-warn" />
        <div className="min-w-0">
          <p className="text-small font-medium text-ink">Risky demo pair</p>
          {riskyPair ? (
            <p className="mt-1 text-[12px] leading-relaxed text-muted">
              <strong className="font-medium text-ink">{riskyPair.reviewerName}</strong> is also author{' '}
              <strong className="font-medium text-ink">{riskyPair.conflictingAuthorName}</strong> of this paper.
              A direct assignment should be rejected with a 409; Oracle should refuse it in the trigger.
            </p>
          ) : loading ? (
            <p className="mt-1 text-[12px] text-muted">Looking for a conflicting reviewer…</p>
          ) : (
            <p className="mt-1 text-[12px] text-muted">No conflicting reviewer is available for this paper. Choose paper #1 for the scripted demo.</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" disabled={!riskyPair || assigning} onClick={() => riskyPair && onDirectAssign(riskyPair.reviewerId)}>
              Try direct assignment (expect 409)
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!riskyPair}
              onClick={() => riskyPair && onLoad({ id: riskyPair.reviewerId, name: riskyPair.reviewerName ?? `Reviewer #${riskyPair.reviewerId}` })}
            >
              Load into Oracle panel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OraclePanel({
  panel,
  onChange,
  dryRun,
  dryError,
  confirmed,
  onConfirmedChange,
  canCommit,
  pending,
  onDryRun,
  onCommit,
}: {
  panel: { id: number; name: string } | null;
  onChange: (reviewer: { id: number; name: string } | null) => void;
  dryRun: OracleAssignResult | null;
  dryError: string;
  confirmed: boolean;
  onConfirmedChange: (value: boolean) => void;
  canCommit: boolean;
  pending: boolean;
  onDryRun: () => void;
  onCommit: () => void;
}) {
  return (
    <Card>
      <CardHeader
        title="Oracle procedure"
        description="sp_assign_reviewer runs inside Oracle; the trigger checks conflicts."
        actions={<FlaskConical size={15} strokeWidth={1.5} className="text-faint" />}
      />
      <CardBody className="space-y-3">
        <SmartCombobox
          kind="reviewer"
          value={panel ? { id: panel.id, label: panel.name } : null}
          onSelect={(option) => { onChange({ id: option.id, name: option.label }); }}
          onClear={() => onChange(null)}
          placeholder="Choose a reviewer"
        />
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onDryRun} loading={pending} disabled={!panel}>
            Dry run
          </Button>
          {canCommit ? <Button size="sm" onClick={onCommit} loading={pending} disabled={!panel || !confirmed || !(dryRun?.would_succeed ?? false)}>Commit</Button> : null}
        </div>
        {canCommit ? (
          <Checkbox
            checked={confirmed}
            onChange={onConfirmedChange}
            label="I understand this writes to Oracle and Neo4j."
          />
        ) : null}
        {dryError ? <p className="rounded-sm border border-bad/40 bg-bad/5 p-2 text-[12px] text-bad">{dryError}</p> : null}
        {dryRun ? (
          <div className="rounded-md border border-line bg-surface-2 p-3">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[11px] ${dryRun.committed ? 'bg-ok/10 text-ok' : dryRun.conflict ? 'bg-bad/10 text-bad' : 'bg-warn/10 text-warn'}`}>
                {dryRun.committed ? 'committed' : dryRun.would_succeed ? 'would succeed' : dryRun.conflict ? 'conflict' : 'checked'}
              </span>
              {dryRun.dry_run ? <span className="text-[11px] text-faint">dry run</span> : null}
            </div>
            <p className="mt-2 text-[12px] text-muted">{dryRun.message ?? dryRun.explanation ?? 'The procedure returned without a message.'}</p>
            {dryRun.procedure_error ? <p className="mt-1 break-words font-mono text-[11px] text-warn">{dryRun.procedure_error}</p> : null}
            {dryRun.trigger_error ? <p className="mt-1 break-words font-mono text-[11px] text-bad">{dryRun.trigger_error}</p> : null}
          </div>
        ) : null}
        <p className="text-[11px] leading-relaxed text-faint">Dry runs do not write. The commit path requires the admin token.</p>
      </CardBody>
    </Card>
  );
}
