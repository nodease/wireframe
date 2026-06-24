'use client';

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react';
import { cn } from '@/src/lib/utils';

type FlowCanvasProps<TNodeData extends Record<string, unknown> = Record<string, unknown>> = {
  nodes: Node<TNodeData>[];
  edges: Edge[];
  nodeTypes?: NodeTypes;
  edgeTypes?: EdgeTypes;
  className?: string;
  fitView?: boolean;
  minZoom?: number;
  maxZoom?: number;
  onNodesChange?: (changes: NodeChange[]) => void;
  onEdgesChange?: (changes: EdgeChange[]) => void;
  onConnect?: (connection: Connection) => void;
  onNodeClick?: (nodeId: string) => void;
  onPaneClick?: () => void;
  onZoomChange?: (zoomPercent: number) => void;
};

// React Flow 자체에만 관심 있는 범용 캔버스입니다.
// 워크플로우, AI Agent 같은 서비스 도메인 로직은 바깥에서 주입합니다.
export function FlowCanvas<TNodeData extends Record<string, unknown>>({
  nodes,
  edges,
  nodeTypes,
  edgeTypes,
  className,
  fitView = true,
  minZoom = 0.45,
  maxZoom = 1.8,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneClick,
  onZoomChange,
}: FlowCanvasProps<TNodeData>) {
  return (
    <ReactFlow
      className={cn('h-full w-full bg-slate-50', className)}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={(_, node) => onNodeClick?.(node.id)}
      onPaneClick={onPaneClick}
      onMove={(_, viewport) => onZoomChange?.(Math.round(viewport.zoom * 100))}
      fitView={fitView}
      minZoom={minZoom}
      maxZoom={maxZoom}
      deleteKeyCode={['Delete', 'Backspace']}
    >
      <Background color="#dbe3ee" gap={28} />
      <MiniMap pannable zoomable />
      <Controls position="bottom-right" />
    </ReactFlow>
  );
}
