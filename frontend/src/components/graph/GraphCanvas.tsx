import cytoscape, { type Core, type ElementDefinition, type LayoutOptions } from 'cytoscape';
import fcose from 'cytoscape-fcose';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import type { GraphPayload } from '@/api/schemas/common';
import { cn } from '@/lib/cn';
import { buildStyles } from './style';
import { chainPositions, conflictPositions, degreeMap, nodeTitle, type GraphMode } from './layouts';

cytoscape.use(fcose);

export interface GraphCanvasHandle {
  fit: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface Props {
  graph: GraphPayload;
  mode?: GraphMode;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  className?: string;
  height?: number;
  ariaLabel: string;
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const GraphCanvas = forwardRef<GraphCanvasHandle, Props>(function GraphCanvas(
  { graph, mode = 'fcose', selectedId = null, onSelect, className, height = 520, ariaLabel },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const elements = useMemo<ElementDefinition[]>(() => {
    const degrees = degreeMap(graph);
    const showAll = graph.nodes.length <= 25;
    const nodeEls: ElementDefinition[] = graph.nodes.map((node) => {
      const degree = degrees[node.id] ?? 0;
      const size = Math.min(34 + degree * 3, 52);
      return {
        data: {
          id: node.id,
          label: nodeTitle(node),
          type: capitalise(node.type),
          degree,
          width: size,
          height: size,
        },
        classes: showAll || degree >= 6 ? 'lbl' : '',
      };
    });
    const edgeEls: ElementDefinition[] = graph.edges.map((edge) => ({
      data: { id: edge.id, source: edge.source, target: edge.target, type: edge.type },
      classes: mode === 'conflict' && (edge.type === 'SAME_PERSON_AS' || edge.type === 'EMAIL_MATCH') ? 'conflict' : '',
    }));
    return [...nodeEls, ...edgeEls];
  }, [graph, mode]);

  useEffect(() => {
    if (!containerRef.current) return;
    const instance = cytoscape({
      container: containerRef.current,
      elements,
      style: buildStyles(mode),
      wheelSensitivity: 0.25,
      minZoom: 0.2,
      maxZoom: 2.5,
      boxSelectionEnabled: false,
      autoungrabify: false,
    });
    cyRef.current = instance;

    instance.on('tap', 'node', (event) => {
      onSelectRef.current?.(String(event.target.id()));
    });
    instance.on('tap', (event) => {
      if (event.target === instance) onSelectRef.current?.(null);
    });
    instance.on('mouseover', 'node', (event) => {
      const node = event.target;
      node.addClass('hover');
      node.addClass('lbl');
      node.closedNeighborhood().edges().addClass('show-label');
    });
    instance.on('mouseout', 'node', (event) => {
      event.target.removeClass('hover');
      if (!selectedIdRef.current) {
        instance.edges().removeClass('show-label');
        instance.nodes().removeClass('lbl').each((node) => {
          if ((node.data('degree') as number) >= 6 || instance.nodes().length <= 25) node.addClass('lbl');
        });
      }
    });

    const positions = mode === 'chain' ? chainPositions(graph.nodes) : mode === 'conflict' ? conflictPositions(graph.nodes) : null;
    const layout: LayoutOptions = positions
      ? ({ name: 'preset', positions, fit: true, padding: 56 } as unknown as LayoutOptions)
      : mode === 'concentric'
        ? ({
            name: 'concentric',
            animate: true,
            animationDuration: 300,
            animationEasing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
            concentric: (node: { degree: () => number }) => node.degree(),
            levelWidth: () => 2,
            minNodeSpacing: 42,
            padding: 48,
          } as unknown as LayoutOptions)
        : ({
            name: 'fcose',
            animate: true,
            animationDuration: 300,
            animationEasing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
            nodeDimensionsIncludeLabels: true,
            idealEdgeLength: 90,
            nodeRepulsion: 9000,
            padding: 48,
          } as unknown as LayoutOptions);
    const run = instance.layout(layout);
    run.run();
    const fitTimer = window.setTimeout(() => instance.fit(undefined, 48), 40);

    const observer = new ResizeObserver(() => {
      instance.resize();
      instance.fit(undefined, 48);
    });
    observer.observe(containerRef.current);

    return () => {
      window.clearTimeout(fitTimer);
      observer.disconnect();
      instance.destroy();
      cyRef.current = null;
    };
  }, [elements, mode, graph.nodes]);

  useEffect(() => {
    const instance = cyRef.current;
    if (!instance) return;
    instance.elements().removeClass('sel hl dim show-label');
    if (!selectedId) return;
    const node = instance.getElementById(selectedId);
    if (node.empty()) return;
    const neighbourhood = node.closedNeighborhood();
    node.addClass('sel lbl');
    neighbourhood.nodes().addClass('lbl');
    neighbourhood.edges().addClass('hl show-label');
    instance.elements().not(neighbourhood).not(node).addClass('dim');
  }, [selectedId, elements]);

  useImperativeHandle(ref, () => ({
    fit: () => cyRef.current?.fit(undefined, 48),
    zoomIn: () => {
      const cy = cyRef.current;
      if (cy) cy.zoom({ level: cy.zoom() * 1.2, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
    },
    zoomOut: () => {
      const cy = cyRef.current;
      if (cy) cy.zoom({ level: cy.zoom() / 1.2, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
    },
  }));

  return (
    <div className={cn('relative', className)}>
      <div
        ref={containerRef}
        role="application"
        aria-label={ariaLabel}
        className="w-full rounded-lg border border-line bg-bg"
        style={{ height }}
      />
      <details className="mt-2 rounded-md border border-line bg-surface px-3 py-2 text-small text-muted">
        <summary className="cursor-pointer select-none text-caption text-faint">
          Text view of this graph ({graph.nodes.length} nodes, {graph.edges.length} edges)
        </summary>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <ul className="space-y-1">
            {graph.nodes.map((node) => (
              <li key={node.id}>
                <span className="font-mono text-[11px] text-faint">{node.type}</span> {node.label}
              </li>
            ))}
          </ul>
          <ul className="space-y-1">
            {graph.edges.map((edge) => (
              <li key={edge.id} className="font-mono text-[11px] text-muted">
                {edge.source} &rarr; {edge.type} &rarr; {edge.target}
              </li>
            ))}
          </ul>
        </div>
      </details>
    </div>
  );
});
