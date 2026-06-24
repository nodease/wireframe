'use client';

import {
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import { Workflow } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlowCanvas } from '../flow/FlowCanvas';
import type { CanvasEdge, CanvasNode, ExecutionLog } from '../../domains/workflow/types';
import { CanvasNodeCard, type CanvasNodeCardData } from './CanvasNodeCard';
import { EdgeLayer } from './EdgeLayer';

type WorkflowCanvasProps = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  workflowName: string;
  selectedNodeId: number | null;
  runNotice: string;
  runningNodeIds: number[];
  nodeRunStatuses: Record<number, 'running' | 'success' | 'failed'>;
  onSelectNode: (nodeId: number | null) => void;
  onNodePositionChange: (nodeId: number, position: { x: number; y: number }) => void;
  onConnectNodes: (sourceNodeId: number, targetNodeId: number) => void;
  onDeleteEdge: (edgeId: number) => void;
  onToggleNodeDetails: (nodeId: number) => void;
  onUpdateNodeConfig: CanvasNodeCardData['onUpdateNodeConfig'];
  onExecuteNotionPrompt: (nodeId: number) => void;
  getNodeRunProfile: (node: CanvasNode) => Pick<ExecutionLog, 'duration' | 'credits'>;
};

const nodeTypes = {
  workflowNode: CanvasNodeCard,
};

const edgeTypes = {
  deletable: EdgeLayer,
};

export function WorkflowCanvas({
  nodes,
  edges,
  workflowName,
  selectedNodeId,
  runNotice,
  runningNodeIds,
  nodeRunStatuses,
  onSelectNode,
  onNodePositionChange,
  onConnectNodes,
  onDeleteEdge,
  onToggleNodeDetails,
  onUpdateNodeConfig,
  onExecuteNotionPrompt,
  getNodeRunProfile,
}: WorkflowCanvasProps) {
  const [zoom, setZoom] = useState(100);
  const isDraggingNodeRef = useRef(false);
  const mappedNodes: Node<CanvasNodeCardData>[] = useMemo(
    () =>
      nodes.map((node) => ({
        id: String(node.id),
        type: 'workflowNode',
        position: { x: node.x, y: node.y },
        selected: selectedNodeId === node.id,
        data: {
          canvasNode: node,
          runStatus:
            runningNodeIds.includes(node.id)
              ? 'running'
              : nodeRunStatuses[node.id] ?? null,
          onToggleNodeDetails,
          onUpdateNodeConfig,
          onExecuteNotionPrompt,
          getNodeRunProfile,
        },
      })),
    [
      getNodeRunProfile,
      nodes,
      onExecuteNotionPrompt,
      onToggleNodeDetails,
      onUpdateNodeConfig,
      nodeRunStatuses,
      selectedNodeId,
      runningNodeIds,
    ],
  );
  const [flowNodes, setFlowNodes] =
    useState<Node<CanvasNodeCardData>[]>(mappedNodes);

  useEffect(() => {
    if (isDraggingNodeRef.current) {
      return;
    }

    setFlowNodes(mappedNodes);
  }, [mappedNodes]);

  const flowEdges: Edge[] = useMemo(
    () =>
      edges.map((edge) => ({
        id: String(edge.id),
        source: String(edge.fromNodeId),
        target: String(edge.toNodeId),
        sourceHandle: edge.fromHandle === 'top' ? 'top' : 'bottom',
        targetHandle: edge.toHandle === 'bottom' ? 'bottom' : 'top',
        type: 'deletable',
        data: { onDeleteEdge },
      })),
    [edges, onDeleteEdge],
  );

  const handleNodesChange = (changes: NodeChange[]) => {
    setFlowNodes((currentNodes) =>
      applyNodeChanges(changes, currentNodes) as Node<CanvasNodeCardData>[],
    );

    changes.forEach((change) => {
      if (change.type === 'position') {
        isDraggingNodeRef.current = Boolean(change.dragging);
      }

      if (change.type === 'position' && change.position) {
        if (!change.dragging) {
          onNodePositionChange(Number(change.id), change.position);
        }
      }

      if (change.type === 'select') {
        onSelectNode(change.selected ? Number(change.id) : null);
      }
    });
  };

  const handleEdgesChange = (changes: EdgeChange[]) => {
    changes.forEach((change) => {
      if (change.type === 'remove') {
        onDeleteEdge(Number(change.id));
      }
    });
  };

  const handleConnect = (connection: Connection) => {
    if (!connection.source || !connection.target) {
      return;
    }

    onConnectNodes(Number(connection.source), Number(connection.target));
  };

  return (
    <div className="relative h-full min-h-0 flex-1 overflow-hidden bg-slate-50">
      {runNotice && (
        <div className="pointer-events-none absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {runNotice}
        </div>
      )}
      {nodes.length === 0 && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
            <Workflow size={24} />
          </div>
          <strong className="text-base font-semibold text-slate-950">
            {workflowName} 캔버스
          </strong>
          <span className="mt-1 text-sm text-slate-500">
            왼쪽 노드 목록에서 노드를 클릭하세요.
          </span>
        </div>
      )}

      <FlowCanvas
        className="h-full w-full"
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={(nodeId) => onSelectNode(Number(nodeId))}
        onPaneClick={() => onSelectNode(null)}
        onZoomChange={setZoom}
        fitView={nodes.length > 0}
        minZoom={0.45}
        maxZoom={1.8}
      />

      <div className="pointer-events-none absolute bottom-5 right-5 z-20 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
        {zoom}%
      </div>
    </div>
  );
}
