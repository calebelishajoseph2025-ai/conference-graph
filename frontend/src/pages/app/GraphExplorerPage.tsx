import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Compass, Layers, Maximize2, Minimize2, RotateCcw, Search, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useGraphSearch, useNeighborhood, type SearchType } from '@/api/hooks/queries';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ComboBox } from '@/components/ui/Combobox';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/ErrorState';
import { GraphCanvas, type GraphCanvasHandle } from '@/components/graph/GraphCanvas';
import { GraphFilters } from '@/components/graph/GraphFilters';
import { NodeInspector } from '@/components/graph/NodeInspector';
import { QueryPanel } from '@/components/graph/QueryPanel';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { intParam } from '@/api/params';
import { cn } from '@/lib/cn';
import type { GraphNode } from '@/api/schemas/common';
const TYPES = ['paper', 'author', 'reviewer', 'conference', 'track', 'keyword', 'session', 'presentation'] as const;
type NodeType = (typeof TYPES)[number];
type LayoutMode = 'fcose' | 'concentric';
const SEARCH_TYPES: { value: SearchType; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'author', label: 'Authors' },
  { value: 'reviewer', label: 'Reviewers' },
  { value: 'paper', label: 'Papers' },
];
const ID_KEYS: Record<string, string> = {
  Paper: 'paperId', Author: 'authorId', Reviewer: 'reviewerId', Conference: 'confId',
  Track: 'trackId', Keyword: 'keywordId', Session: 'sessionId', Presentation: 'presentationId',
};

const EXAMPLES: { type: NodeType; id: number; label: string }[] = [
  { type: 'paper', id: 1, label: 'Paper #1' }, { type: 'author', id: 1, label: 'Author #1' },
  { type: 'reviewer', id: 2, label: 'Reviewer #2' }, { type: 'conference', id: 1, label: 'Conference #1' },
];

function typeParam(value: string | null): NodeType | null {
  return value && (TYPES as readonly string[]).includes(value) ? (value as NodeType) : null;
}

