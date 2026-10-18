import { CheckCircle2, Circle, Clock3, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { statusTone } from '@/lib/status';
import { Badge, type Tone } from '@/components/ui/Badge';

const iconFor: Record<string, JSX.Element> = {
  Accepted: <CheckCircle2 size={12} strokeWidth={1.5} />,
  Rejected: <XCircle size={12} strokeWidth={1.5} />,
  'Under Review': <Clock3 size={12} strokeWidth={1.5} />,
  Submitted: <Circle size={10} strokeWidth={1.5} />,
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone: Tone = statusTone(status);
  return (
    <Badge tone={tone} icon={iconFor[status] ?? <Circle size={10} strokeWidth={1.5} />} className={cn('gap-1', className)}>
      {status}
    </Badge>
  );
}
