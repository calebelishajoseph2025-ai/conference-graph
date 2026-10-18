import { useState } from 'react';
import { ArrowLeftRight, ArrowRight, Download, ExternalLink, Route, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthor, useCollabPath } from '@/api/hooks/queries';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { SmartCombobox } from '@/components/domain/SmartCombobox';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { GraphCanvas } from '@/components/graph/GraphCanvas';
import { NodeInspector } from '@/components/graph/NodeInspector';
import { QueryPanel } from '@/components/graph/QueryPanel';
import content from '@/content/projectContent.json';
import { plural, truncate } from '@/lib/format';
import { exportToCsv } from '@/lib/csv';
import type { GraphNode } from '@/api/schemas/common';

export function ShortestPathPanel({
  from,
  to,
  onFrom,
  onTo,
  onPreset,
}: {
  from: number | null;
  to: number | null;
  onFrom: (id: number | null) => void;
  onTo: (id: number | null) => void;
  onPreset: (from: number, to: number) => void;
}) {
  const fromAuthor = useAuthor(from);
  const toAuthor = useAuthor(to);
  const path = useCollabPath(from, to);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const preset = content.pathPresets.find((item) => item.from === from && item.to === to);
  const matchingPreset = preset && path.data?.found ? preset.expectedHops === (path.data.hops ?? -1) : null;
  const selected = selectedNode ?? (path.data?.path.nodes.find((node) => node.type === 'Paper') as GraphNode | undefined) ?? null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Find the shortest collaboration path" description="Two authors are connected when they share a paper. Each hop is one co-authorship." />
        <CardBody>
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto] lg:items-center">
            <div>
              <p className="mb-1.5 text-caption text-faint">From author</p>
              <SmartCombobox
                kind="author"
                value={fromAuthor.data ? { id: fromAuthor.data.authorId, label: fromAuthor.data.name } : null}
                onSelect={(option) => onFrom(option.id)}
                onClear={() => onFrom(null)}
                placeholder="Search the starting author"
              />
            </div>
            <button
              type="button"
              aria-label="Swap start and target author"
              onClick={() => { onFrom(to); onTo(from); }}
              disabled={from === null && to === null}
              className="mt-5 flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition-colors duration-fast hover:border-line-strong hover:text-ink disabled:opacity-40"
            >
              <ArrowLeftRight size={14} strokeWidth={1.5} />
            </button>
            <div>
              <p className="mb-1.5 text-caption text-faint">To author</p>
              <SmartCombobox
                kind="author"
                value={toAuthor.data ? { id: toAuthor.data.authorId, label: toAuthor.data.name } : null}
                onSelect={(option) => onTo(option.id)}
                onClear={() => onTo(null)}
                placeholder="Search the target author"
              />
            </div>
            <Route size={17} strokeWidth={1.5} className="mt-5 hidden text-faint lg:block" />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-caption text-faint">Presets</span>
            {content.pathPresets.map((preset) => (
              <Button
                key={`${preset.from}-${preset.to}`}
                size="sm"
                variant={from === preset.from && to === preset.to ? 'primary' : 'secondary'}
                onClick={() => onPreset(preset.from, preset.to)}
              >
                {preset.from} → {preset.to}
                <span className="text-[11px] text-faint">{plural(preset.expectedHops, 'hop')}</span>
              </Button>
            ))}
          </div>
        </CardBody>
      </Card>

      {from === null || to === null ? (
        <Card>
          <EmptyState
            icon={<Search size={22} strokeWidth={1.5} />}
            title="Choose two authors"
            hint="Pick a preset, or search for the start and target author."
          />
        </Card>
      ) : path.isError ? (
        <ErrorState error={path.error} onRetry={() => void path.refetch()} />
      ) : path.isLoading ? (
        <Skeleton className="h-80 w-full" />
      ) : path.data && path.data.found ? (
        <div className="space-y-4">
          <Card>
            <CardBody>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-caption text-faint">Shortest co-author path</p>
                  <p className="mt-1 text-[40px] font-medium leading-none text-ink tabular">{path.data.hops} <span className="text-[16px] text-muted">{path.data.hops === 1 ? 'hop' : 'hops'}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-small text-ink">{path.data.fromAuthor?.name} → {path.data.toAuthor?.name}</p>
                  <p className="text-caption text-muted">{plural(path.data.papers.length, 'shared paper')} along the chain · {path.data.elapsed_ms.toFixed(2)} ms</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone="accent">{path.data.path.edges.length} relationships</Badge>
                {preset && matchingPreset !== null ? (
                  <Badge tone={matchingPreset ? 'ok' : 'warn'}>
                    {matchingPreset ? `Verified: seed expects ${preset.expectedHops}` : `Differs: seed expects ${preset.expectedHops}, actual ${path.data.hops}`}
                  </Badge>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => exportToCsv(`path-${path.data.fromAuthor?.authorId ?? from}-${path.data.toAuthor?.authorId ?? to}`, ['index', 'type', 'nodeId', 'label'], path.data?.path.nodes.map((node, index) => [index + 1, node.type, node.id, node.label]) ?? [])}
                >
                  <Download size={13} strokeWidth={1.5} /> Export path CSV
                </Button>
              </div>
              <p className="mt-3 max-w-[78ch] text-small text-muted">{path.data.explanation}</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="The chain" description="Authors and papers alternate. Select a node to inspect it." actions={<Badge>{path.data.path.nodes.length} nodes</Badge>} />
            <CardBody>
              <ol className="flex flex-wrap items-center gap-1.5" aria-label="Collaboration path order">
                {path.data.path.nodes.map((node, index) => (
                  <li key={node.id} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedNode(node as GraphNode)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors duration-fast ${selected?.id === node.id ? 'border-accent bg-accent/10 text-ink' : 'border-line text-muted hover:border-line-strong hover:text-ink'}`}
                      title={node.label}
                    >
                      <span className="font-mono text-[9px] text-faint">{node.type}</span>{' '}
                      {truncate(node.label, 28)}
                    </button>
                    {index < path.data!.path.nodes.length - 1 ? <ArrowRight size={11} strokeWidth={1.5} className="text-faint" /> : null}
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
            <Card className="overflow-hidden">
              <CardHeader title="Path graph" description="Ordered chain layout, not a force simulation." />
              <div className="p-2">
                <GraphCanvas graph={path.data.path as never} mode="chain" selectedId={selected?.id ?? null} onSelect={(id) => setSelectedNode((path.data?.path.nodes.find((node) => node.id === id) as GraphNode | undefined) ?? null)} height={330} ariaLabel={`Shortest collaboration path with ${path.data.hops} hops`} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Node inspector" description={selected ? selected.type : 'Select a node.'} />
              <CardBody>
                <NodeInspector node={selected} />
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Intermediate papers" description="Every paper on the chain, with its live status." />
            <CardBody className="p-0">
              <ol className="divide-y divide-line">
                {path.data.papers.map((paper, index) => (
                  <li key={paper.paperId} className="flex items-start gap-3 px-5 py-2.5">
                    <span className="mt-0.5 font-mono text-[11px] text-faint">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-small text-ink" title={paper.title}>{truncate(paper.title, 90)}</p>
                      <p className="text-caption text-faint">Paper #{paper.paperId}</p>
                    </div>
                    <StatusBadge status={paper.status} />
                    <Link to={`/app/papers/${paper.paperId}`} className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted underline underline-offset-4 hover:text-ink">
                      View details <ExternalLink size={11} strokeWidth={1.5} />
                    </Link>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>

          <QueryPanel query={path.data.cypher} elapsedMs={path.data.elapsed_ms} title="Cypher used for the shortest path" />
        </div>
      ) : path.data ? (
        <Card>
          <EmptyState
            title="No path found"
            hint={path.data.explanation}
            action={<Button variant="secondary" size="sm" onClick={() => void path.refetch()}>Try again</Button>}
          />
        </Card>
      ) : null}
    </div>
  );
}
