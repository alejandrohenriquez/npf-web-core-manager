import React, { useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Edge,
  Handle,
  MarkerType,
  MiniMap,
  Node,
  NodeProps,
  Position,
  ReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowDownLeft, ArrowUpRight, Layers, Link2 } from 'lucide-react';
import {
  ProjectRepository,
  RepositoryGraphEdge,
  RepositoryGraphNode,
} from '../../types';
import {
  useRepositoryGraphQuery,
  useUpsertRepositoryAliasMutation,
} from '../../hooks/useRepositoryGraphQuery';
import {
  NODE_SLOT_WIDTH,
  REPO_TYPE_STYLES,
  computeEdgeStrokeWidth,
  computeLayeredLayout,
  formatShortRepoName,
  getRepoTypeStyle,
} from './repositoryGraphLayout';
import { Sheet } from '../../components/ui/sheet';
import { Dialog } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

interface RepositoryNodeData extends Record<string, unknown> {
  node: RepositoryGraphNode;
  shortName: string;
  size: number;
  dimmed: boolean;
  highlighted: boolean;
}

type RepoFlowNode = Node<RepositoryNodeData, 'repositoryNode'>;

const RepositoryCustomNode: React.FC<NodeProps<RepoFlowNode>> = ({ data }) => {
  const { node, shortName, size, dimmed, highlighted } = data;
  const style = getRepoTypeStyle(node.repo_type, node.is_unresolved);

  return (
    <div
      style={{ width: NODE_SLOT_WIDTH }}
      title={`${node.name} (${node.repo_type}) — ${node.specs_count} specs vigentes`}
      className={`flex flex-col items-center cursor-pointer select-none transition-opacity duration-150 ${
        dimmed ? 'opacity-20' : 'opacity-100'
      }`}
    >
      <div
        style={{ width: size, height: size }}
        className={`relative rounded-full border-2 flex items-center justify-center shadow-sm transition-all ${
          style.cardClass
        } ${highlighted ? 'ring-4 ring-indigo-400/50 shadow-lg scale-110' : 'hover:shadow-md hover:scale-105'}`}
      >
        <Handle id="t-top" type="target" position={Position.Top} className="!opacity-0 !w-2 !h-2" />
        <Handle id="t-left" type="target" position={Position.Left} className="!opacity-0 !w-2 !h-2" />
        <Handle id="s-left" type="source" position={Position.Left} className="!opacity-0 !w-2 !h-2" />

        {node.is_unresolved && <span className="text-xs font-mono font-bold">?</span>}

        <Handle id="s-bottom" type="source" position={Position.Bottom} className="!opacity-0 !w-2 !h-2" />
        <Handle id="s-right" type="source" position={Position.Right} className="!opacity-0 !w-2 !h-2" />
        <Handle id="t-right" type="target" position={Position.Right} className="!opacity-0 !w-2 !h-2" />
      </div>

      <span className="mt-1.5 px-2 py-0.5 rounded-md bg-white/95 border border-slate-200 shadow-sm font-mono text-[11px] font-medium text-slate-800 max-w-[160px] truncate text-center">
        {shortName}
      </span>
    </div>
  );
};

const nodeTypes = {
  repositoryNode: RepositoryCustomNode,
};

interface ProjectRepositoryGraphProps {
  projectKey: string;
  repositories: ProjectRepository[];
}

