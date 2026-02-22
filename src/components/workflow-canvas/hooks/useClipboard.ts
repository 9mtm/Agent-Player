'use client';

import { useState, useCallback } from 'react';
import type { CanvasNode, CanvasEdge } from '../canvas.types';

export function useClipboard() {
  const [clipboard, setClipboard] = useState<{
    nodes: CanvasNode[];
    edges: CanvasEdge[];
  } | null>(null);

  const copy = useCallback((nodes: CanvasNode[], edges: CanvasEdge[]) => {
    setClipboard({ nodes, edges });
  }, []);

  const paste = useCallback((offsetX: number = 50, offsetY: number = 50) => {
    if (!clipboard) return null;

    const nodeIdMap = new Map<string, string>();

    // Create new nodes with offset positions
    const newNodes = clipboard.nodes.map((node) => {
      const newId = `${node.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      nodeIdMap.set(node.id, newId);

      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + offsetX,
          y: node.position.y + offsetY,
        },
        selected: true,
      };
    });

    // Create new edges with updated node IDs
    const newEdges = clipboard.edges
      .filter((edge) => nodeIdMap.has(edge.source) && nodeIdMap.has(edge.target))
      .map((edge) => ({
        ...edge,
        id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        source: nodeIdMap.get(edge.source)!,
        target: nodeIdMap.get(edge.target)!,
      }));

    return { nodes: newNodes, edges: newEdges };
  }, [clipboard]);

  const hasClipboard = clipboard !== null && clipboard.nodes.length > 0;

  return { copy, paste, hasClipboard };
}
