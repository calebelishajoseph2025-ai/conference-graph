import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, Table2, Workflow } from 'lucide-react';
import content from '@/content/projectContent.json';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { GraphCanvas } from '@/components/graph/GraphCanvas';
import { GraphLegend } from '@/components/graph/GraphLegend';
import { exportToCsv } from '@/lib/csv';
import { useSession } from '@/session/SessionProvider';
import { can } from '@/session/personas';
import type { GraphPayload } from '@/api/schemas/common';
import { EvidenceBlock } from './schema/EvidenceBlock';

const schemaNodes = content.schemaNodes;
const schemaEdges = content.schemaEdges;
const tableMappings = content.tableMappings;

const graph: GraphPayload = {
  nodes: schemaNodes.map((node) => ({
    id: `type:${node.id}`,
    label: node.label,
    type: node.label,
    props: {
      properties: node.properties.join(', '),
      constraint: node.constraint,
      notes: node.notes,
      shape: node.shape,
    },
  })),
  edges: schemaEdges.map((edge) => ({
    id: `${edge.source}-${edge.label}-${edge.target}`,
    source: `type:${edge.source}`,
    target: `type:${edge.target}`,
    type: edge.label,
    props: { notes: edge.notes, properties: edge.properties.join(', ') || 'none' },
  })),
};

export function SchemaPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'mapping' ? 'mapping' : 'model';
  const setTab = (value: string): void => {
    const next = new URLSearchParams(params);
    if (value === 'mapping') next.set('tab', 'mapping');
    else next.delete('tab');
    setParams(next, { replace: true });
  };
  const [selectedNode, setSelectedNode] = useState<string | null>(`type:${schemaNodes[0]?.id}`);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const { session } = useSession();

  const node = schemaNodes.find((item) => `type:${item.id}` === selectedNode) ?? null;
  const edge = schemaEdges.find((item) => `${item.source}-${item.label}-${item.target}` === selectedEdge) ?? null;
  const filteredTables = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return tableMappings;
    return tableMappings.filter((row) =>
      [row.table, row.relationalColumns, row.graphPattern, row.category, row.advantage].join(' ').toLowerCase().includes(needle)
    );
  }, [search]);

  return (
    <div>
      <PageHeader
        title="Schema and evidence"
        description={`${schemaNodes.length} node types, ${schemaEdges.length} relationship types, ${tableMappings.length} relational tables.`}
        actions={
          can(session, 'viewWalkthrough') ? (
            <Link to="/app/walkthrough" className="text-caption text-muted underline underline-offset-4 hover:text-ink">Open the walkthrough</Link>
          ) : null
        }
      />

      <Tabs
        label="Schema view"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'model', label: 'Graph model' },
          { value: 'mapping', label: 'Table mapping' },
        ]}
      />

      {tab === 'model' ? (
        <div className="space-y-4 pt-4">
          <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <Card className="overflow-hidden">
              <CardHeader
                title="The graph model"
                description="Eight node types. Author–WROTE–Paper and Author–SUBMITTED–Paper are separate relationships."
                actions={<Workflow size={15} strokeWidth={1.5} className="text-faint" />}
              />
              <div className="p-2">
                <GraphCanvas graph={graph} mode="schema" height={520} selectedId={selectedNode} onSelect={setSelectedNode} ariaLabel="Schema graph with eight node types and twelve relationship types" />
              </div>
              <div className="border-t border-line px-4 py-3">
                <GraphLegend />
              </div>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader title="Selected node type" description={node ? node.label : 'Select a node in the graph.'} />
                <CardBody>
                  {node ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-1">
                        {node.properties.map((property) => <Badge key={property}>{property}</Badge>)}
                      </div>
                      <div>
                        <p className="text-caption text-faint">Constraint</p>
                        <p className="mt-1 font-mono text-[11px] text-ink">{node.constraint}</p>
                      </div>
                      <div>
                        <p className="text-caption text-faint">Notes</p>
                        <p className="mt-1 text-small leading-relaxed text-muted">{node.notes}</p>
                      </div>
                      <p className="text-[11px] text-faint">Shape: {node.shape}</p>
                    </div>
                  ) : <p className="text-small text-faint">Select a node to inspect it.</p>}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Relationship types" description="Select one to read its notes." />
                <CardBody className="space-y-1.5">
                  {schemaEdges.map((item) => {
                    const id = `${item.source}-${item.label}-${item.target}`;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => { setSelectedEdge(id); setSelectedNode(null); }}
                        aria-pressed={selectedEdge === id}
                        className="w-full rounded-sm border border-line px-2 py-1.5 text-left text-[11px] text-muted hover:border-line-strong hover:text-ink"
                      >
                        <span className="font-mono">{item.source} → {item.label} → {item.target}</span>
                      </button>
                    );
                  })}
                </CardBody>
              </Card>

              {edge ? (
                <Card>
                  <CardHeader title={`${edge.source} → ${edge.label} → ${edge.target}`} description="Relationship" />
                  <CardBody>
                    <p className="text-caption text-faint">Properties: {edge.properties.length ? edge.properties.join(', ') : 'none'}</p>
                    <p className="mt-2 text-small leading-relaxed text-muted">{edge.notes}</p>
                  </CardBody>
                </Card>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <Card className="mt-4">
          <CardHeader
            title="Thirteen tables, eight node types"
            description="How each relational structure maps into the graph."
            actions={
              <div className="flex items-center gap-2">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search tables, columns, patterns"
                  aria-label="Search table mappings"
                  className="h-8 w-56 rounded-sm border border-line bg-surface-2 px-2 text-[12px] text-ink placeholder:text-faint"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => exportToCsv('table-mapping', ['table', 'category', 'relationalColumns', 'graphPattern', 'advantage'], filteredTables.map((row) => [row.table, row.category, row.relationalColumns, row.graphPattern, row.advantage]))}
                >
                  <Download size={14} strokeWidth={1.5} /> CSV
                </Button>
              </div>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-small" aria-label="Relational to graph mapping">
              <thead>
                <tr className="border-b border-line bg-surface-2">
                  <th scope="col" className="px-4 py-2 text-caption font-medium text-muted">Table</th>
                  <th scope="col" className="px-4 py-2 text-caption font-medium text-muted">Category</th>
                  <th scope="col" className="px-4 py-2 text-caption font-medium text-muted">Relational columns</th>
                  <th scope="col" className="px-4 py-2 text-caption font-medium text-muted">Graph pattern</th>
                  <th scope="col" className="px-4 py-2 text-caption font-medium text-muted">Why</th>
                </tr>
              </thead>
              <tbody>
                {filteredTables.map((row) => (
                  <tr key={row.table} className="border-b border-line/60 align-top last:border-0">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-ink">{row.table}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={row.category === 'Node' ? 'accent' : row.category === 'Relationship' ? 'neutral' : 'warn'}>{row.category}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-muted">{row.relationalColumns}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-ink">{row.graphPattern}</td>
                    <td className="px-4 py-2.5 text-[11px] text-muted">{row.advantage}</td>
                  </tr>
                ))}
                {filteredTables.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-small text-faint">No tables match “{search}”.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 border-t border-line px-4 py-3 text-caption text-faint">
            <Table2 size={13} strokeWidth={1.5} />
            {filteredTables.length} of {tableMappings.length} tables
          </div>
        </Card>
      )}

      <EvidenceBlock />
    </div>
  );
}
