import type { GraphPayload } from '@/api/schemas/common';

export type GraphMode = 'fcose' | 'concentric' | 'chain' | 'conflict' | 'schema';

export function chainPositions(nodes: GraphPayload['nodes']): Record<string, { x: number; y: number }> {
  const gapX = 180;
  const offsetX = 110;
  const offsetY = 110;
  return Object.fromEntries(
    nodes.map((node, index) => [node.id, { x: offsetX + index * gapX, y: offsetY }])
  );
}

export function conflictPositions(nodes: GraphPayload['nodes']): Record<string, { x: number; y: number }> {
  const order = ['Reviewer', 'Author', 'Paper'];
  const sorted = [...nodes].sort((a, b) => {
    const ai = order.indexOf(a.type);
    const bi = order.indexOf(b.type);
    return (ai === -1 ? 9 : ai) - (bi === -1 ? 9 : bi);
  });
  return Object.fromEntries(sorted.map((node, index) => [node.id, { x: 130 + index * 220, y: 130 }]));
}

export function degreeMap(graph: GraphPayload): Record<string, number> {
  const degrees: Record<string, number> = {};
  graph.edges.forEach((edge) => {
    degrees[edge.source] = (degrees[edge.source] ?? 0) + 1;
    degrees[edge.target] = (degrees[edge.target] ?? 0) + 1;
  });
  return degrees;
}

export function nodeTitle(node: GraphPayload['nodes'][number], max = 18): string {
  if (node.type === 'Paper') return String(node.props.title ?? node.label);
  const name = node.label || String(node.props.name ?? node.id);
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}
