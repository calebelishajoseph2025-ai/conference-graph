import { useEffect, useState, type ReactNode } from 'react';

interface Point {
  x: number;
  y: number;
  type: 'conference' | 'track' | 'paper' | 'author';
  chain?: boolean;
}

const NODES: Point[] = [
  { x: 280, y: 46, type: 'conference' },
  { x: 140, y: 128, type: 'track' },
  { x: 280, y: 140, type: 'track' },
  { x: 420, y: 128, type: 'track' },
  { x: 76, y: 230, type: 'paper', chain: true },
  { x: 198, y: 236, type: 'paper', chain: true },
  { x: 318, y: 236, type: 'paper', chain: true },
  { x: 448, y: 226, type: 'paper' },
  { x: 44, y: 338, type: 'author', chain: true },
  { x: 158, y: 344, type: 'author', chain: true },
  { x: 282, y: 344, type: 'author', chain: true },
  { x: 402, y: 344, type: 'author', chain: true },
  { x: 510, y: 292, type: 'author' },
  { x: 206, y: 92, type: 'author' },
  { x: 356, y: 84, type: 'author' },
  { x: 476, y: 372, type: 'paper' },
];

const EDGES: [number, number][] = [
  [0, 1], [0, 2], [0, 3],
  [1, 4], [1, 5], [2, 5], [2, 6], [3, 6], [3, 7],
  [8, 4], [9, 4], [9, 5], [10, 5], [10, 6], [11, 6], [11, 7],
  [12, 7], [13, 4], [13, 1], [14, 3], [14, 6], [15, 7],
];

const CHAIN: [number, number][] = [[8, 4], [4, 9], [9, 5], [5, 10], [10, 6], [6, 11]];
const CHAIN_NODES = new Set([8, 4, 9, 5, 10, 6, 11]);

function shape(node: Point, index: number, lit: boolean) {
  const stroke = lit ? 'rgb(var(--accent))' : 'rgb(var(--text) / .42)';
  const fill = node.type === 'author' ? 'rgb(var(--text))' : node.type === 'conference' ? 'rgb(var(--text))' : 'rgb(var(--surface-3))';
  switch (node.type) {
    case 'conference':
      return <polygon key={index} points="0,-13 13,0 0,13 -13,0" fill={fill} className="opacity-100" />;
    case 'track':
      return <polygon key={index} points="-9,-12 9,-12 14,0 9,12 -9,12 -14,0" fill={fill} stroke={stroke} strokeWidth="1.3" />;
    case 'paper':
      return <rect key={index} x="-13" y="-10" width="26" height="20" rx="4" fill="rgb(var(--surface-3))" stroke={stroke} strokeWidth="1.3" />;
    default:
      return <circle key={index} r="7.5" fill={fill} stroke={stroke} strokeWidth="1.2" />;
  }
}

function renderNode(node: Point, index: number, lit: boolean): ReactNode {
  return (
    <g key={index} transform={`translate(${node.x} ${node.y})`} className="hero-node">
      {shape(node, index, lit)}
    </g>
  );
}

export function HeroGraph() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 60);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="relative">
      <svg viewBox="0 0 560 440" className="w-full" role="img" aria-label="A conference graph: one conference, three tracks, six papers and six authors, with a highlighted three-hop co-author chain.">
        {EDGES.map(([from, to], index) => {
          const a = NODES[from];
          const b = NODES[to];
          return (
            <line
              key={`e-${index}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              pathLength={1}
              strokeDasharray="1"
              strokeDashoffset={mounted ? 0 : 1}
              stroke="rgb(var(--text) / .24)"
              strokeWidth="1"
              style={{ transition: `stroke-dashoffset 700ms var(--ease-out) ${index * 40}ms` }}
            />
          );
        })}
        {CHAIN.map(([from, to], index) => {
          const a = NODES[from];
          const b = NODES[to];
          return (
            <line
              key={`c-${index}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              pathLength={1}
              strokeDasharray="1"
              strokeDashoffset={mounted ? 0 : 1}
              stroke="rgb(var(--accent))"
              strokeWidth="1.6"
              style={{ transition: `stroke-dashoffset 500ms var(--ease-out) ${900 + index * 60}ms` }}
            />
          );
        })}
        {NODES.map((node, index) => renderNode(node, index, CHAIN_NODES.has(index)))}
        <g transform="translate(196 282)" className="pointer-events-none select-none">
          <rect x="-44" y="-11" width="88" height="22" rx="11" fill="rgb(var(--bg))" stroke="rgb(var(--border-strong))" />
          <text x="0" y="4" textAnchor="middle" fontSize="10" fill="rgb(var(--text-muted))" fontFamily="Geist Mono Variable">
            3 co-author hops
          </text>
        </g>
      </svg>
    </div>
  );
}