export function GraphExplorerPage() {
  const [params, setParams] = useSearchParams();
  const type = typeParam(params.get('type'));
  const id = intParam((params.get('id')));
  const depth = (Number(params.get('depth')) === 2 ? 2 : 1) as 1 | 2;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('all');
  const [layout, setLayout] = useState<LayoutMode>('fcose');
  const [fullscreen, setFullscreen] = useState(false);
  const canvasRef = useRef<GraphCanvasHandle>(null);
  const debounced = useDebouncedValue(query, 250);
  const search = useGraphSearch(debounced, searchType);
  const neighborhood = useNeighborhood(type, id, depth);
  const [hiddenTypes, setHiddenTypes] = useState<string[]>([]);

  useEffect(() => {
    setSelectedId(type && id ? `${type.charAt(0).toUpperCase()}${type.slice(1)}:${id}` : null);
    setHiddenTypes([]);
  }, [type, id, depth]);

  const graph = neighborhood.data?.data;
  const meta = neighborhood.data?.meta;
  const selectedNode: GraphNode | null = graph?.nodes.find((node) => node.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    if (!graph) return null;
    if (hiddenTypes.length === 0) return graph;
    const nodes = graph.nodes.filter((node) => !hiddenTypes.includes(node.type));
    const ids = new Set(nodes.map((node) => node.id));
    return { nodes, edges: graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)) };
  }, [graph, hiddenTypes]);

  const availableTypes = useMemo(() => Array.from(new Set((graph?.nodes ?? []).map((node) => node.type))).sort(), [graph]);

  const navigate = (nextType: NodeType | null, nextId: number | null, nextDepth: 1 | 2 = depth): void => {
    const next = new URLSearchParams(params);
    if (nextType && nextId) {
      next.set('type', nextType);
      next.set('id', String(nextId));
    } else {
      next.delete('type');
      next.delete('id');
    }
    next.set('depth', String(nextDepth));
    setParams(next);
  };

  const selectResult = (resultType: string, rawId: number): void => {
    if (!(TYPES as readonly string[]).includes(resultType)) return;
    navigate(resultType as NodeType, rawId);
    setQuery('');
  };

  const expand = (node: GraphNode, nextDepth: 1 | 2): void => {
    const bare = node.type.charAt(0).toUpperCase() + node.type.slice(1).toLowerCase();
    const key = ID_KEYS[bare];
    const raw = key ? Number(node.props[key]) : NaN;
    const lower = node.type.toLowerCase();
    if (Number.isInteger(raw) && (TYPES as readonly string[]).includes(lower)) navigate(lower as NodeType, raw, nextDepth);
  };

  const selectNode = (nodeId: string | null): void => {
    setSelectedId(nodeId);
    if (!nodeId) return;
    const node = graph?.nodes.find((item) => item.id === nodeId);
    if (!node) return;
    const bare = node.type.charAt(0).toUpperCase() + node.type.slice(1).toLowerCase();
    const raw = Number(node.props[ID_KEYS[bare]]);
    const lower = node.type.toLowerCase();
    if (Number.isInteger(raw) && (TYPES as readonly string[]).includes(lower)) navigate(lower as NodeType, raw);
  };

  const searchOptions = (search.data ?? []).map((result) => ({
    id: result.rawId,
    label: result.title,
    hint: `${result.type} · ${result.subtitle ?? ''}`,
  }));

  return (
    <div>
      <PageHeader
        title="Graph explorer"
        description="Search a node, then expand its neighbourhood. Every node and edge comes from Neo4j."
        actions={
          <SegmentedControl
            label="Expansion depth"
            value={String(depth)}
            onChange={(value) => navigate(type, id, value === '2' ? 2 : 1)}
            options={[{ value: '1', label: '1 hop' }, { value: '2', label: '2 hops' }]}
          />
        }
      />

      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-1">
          <div className="flex gap-2">
            <select
              aria-label="Filter search results by node type"
              value={searchType}
              onChange={(event) => setSearchType(event.target.value as SearchType)}
              className="h-9 shrink-0 rounded-sm border border-line bg-surface-2 px-2 text-[12px] text-ink"
            >
              {SEARCH_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <div className="min-w-0 flex-1">
              <ComboBox
                value={null}
                options={searchOptions}
                loading={search.isFetching}
                query={query}
                onQueryChange={setQuery}
                onSelect={(option) => {
                  const found = search.data?.find((result) => result.rawId === option.id && result.title === option.label);
                  if (found) selectResult(found.type, found.rawId);
                }}
                placeholder="Search authors, reviewers or papers"
                errorText={search.isError ? 'Search failed.' : undefined}
                emptyText={debounced ? 'No matches.' : 'Type a name or title.'}
              />
            </div>
          </div>
          <p className="text-[11px] text-faint">A UNION search over authors, reviewers and papers.</p>
        </div>
        {type && id ? (
          <div className="flex items-center gap-2 lg:justify-end">
            <div className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface-2 px-3 py-1">
              <span className="text-[11px] font-medium tracking-wider text-accent-text">{type}</span>
              <span className="font-mono text-[12px] text-ink">#{id}</span>
              <button
                type="button"
                aria-label={`Clear ${type} filter`}
                onClick={() => navigate(null, null)}
                className="ml-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full text-muted hover:bg-surface-3 hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                <X size={12} strokeWidth={2} />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {search.data && debounced && search.data.length > 0 && !type ? (
        <Card className="mb-4">
          <CardBody className="grid gap-1 p-2 sm:grid-cols-2">
            {search.data.slice(0, 8).map((result) => (
              <button
                key={`${result.type}-${result.rawId}`}
                type="button"
                onClick={() => selectResult(result.type, result.rawId)}
                className="flex items-start gap-2 rounded-sm px-3 py-2 text-left hover:bg-surface-2"
              >
                <Search size={13} strokeWidth={1.5} className="mt-1 shrink-0 text-faint" />
                <span className="min-w-0">
                  <span className="block truncate text-small text-ink">{result.title}</span>
                  <span className="block truncate text-caption text-faint">{result.type} · {result.subtitle ?? `#${result.rawId}`}</span>
                </span>
              </button>
            ))}
          </CardBody>
        </Card>
      ) : null}

      {!type || !id ? (
        <Card>
          <EmptyState
            icon={<Compass size={22} strokeWidth={1.5} />}
            title="Start from a node"
            hint="Use the search above, or open one of these nodes."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((example) => (
                  <Button key={example.label} variant="secondary" size="sm" onClick={() => navigate(example.type, example.id)}>
                    {example.label}
                  </Button>
                ))}
              </div>
            }
          />
        </Card>
      ) : neighborhood.isError ? (
        <ErrorState error={neighborhood.error} onRetry={() => void neighborhood.refetch()} />
      ) : neighborhood.isLoading || !filtered ? (
        <Skeleton className="h-[560px] w-full" />
      ) : (
        <div className={cn('space-y-4', fullscreen && 'fixed inset-0 z-50 overflow-auto bg-bg p-4')}>
          <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Layers size={14} strokeWidth={1.5} className="text-faint" />
                  <span className="text-caption text-muted">{filtered.nodes.length} nodes · {filtered.edges.length} edges</span>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-1">
                  <SegmentedControl
                    label="Graph layout"
                    value={layout}
                    onChange={(value) => setLayout(value as LayoutMode)}
                    options={[{ value: 'fcose', label: 'Force' }, { value: 'concentric', label: 'Rings' }]}
                  />
                  <Button variant="ghost" size="sm" onClick={() => canvasRef.current?.zoomIn()} aria-label="Zoom in"><ZoomIn size={14} strokeWidth={1.5} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => canvasRef.current?.zoomOut()} aria-label="Zoom out"><ZoomOut size={14} strokeWidth={1.5} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => canvasRef.current?.fit()} aria-label="Fit graph to view">
                    <RotateCcw size={14} strokeWidth={1.5} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setFullscreen((value) => !value)} aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}>
                    {fullscreen ? <Minimize2 size={14} strokeWidth={1.5} /> : <Maximize2 size={14} strokeWidth={1.5} />}
                  </Button>
                </div>
              </div>
              <div className="p-2">
                <GraphCanvas
                  ref={canvasRef}
                  graph={filtered}
                  mode={layout}
                  selectedId={selectedId}
                  onSelect={selectNode}
                  height={fullscreen ? Math.max(420, window.innerHeight - 200) : 540}
                  ariaLabel={`Neighbourhood of ${type} ${id}, ${depth} hop${depth > 1 ? 's' : ''}`}
                />
              </div>
              <p className="border-t border-line px-4 py-2 text-[11px] text-faint">
                Up to 150 nodes per request. Click a node to make it the centre and update the URL; expand from the inspector.
              </p>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader
                  title="Inspector"
                  description={selectedNode ? 'Properties returned for this node.' : 'Select a node in the graph.'}
                />
                <CardBody>
                  <NodeInspector
                    node={selectedNode} editable={selectedNode !== null}
                    onExpand={(nextDepth) => { if (selectedNode) expand(selectedNode, nextDepth); }}
                  />
                </CardBody>
              </Card>

              <GraphFilters types={availableTypes} hidden={hiddenTypes} onHiddenChange={setHiddenTypes} />
            </div>
          </div>

          {typeof meta?.query === 'string' ? (
            <QueryPanel
              query={meta.query}
              params={(meta.params as Record<string, unknown>) ?? null}
              elapsedMs={typeof meta.elapsed_ms === 'number' ? meta.elapsed_ms : null}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
