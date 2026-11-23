import { RepositoryGraphNode } from '../../types';

export interface RepoTypeStyle {
  label: string;
  cardClass: string;
  badgeClass: string;
  dotClass: string;
  strokeHex: string;
}

export const REPO_TYPE_STYLES: Record<string, RepoTypeStyle> = {
  SERVICE: {
    label: 'SERVICE',
    cardClass: 'bg-indigo-50 border-indigo-500 text-indigo-900',
    badgeClass: 'bg-indigo-100 text-indigo-800',
    dotClass: 'bg-indigo-500',
    strokeHex: '#6366f1',
  },
  BFF: {
    label: 'BFF',
    cardClass: 'bg-purple-50 border-purple-500 text-purple-900',
    badgeClass: 'bg-purple-100 text-purple-800',
    dotClass: 'bg-purple-500',
    strokeHex: '#a855f7',
  },
  WEB: {
    label: 'WEB',
    cardClass: 'bg-sky-50 border-sky-500 text-sky-900',
    badgeClass: 'bg-sky-100 text-sky-800',
    dotClass: 'bg-sky-500',
    strokeHex: '#0ea5e9',
  },
  DOC: {
    label: 'DOC',
    cardClass: 'bg-amber-50 border-amber-500 text-amber-900',
    badgeClass: 'bg-amber-100 text-amber-800',
    dotClass: 'bg-amber-500',
    strokeHex: '#f59e0b',
  },
  INFRA: {
    label: 'INFRA',
    cardClass: 'bg-emerald-50 border-emerald-500 text-emerald-900',
    badgeClass: 'bg-emerald-100 text-emerald-800',
    dotClass: 'bg-emerald-500',
    strokeHex: '#10b981',
  },
  MCP: {
    label: 'MCP',
    cardClass: 'bg-teal-50 border-teal-500 text-teal-900',
    badgeClass: 'bg-teal-100 text-teal-800',
    dotClass: 'bg-teal-500',
    strokeHex: '#14b8a6',
  },
  OTHER: {
    label: 'OTHER',
    cardClass: 'bg-slate-100 border-slate-400 text-slate-800',
    badgeClass: 'bg-slate-200 text-slate-700',
    dotClass: 'bg-slate-400',
    strokeHex: '#94a3b8',
  },
  UNRESOLVED: {
    label: 'UNRESOLVED',
    cardClass: 'border-dashed border-2 border-rose-400 bg-rose-50/70 text-rose-800',
    badgeClass: 'bg-rose-100 text-rose-800',
    dotClass: 'bg-rose-400',
    strokeHex: '#fb7185',
  },
};

export function getRepoTypeStyle(repoType: string, isUnresolved = false): RepoTypeStyle {
  if (isUnresolved) return REPO_TYPE_STYLES.UNRESOLVED;
  return REPO_TYPE_STYLES[repoType.toUpperCase()] || REPO_TYPE_STYLES.OTHER;
}

export function computeNodeSize(specsCount: number, maxSpecs: number): number {
  const minSize = 110;
  const maxSize = 190;
  const ratio = maxSpecs > 0 ? Math.sqrt(Math.max(0, specsCount) / maxSpecs) : 0;
  return Math.round(minSize + ratio * (maxSize - minSize));
}

export function computeEdgeStrokeWidth(endpointsCount: number, maxEndpoints: number): number {
  if (maxEndpoints <= 0) return 1.5;
  return Number(
    (1.5 + 4.5 * (Math.log1p(Math.max(0, endpointsCount)) / Math.log1p(maxEndpoints))).toFixed(2),
  );
}

const LAYER_ORDER: string[][] = [
  ['WEB', 'DOC'],
  ['BFF', 'OTHER'],
  ['SERVICE'],
  ['INFRA', 'MCP'],
  ['UNRESOLVED'],
];

function resolveLayerBucket(node: RepositoryGraphNode): number {
  if (node.is_unresolved) return 4;
  const upper = (node.repo_type || 'OTHER').toUpperCase();
  const idx = LAYER_ORDER.findIndex((types) => types.includes(upper));
  return idx >= 0 ? idx : 1; // Fallback to BFF/OTHER layer
}

export interface LayeredLayoutResult {
  positions: Record<string, { x: number; y: number }>;
  nodeSizes: Record<string, number>;
  layerIndexById: Record<string, number>;
}

export function computeLayeredLayout(graphNodes: RepositoryGraphNode[]): LayeredLayoutResult {
  const maxSpecs = graphNodes.reduce((acc, n) => Math.max(acc, n.specs_count || 0), 0);
  const nodeSizes: Record<string, number> = {};
  const layerIndexById: Record<string, number> = {};
  const buckets: RepositoryGraphNode[][] = [[], [], [], [], []];

  for (const node of graphNodes) {
    nodeSizes[node.id] = computeNodeSize(node.specs_count || 0, maxSpecs);
    const bucketIdx = resolveLayerBucket(node);
    buckets[bucketIdx].push(node);
  }

  const nonEmptyBuckets = buckets.filter((b) => b.length > 0);
  const positions: Record<string, { x: number; y: number }> = {};
  const gap = 48;
  const maxPerRow = 6;
  const layerSpacingY = 220;
  const subRowSpacingY = 160;

  let currentY = 0;

  nonEmptyBuckets.forEach((bucket, activeLayerIdx) => {
    const sorted = [...bucket].sort((a, b) => a.name.localeCompare(b.name));
    const subRows: RepositoryGraphNode[][] = [];
    for (let i = 0; i < sorted.length; i += maxPerRow) {
      subRows.push(sorted.slice(i, i + maxPerRow));
    }

    subRows.forEach((rowNodes, subIdx) => {
      const totalWidth =
        rowNodes.reduce((sum, n) => sum + nodeSizes[n.id], 0) +
        gap * Math.max(0, rowNodes.length - 1);
      let cursorX = -totalWidth / 2;

      for (const n of rowNodes) {
        const size = nodeSizes[n.id];
        positions[n.id] = {
          x: Math.round(cursorX),
          y: Math.round(currentY + subIdx * subRowSpacingY),
        };
        layerIndexById[n.id] = activeLayerIdx;
        cursorX += size + gap;
      }
    });

    currentY += layerSpacingY + Math.max(0, subRows.length - 1) * subRowSpacingY;
  });

  return { positions, nodeSizes, layerIndexById };
}
