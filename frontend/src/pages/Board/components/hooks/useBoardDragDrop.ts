import { useState } from "react";
import type { BoardNodeData } from "../BoardNode";

const useBoardDragDrop = ({
  nodes,
  setNodes,
  NODE_TYPES,
  pan,
  zoom,
  boardRef,
  selection,
}) => {
  const [sidebarDragType, setSidebarDragType] = useState<string | null>(null);
  const [groupDragOffsets, setGroupDragOffsets] = useState<{
    [id: string]: { dx: number; dy: number };
  }>({});
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [offset, setOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const handleSidebarDragStart = (type: string) => setSidebarDragType(type);
  const handleSidebarDragEnd = () => setSidebarDragType(null);

  const handleBoardDrop = (e: React.DragEvent) => {
    if (!sidebarDragType) return;
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / zoom - pan.x;
    const y = (e.clientY - rect.top) / zoom - pan.y;
    const nodeType = NODE_TYPES.find((n: any) => n.type === sidebarDragType);
    if (nodeType) {
      setNodes((nodes: BoardNodeData[]) => {
        const newNodes = [
          ...nodes,
          {
            id: `${sidebarDragType}-${Date.now()}`,
            x: x - 40,
            y: y - 20,
            label: nodeType.label,
            type: nodeType.type,
          },
        ];
        if (newNodes.length > 1) {
          // Add a test edge from last node to new node
        }
        return newNodes;
      });
    }
    setSidebarDragType(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    setDraggedId(id);
    const node = nodes.find((n: BoardNodeData) => n.id === id);
    if (node) {
      setOffset({ x: e.clientX - node.x * zoom, y: e.clientY - node.y * zoom });
      if (
        selection.some((s: any) => s.type === "node" && s.id === id) &&
        selection.filter((s: any) => s.type === "node").length > 1
      ) {
        const baseX = node.x;
        const baseY = node.y;
        const offsets: { [id: string]: { dx: number; dy: number } } = {};
        selection
          .filter((s: any) => s.type === "node")
          .forEach((sel: any) => {
            const n = nodes.find((nn: BoardNodeData) => nn.id === sel.id);
            if (n) offsets[n.id] = { dx: n.x - baseX, dy: n.y - baseY };
          });
        setGroupDragOffsets(offsets);
      } else {
        setGroupDragOffsets({});
      }
    }
  };

  return {
    sidebarDragType,
    setSidebarDragType,
    handleSidebarDragStart,
    handleSidebarDragEnd,
    handleBoardDrop,
    groupDragOffsets,
    setGroupDragOffsets,
    draggedId,
    setDraggedId,
    offset,
    setOffset,
    handleNodeMouseDown,
  };
};

export default useBoardDragDrop;
