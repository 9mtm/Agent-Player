'use client';

import { useCallback } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  useReactFlow,
} from '@xyflow/react';
import { Plus } from 'lucide-react';

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  const { setEdges, setNodes } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = useCallback(() => {
    // Get source and target IDs from edge
    const edgeData = id.split('-to-'); // Assuming edge ID format: "source-to-target"
    if (edgeData.length !== 2) return;

    const [sourceId, targetId] = edgeData;

    // Create new node between source and target
    const newNodeId = `action-${Date.now()}`;
    const newNode = {
      id: newNodeId,
      type: 'action',
      position: {
        x: labelX - 110, // Center node on label position
        y: labelY - 40,
      },
      data: {
        label: 'Action',
        type: 'action' as const,
        icon: '⚡',
        description: 'Action node',
      },
    };

    // Add new node
    setNodes((nds) => [...nds, newNode]);

    // Update edges: remove current edge, add two new edges
    setEdges((eds) => [
      ...eds.filter((e) => e.id !== id),
      {
        id: `${sourceId}-to-${newNodeId}`,
        source: sourceId,
        target: newNodeId,
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: 'arrowclosed' as const,
          width: 20,
          height: 20,
        },
      },
      {
        id: `${newNodeId}-to-${targetId}`,
        source: newNodeId,
        target: targetId,
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: 'arrowclosed' as const,
          width: 20,
          height: 20,
        },
      },
    ]);
  }, [id, labelX, labelY, setEdges, setNodes]);

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button
            className="edge-button"
            onClick={onEdgeClick}
            title="Add node"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
