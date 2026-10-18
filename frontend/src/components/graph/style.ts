import type { StylesheetCSS, StylesheetStyle } from 'cytoscape';

type GraphStylesheet = StylesheetStyle | StylesheetCSS;

export interface GraphTheme {
  text: string;
  muted: string;
  faint: string;
  bg: string;
  surface2: string;
  surface3: string;
  border: string;
  borderStrong: string;
  accent: string;
  bad: string;
}

function channels(name: string): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return raw.replace(/\s+/g, ', ');
}

export function tokenColor(name: string, alpha?: number): string {
  const value = channels(name);
  return alpha === undefined ? `rgb(${value})` : `rgba(${value}, ${alpha})`;
}

export function readTheme(): GraphTheme {
  return {
    text: tokenColor('--text'),
    muted: tokenColor('--text-muted'),
    faint: tokenColor('--text-faint'),
    bg: tokenColor('--bg'),
    surface2: tokenColor('--surface-2'),
    surface3: tokenColor('--surface-3'),
    border: tokenColor('--border'),
    borderStrong: tokenColor('--border-strong'),
    accent: tokenColor('--accent'),
    bad: tokenColor('--bad'),
  };
}

export function buildStyles(mode: 'fcose' | 'concentric' | 'chain' | 'conflict' | 'schema'): GraphStylesheet[] {
  const theme = readTheme();
  const large = mode === 'conflict';
  return [
    {
      selector: 'node',
      style: {
        shape: 'round-rectangle',
        'background-color': theme.surface3,
        'border-width': 1,
        'border-color': theme.text,
        label: 'data(label)',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 6,
        'text-wrap': 'ellipsis',
        'text-max-width': '96px',
        'font-family': 'Geist Variable',
        'font-size': large ? 12 : 11,
        color: theme.text,
        'text-outline-color': theme.bg,
        'text-outline-width': 2,
        'text-opacity': 0,
        width: large ? 88 : 34,
        height: large ? 88 : 34,
      },
    },
    { selector: 'node.lbl', style: { 'text-opacity': 1 } },
    {
      selector: 'edge',
      style: {
        width: 1,
        'line-color': tokenColor('--text', 0.22),
        'target-arrow-color': tokenColor('--text', 0.22),
        'target-arrow-shape': 'triangle',
        'arrow-scale': 0.7,
        'curve-style': 'bezier',
        label: 'data(type)',
        'font-family': 'Geist Mono Variable',
        'font-size': 9,
        color: theme.muted,
        'text-outline-color': theme.bg,
        'text-outline-width': 2,
        'text-opacity': 0,
        'text-rotation': 'autorotate',
      },
    },
    { selector: 'edge.show-label', style: { 'text-opacity': 1 } },
    { selector: 'node[type="Conference"]', style: { shape: 'diamond', 'background-color': theme.text, 'border-width': 0 } },
    { selector: 'node[type="Track"]', style: { shape: 'hexagon', 'background-color': theme.surface3, 'border-color': theme.text, 'border-width': 1.5 } },
    { selector: 'node[type="Session"]', style: { shape: 'round-rectangle', 'background-color': theme.surface2, 'border-color': theme.muted, 'border-style': 'dashed' } },
    { selector: 'node[type="Author"]', style: { shape: 'ellipse', 'background-color': theme.text, 'border-width': 0 } },
    { selector: 'node[type="Reviewer"]', style: { shape: 'ellipse', 'background-color': theme.bg, 'border-color': theme.text, 'border-width': 2, 'border-style': 'double' } },
    { selector: 'node[type="Paper"]', style: { shape: 'round-rectangle', 'background-color': theme.surface3, 'border-color': theme.text, 'border-width': 1 } },
    { selector: 'node[type="Keyword"]', style: { shape: 'tag', 'background-color': theme.surface2, 'border-color': theme.muted, 'border-width': 1 } },
    { selector: 'node[type="Presentation"]', style: { shape: 'triangle', 'background-color': theme.bg, 'border-color': theme.muted, 'border-width': 1.5 } },
    { selector: 'node.sel', style: { 'border-color': theme.accent, 'border-width': 2.5, 'border-style': 'solid' } },
    { selector: 'node.hl', style: { 'border-color': theme.accent, 'border-width': 2 } },
    { selector: 'edge.hl', style: { 'line-color': theme.accent, 'target-arrow-color': theme.accent, width: 1.6 } },
    { selector: 'edge.conflict', style: { 'line-color': theme.bad, 'target-arrow-color': theme.bad, width: 2 } },
    { selector: 'node.conflict', style: { 'border-color': theme.bad, 'border-width': 2.5 } },
    { selector: '.dim', style: { opacity: 0.25 } },
    { selector: 'node.hover', style: { 'border-color': theme.text, 'border-width': 2.5 } },
  ];
}