export const ProjectRepositoryGraph: React.FC<ProjectRepositoryGraphProps> = ({
  projectKey,
  repositories,
}) => {
  const { data: graph, isLoading, isError } = useRepositoryGraphQuery(projectKey);
  const upsertAlias = useUpsertRepositoryAliasMutation(projectKey);

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<RepositoryGraphEdge | null>(null);
  const [selectedRepoNode, setSelectedRepoNode] = useState<RepositoryGraphNode | null>(null);
  const [selectedUnresolvedKey, setSelectedUnresolvedKey] = useState<string | null>(null);
  const [aliasTargetRepo, setAliasTargetRepo] = useState<string>('');

  const nodeById = useMemo(() => {
    const map = new Map<string, RepositoryGraphNode>();
    for (const n of graph?.nodes || []) {
      map.set(n.id, n);
    }
    return map;
  }, [graph?.nodes]);

  const layout = useMemo(() => {
    return computeLayeredLayout(graph?.nodes || []);
  }, [graph?.nodes]);

  const connectedToHovered = useMemo(() => {
    const nodesSet = new Set<string>();
    const edgesSet = new Set<string>();
    if (!hoveredNodeId || !graph) return { nodesSet, edgesSet };

    nodesSet.add(hoveredNodeId);
    for (const edge of graph.edges) {
      if (edge.source_id === hoveredNodeId || edge.target_id === hoveredNodeId) {
        edgesSet.add(edge.id);
        nodesSet.add(edge.source_id);
        nodesSet.add(edge.target_id);
      }
    }
    return { nodesSet, edgesSet };
  }, [hoveredNodeId, graph]);

  const flowNodes: RepoFlowNode[] = useMemo(() => {
    if (!graph) return [];
    return graph.nodes.map((n) => {
      const isDimmed = hoveredNodeId !== null && !connectedToHovered.nodesSet.has(n.id);
      const isHighlighted = hoveredNodeId === n.id;
      return {
        id: n.id,
        type: 'repositoryNode',
        position: layout.positions[n.id] || { x: 0, y: 0 },
        data: {
          node: n,
          shortName: formatShortRepoName(n.name, projectKey),
          size: layout.nodeSizes[n.id] || 36,
          dimmed: isDimmed,
          highlighted: isHighlighted,
        },
      };
    });
  }, [graph, layout, hoveredNodeId, connectedToHovered, projectKey]);

  const flowEdges: Edge[] = useMemo(() => {
    if (!graph) return [];
    const maxEndpoints = graph.edges.reduce((acc, e) => Math.max(acc, e.endpoints_count), 0);

    return graph.edges.map((e) => {
      const sourceLayer = layout.layerIndexById[e.source_id];
      const targetLayer = layout.layerIndexById[e.target_id];
      const sameLayer = sourceLayer !== undefined && sourceLayer === targetLayer;
      const isConnected = hoveredNodeId !== null && connectedToHovered.edgesSet.has(e.id);
      const isHoveredEdge = hoveredEdge?.id === e.id;
      const isDimmed = hoveredNodeId !== null && !isConnected;
      const targetNode = nodeById.get(e.target_id);
      const strokeColor = targetNode?.is_unresolved
        ? '#fb7185'
        : isConnected || isHoveredEdge
          ? '#4f46e5'
          : '#94a3b8';

      return {
        id: e.id,
        source: e.source_id,
        target: e.target_id,
        sourceHandle: sameLayer ? 's-right' : 's-bottom',
        targetHandle: sameLayer ? 't-left' : 't-top',
        type: 'default',
        animated: targetNode?.is_unresolved || isConnected,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
          width: 14,
          height: 14,
        },
        style: {
          strokeWidth: computeEdgeStrokeWidth(e.endpoints_count, maxEndpoints),
          stroke: strokeColor,
          strokeDasharray: targetNode?.is_unresolved ? '5 4' : undefined,
          opacity: isDimmed ? 0.12 : isConnected || isHoveredEdge ? 1 : 0.72,
          transition: 'opacity 150ms ease, stroke 150ms ease',
        },
        label: isConnected || isHoveredEdge ? `${e.endpoints_count}` : undefined,
        labelStyle: {
          fontSize: 10,
          fontFamily: 'monospace',
          fill: '#1e293b',
          fontWeight: 600,
        },
        labelBgStyle: {
          fill: '#ffffff',
          fillOpacity: 0.92,
        },
      };
    });
  }, [graph, layout, hoveredNodeId, hoveredEdge, connectedToHovered, nodeById]);

  const incomingEdges = useMemo(() => {
    if (!selectedRepoNode || !graph) return [];
    return graph.edges.filter((e) => e.target_id === selectedRepoNode.id);
  }, [selectedRepoNode, graph]);

  const outgoingEdges = useMemo(() => {
    if (!selectedRepoNode || !graph) return [];
    return graph.edges.filter((e) => e.source_id === selectedRepoNode.id);
  }, [selectedRepoNode, graph]);

  const candidateRepos = useMemo(() => {
    return repositories.filter(
      (r) => r.repo_type !== 'LIB' && r.repo_type !== 'TEMPLATE',
    );
  }, [repositories]);

  const handleNodeClick = (_: React.MouseEvent, flowNode: Node) => {
    const repoNode = nodeById.get(flowNode.id);
    if (!repoNode) return;
    if (repoNode.is_unresolved) {
      setSelectedUnresolvedKey(repoNode.name);
      setAliasTargetRepo(candidateRepos[0]?.name || '');
    } else {
      setSelectedRepoNode(repoNode);
    }
  };

  const handleSaveAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnresolvedKey || !aliasTargetRepo) return;
    await upsertAlias.mutateAsync({
      service_key: selectedUnresolvedKey,
      target_repository: aliasTargetRepo,
    });
    setSelectedUnresolvedKey(null);
    setAliasTargetRepo('');
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
        Cargando grafo de dependencias de repositorios...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-12 text-center text-rose-600 bg-white rounded-xl border border-rose-200">
        No se pudo cargar el grafo de dependencias del proyecto.
      </div>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        No hay repositorios disponibles para graficar en este proyecto.
      </div>
    );
  }

  const legendTypes = ['WEB', 'DOC', 'BFF', 'SERVICE', 'INFRA', 'MCP', 'OTHER', 'UNRESOLVED'];

  return (
    <div className="space-y-3">
      {/* Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-white rounded-lg border border-slate-200 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {legendTypes.map((t) => {
            const st = REPO_TYPE_STYLES[t];
            return (
              <span key={t} className="inline-flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                <span className={`w-2.5 h-2.5 rounded-full ${st.dotClass}`} />
                <span>{st.label}</span>
              </span>
            );
          })}
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          Tamaño = specs vigentes · Grosor = nº endpoints (excluye LIB y TEMPLATE)
        </span>
      </div>

      {/* React Flow Canvas */}
      <div className="relative h-[720px] w-full rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
        {hoveredEdge && (
          <div className="absolute top-3 right-3 z-10 max-w-sm rounded-lg border border-slate-200 bg-white/95 backdrop-blur px-3.5 py-2.5 shadow-md text-xs space-y-1 pointer-events-none">
            <div className="font-mono font-semibold text-slate-900">
              {nodeById.get(hoveredEdge.source_id)?.name} → {nodeById.get(hoveredEdge.target_id)?.name}
            </div>
            <div className="text-slate-600">
              <span className="font-semibold">{hoveredEdge.endpoints_count}</span> endpoints declarados ·{' '}
              <span className="font-mono">{hoveredEdge.resolution_methods.join(', ')}</span>
            </div>
            <div className="flex flex-wrap gap-1 pt-0.5">
              {hoveredEdge.service_keys.map((k) => (
                <span
                  key={k}
                  className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100"
                >
                  {k}
                </span>
              ))}
            </div>
          </div>
        )}

        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.25}
          maxZoom={2}
          onNodeClick={handleNodeClick}
          onNodeMouseEnter={(_, node) => setHoveredNodeId(node.id)}
          onNodeMouseLeave={() => setHoveredNodeId(null)}
          onEdgeMouseEnter={(_, edge) => {
            const raw = graph.edges.find((item) => item.id === edge.id) || null;
            setHoveredEdge(raw);
          }}
          onEdgeMouseLeave={() => setHoveredEdge(null)}
        >
          <Background gap={24} size={1} color="#cbd5e1" />
          <Controls />
          <MiniMap
            pannable
            zoomable
            nodeColor={(n) => {
              const repoNode = (n.data as RepositoryNodeData | undefined)?.node;
              return getRepoTypeStyle(repoNode?.repo_type || 'OTHER', repoNode?.is_unresolved).strokeHex;
            }}
          />
        </ReactFlow>
      </div>

      {/* Resolved Node Detail Sheet */}
      <Sheet
        open={!!selectedRepoNode}
        onClose={() => setSelectedRepoNode(null)}
        title={selectedRepoNode ? `${selectedRepoNode.name}` : 'Detalle de Repositorio'}
      >
        {selectedRepoNode && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-mono">
                {selectedRepoNode.repo_type}
              </Badge>
              <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                {selectedRepoNode.specs_count} specs vigentes
              </span>
            </div>

            {/* Active Specs Inventory */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Specs Vigentes ({selectedRepoNode.specs_inventory.length})</span>
              </h3>
              {selectedRepoNode.specs_inventory.length === 0 ? (
                <p className="text-xs text-slate-400">Sin especificaciones registradas.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selectedRepoNode.specs_inventory.map((spec) => (
                    <span
                      key={spec}
                      className="text-xs font-mono px-2 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-700"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Dependencies */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600" />
                <span>Consume de ({outgoingEdges.length})</span>
              </h3>
              {outgoingEdges.length === 0 ? (
                <p className="text-xs text-slate-400">No declara dependencias salientes en web_client.yaml.</p>
              ) : (
                <div className="space-y-2">
                  {outgoingEdges.map((edge) => {
                    const target = nodeById.get(edge.target_id);
                    return (
                      <div
                        key={edge.id}
                        className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-mono font-semibold text-slate-900 truncate">
                            {target?.name || edge.target_id}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                            Claves: {edge.service_keys.join(', ')}
                          </div>
                        </div>
                        <span className="font-mono font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded flex-shrink-0">
                          {edge.endpoints_count} ep
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Incoming Dependencies */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                <span>Consumido por ({incomingEdges.length})</span>
              </h3>
              {incomingEdges.length === 0 ? (
                <p className="text-xs text-slate-400">Ningún repositorio del grafo declara llamadas hacia este nodo.</p>
              ) : (
                <div className="space-y-2">
                  {incomingEdges.map((edge) => {
                    const source = nodeById.get(edge.source_id);
                    return (
                      <div
                        key={edge.id}
                        className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-mono font-semibold text-slate-900 truncate">
                            {source?.name || edge.source_id}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                            Claves: {edge.service_keys.join(', ')}
                          </div>
                        </div>
                        <span className="font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex-shrink-0">
                          {edge.endpoints_count} ep
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Sheet>

      {/* Unresolved Alias Mapping Dialog */}
      <Dialog
        open={!!selectedUnresolvedKey}
        onClose={() => setSelectedUnresolvedKey(null)}
        title={`Mapear clave "${selectedUnresolvedKey || ''}"`}
      >
        <form onSubmit={handleSaveAlias} className="space-y-4">
          <p className="text-xs text-slate-600">
            La clave <span className="font-mono font-semibold text-rose-700">{selectedUnresolvedKey}</span>{' '}
            no pudo resolverse automáticamente. Selecciona el repositorio destino para registrar un alias manual.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Repositorio Destino
            </label>
            <select
              value={aliasTargetRepo}
              onChange={(e) => setAliasTargetRepo(e.target.value)}
              required
              className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs shadow-sm font-mono"
            >
              {candidateRepos.map((repo) => (
                <option key={repo.id} value={repo.name}>
                  {repo.name} ({repo.repo_type})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedUnresolvedKey(null)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={upsertAlias.isPending || !aliasTargetRepo}
              className="flex items-center gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>{upsertAlias.isPending ? 'Guardando...' : 'Guardar Alias'}</span>
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
