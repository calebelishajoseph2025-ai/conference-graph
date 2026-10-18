import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { GraphLegend } from '@/components/graph/GraphLegend';

export function GraphFilters({
  types,
  hidden,
  onHiddenChange,
}: {
  types: string[];
  hidden: string[];
  onHiddenChange: (next: string[]) => void;
}) {
  return (
    <Card>
      <CardHeader
        title="Filters"
        description="Show or hide node types."
        actions={<Button variant="ghost" size="sm" onClick={() => onHiddenChange([])}>Reset</Button>}
      />
      <CardBody>
        <div className="flex flex-wrap gap-1.5">
          {types.map((nodeType) => {
            const isHidden = hidden.includes(nodeType);
            return (
              <button
                key={nodeType}
                type="button"
                aria-pressed={!isHidden}
                onClick={() => onHiddenChange(isHidden ? hidden.filter((item) => item !== nodeType) : [...hidden, nodeType])}
                className={cn(
                  'rounded-full border px-2 py-0.5 text-[11px] transition-colors duration-fast',
                  isHidden ? 'border-line text-faint line-through' : 'border-line-strong text-ink'
                )}
              >
                {nodeType}
              </button>
            );
          })}
        </div>
        <div className="mt-5 border-t border-line pt-4">
          <GraphLegend />
        </div>
      </CardBody>
    </Card>
  );
}
