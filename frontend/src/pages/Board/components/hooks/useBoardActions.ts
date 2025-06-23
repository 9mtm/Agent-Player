import { useCallback } from "react";
import { NODE_TYPES } from "../nodeTypes";
import {
  MIN_ZOOM,
  MAX_ZOOM,
  DEFAULT_ZOOM,
  DEFAULT_PAN,
  exportBoardData,
  importBoardData,
} from "../utils/constants";
import type {
  BoardNodeData,
  Edge,
  EdgeDraft,
  SelectionItem,
  GroupDragOffsets,
} from "../types";

interface UseBoardActionsParams {
  // State
  nodes: BoardNodeData[];
  edges: Edge[];
  zoom: number;
  pan: { x: number; y: number };
  selection: SelectionItem[];
  edgeDraft: EdgeDraft | null;
  sidebarDragType: string | null;
  groupDragOffsets: GroupDragOffsets;
  draggedId: string | null;

  // Setters
  setNodes: React.Dispatch<React.SetStateAction<BoardNodeData[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setTheme: React.Dispatch<React.SetStateAction<"light" | "dark">>;
  setShowStartTrigger: React.Dispatch<React.SetStateAction<boolean>>;
  setDraggedId: React.Dispatch<React.SetStateAction<string | null>>;
  setSidebarDragType: React.Dispatch<React.SetStateAction<string | null>>;
  setEdgeDraft: React.Dispatch<React.SetStateAction<EdgeDraft | null>>;
  setEditingEdgeLabel: React.Dispatch<React.SetStateAction<string | null>>;
  setEdgeLabelDraft: React.Dispatch<React.SetStateAction<string>>;
  setEditingNodeLabel: React.Dispatch<React.SetStateAction<string | null>>;
  setNodeLabelDraft: React.Dispatch<React.SetStateAction<string>>;
  setGroupDragOffsets: React.Dispatch<React.SetStateAction<GroupDragOffsets>>;
  setSelection: React.Dispatch<React.SetStateAction<SelectionItem[]>>;

  // Utilities
  showToast: (message: string) => void;
  clearSelection: () => void;
  boardRef: React.RefObject<HTMLDivElement>;

  // History and custom hooks
  undoHistory: () => {
    nodes: BoardNodeData[];
    edges: Edge[];
    zoom: number;
  } | null;
  redoHistory: () => {
    nodes: BoardNodeData[];
    edges: Edge[];
    zoom: number;
  } | null;
  handleBoardMouseDownPan: (e: React.MouseEvent) => void;
  handleBoardMouseMovePan: (e: React.MouseEvent) => void;
  handleBoardMouseUpPan: () => void;
  handleWheel: (e: React.WheelEvent) => void;
  openContextMenu: (
    x: number,
    y: number,
    type: "node" | "edge" | "board",
    id?: string
  ) => void;
  closeContextMenu: () => void;
}

export const useBoardActions = (params: UseBoardActionsParams) => {
  const {
    nodes,
    edges,
    zoom,
    pan,
    selection,
    edgeDraft,
    sidebarDragType,
    groupDragOffsets,
    draggedId,
    setNodes,
    setEdges,
    setZoom,
    setPan,
    setTheme,
    setShowStartTrigger,
    setDraggedId,
    setSidebarDragType,
    setEdgeDraft,
    setEditingEdgeLabel,
    setEdgeLabelDraft,
    setEditingNodeLabel,
    setNodeLabelDraft,
    setGroupDragOffsets,
    setSelection,
    showToast,
    clearSelection,
    boardRef,
    undoHistory,
    redoHistory,
    handleBoardMouseDownPan,
    handleBoardMouseMovePan,
    handleBoardMouseUpPan,
    handleWheel,
    openContextMenu,
    closeContextMenu,
  } = params;

  // Zoom actions
  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 0.1, MIN_ZOOM));
  }, [setZoom]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 0.1, MAX_ZOOM));
  }, [setZoom]);

  const handleZoomReset = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
    setPan(DEFAULT_PAN);
  }, [setZoom, setPan]);

  // Theme toggle
  const handleToggleTheme = useCallback(() => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }, [setTheme]);

  // History actions
  const handleUndo = useCallback(() => {
    const prev = undoHistory();
    if (prev) {
      setNodes(prev.nodes);
      setEdges(prev.edges);
      setZoom(prev.zoom);
      showToast("Undid last change");
    }
  }, [undoHistory, setNodes, setEdges, setZoom, showToast]);

  const handleRedo = useCallback(() => {
    const next = redoHistory();
    if (next) {
      setNodes(next.nodes);
      setEdges(next.edges);
      setZoom(next.zoom);
      showToast("Redid last change");
    }
  }, [redoHistory, setNodes, setEdges, setZoom, showToast]);

  // File operations
  const handleExport = useCallback(() => {
    exportBoardData(nodes, edges, zoom);
  }, [nodes, edges, zoom]);

  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const data = await importBoardData(file);
        setNodes(data.nodes);
        setEdges(data.edges);
        setZoom(data.zoom);
        showToast("Imported successfully");
      } catch {
        showToast("Invalid file format");
      }
    },
    [setNodes, setEdges, setZoom, showToast]
  );

  // Trigger selection
  const handleTriggerSelect = useCallback(
    (type: string) => {
      setShowStartTrigger(false);
      setNodes([
        {
          id: "start",
          x: 120,
          y: 120,
          label: type.charAt(0).toUpperCase() + type.slice(1) + " Trigger",
          type: "task",
          triggerType: type,
        },
      ]);
      setEdges([]);
    },
    [setShowStartTrigger, setNodes, setEdges]
  );

  // Node interaction
  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, id: string) => {
      setDraggedId(id);
      const node = nodes.find((n) => n.id === id);
      if (node) {
        if (
          selection.some(
            (s: SelectionItem) => s.type === "node" && s.id === id
          ) &&
          selection.filter((s: SelectionItem) => s.type === "node").length > 1
        ) {
          const baseX = node.x;
          const baseY = node.y;
          const offsets: GroupDragOffsets = {};
          selection
            .filter((s: SelectionItem) => s.type === "node")
            .forEach((sel) => {
              const n = nodes.find((nn) => nn.id === sel.id);
              if (n) offsets[n.id] = { dx: n.x - baseX, dy: n.y - baseY };
            });
          setGroupDragOffsets(offsets);
        } else {
          setGroupDragOffsets({});
        }
      }
    },
    [nodes, selection, setDraggedId, setGroupDragOffsets]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggedId) return;
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      if (groupDragOffsets && Object.keys(groupDragOffsets).length > 0) {
        setNodes((nodes) =>
          nodes.map((n) =>
            groupDragOffsets[n.id]
              ? {
                  ...n,
                  x: x + groupDragOffsets[n.id].dx,
                  y: y + groupDragOffsets[n.id].dy,
                }
              : n
          )
        );
      } else {
        setNodes((nodes) =>
          nodes.map((n) => (n.id === draggedId ? { ...n, x, y } : n))
        );
      }
    },
    [draggedId, boardRef, zoom, groupDragOffsets, setNodes]
  );

  // Node and edge clicks
  const handleNodeClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (e.ctrlKey || e.metaKey) {
        setSelection((sel) =>
          sel.some((s) => s.type === "node" && s.id === id)
            ? sel.filter((s) => !(s.type === "node" && s.id === id))
            : [...sel, { type: "node", id }]
        );
      } else {
        setSelection([{ type: "node", id }]);
      }
    },
    [setSelection]
  );

  const handleEdgeClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (e.ctrlKey || e.metaKey) {
        setSelection((sel) =>
          sel.some((s) => s.type === "edge" && s.id === id)
            ? sel.filter((s) => !(s.type === "edge" && s.id === id))
            : [...sel, { type: "edge", id }]
        );
      } else {
        setSelection([{ type: "edge", id }]);
      }
    },
    [setSelection]
  );

  // Board mouse events
  const handleBoardMouseMove = useCallback(
    (e: React.MouseEvent) => {
      handleMouseMove(e);
      handleBoardMouseMovePan(e);

      if (edgeDraft && boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect();
        setEdgeDraft(
          (draft) =>
            draft && {
              ...draft,
              mouse: {
                x: (e.clientX - rect.left) / zoom,
                y: (e.clientY - rect.top) / zoom,
              },
            }
        );
      }
    },
    [
      handleMouseMove,
      handleBoardMouseMovePan,
      edgeDraft,
      boardRef,
      zoom,
      setEdgeDraft,
    ]
  );

  const handleBoardMouseUp = useCallback(() => {
    handleBoardMouseUpPan();
    setDraggedId(null);
    setGroupDragOffsets({});
  }, [handleBoardMouseUpPan, setDraggedId, setGroupDragOffsets]);

  // Context menu
  const handleBoardContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      openContextMenu(e.clientX, e.clientY, "board");
    },
    [openContextMenu]
  );

  // Board drop
  const handleBoardDrop = useCallback(
    (e: React.DragEvent) => {
      if (!sidebarDragType) return;
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left) / zoom - pan.x;
      const y = (e.clientY - rect.top) / zoom - pan.y;
      const nodeType = NODE_TYPES.find((n) => n.type === sidebarDragType);

      if (nodeType) {
        setNodes((nodes) => {
          const newNodes = [
            ...nodes,
            {
              id: `${sidebarDragType}-${Date.now()}`,
              x: x - 60,
              y: y - 30,
              label: nodeType.label,
              type: nodeType.type,
            },
          ];

          if (newNodes.length > 1) {
            setEdges((edges) => [
              ...edges,
              {
                id: `e${edges.length + 1}`,
                source: newNodes[newNodes.length - 2].id,
                sourcePort: "output",
                target: newNodes[newNodes.length - 1].id,
                targetPort: "input",
              },
            ]);
          }
          return newNodes;
        });
      }
      setSidebarDragType(null);
    },
    [
      sidebarDragType,
      boardRef,
      zoom,
      pan,
      setNodes,
      setEdges,
      setSidebarDragType,
    ]
  );

  return {
    // Zoom actions
    handleZoomOut,
    handleZoomIn,
    handleZoomReset,

    // Theme
    handleToggleTheme,

    // History
    handleUndo,
    handleRedo,

    // File operations
    handleExport,
    handleImport,

    // Board interactions
    handleTriggerSelect,
    handleNodeMouseDown,
    handleNodeClick,
    handleEdgeClick,
    handleBoardMouseMove,
    handleBoardMouseUp,
    handleBoardContextMenu,
    handleBoardDrop,

    // Mouse move (for drag)
    handleMouseMove,
  };
};
