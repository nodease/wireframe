'use client';

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import { X } from 'lucide-react';
import { useState } from 'react';

type DeletableEdgeData = {
  onDeleteEdge?: (edgeId: number) => void;
};

export function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const edgeData = data as DeletableEdgeData | undefined;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        className="stroke-slate-500 stroke-[2.5px]"
      />
      <path
        d={edgePath}
        className="fill-none stroke-transparent stroke-[18px]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      <EdgeLabelRenderer>
        {isHovered && (
          <button
            type="button"
            className="nodrag nopan pointer-events-auto absolute z-50 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={(event) => {
              event.stopPropagation();
              edgeData?.onDeleteEdge?.(Number(id));
            }}
            aria-label="연결선 삭제"
            title="연결선 삭제"
          >
            <X size={13} />
          </button>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

export function EdgeLayer(props: EdgeProps) {
  return <DeletableEdge {...props} />;
}
