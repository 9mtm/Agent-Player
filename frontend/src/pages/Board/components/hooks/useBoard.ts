import { useState, useRef, useEffect, useCallback } from "react";
import config from "../../../../config";

// Extend window object for board/agent IDs
declare global {
  interface Window {
    boardId?: number;
    agentId?: number;
  }
}
import {
  getInitialTheme,
  saveTheme,
  saveBoardData,
  loadBoardData,
  SHORTCUTS,
} from "../utils/constants";
import {
  useBoardHistory,
  useBoardContextMenu,
  useBoardSelection,
  useBoardPanZoom,
  useBoardShortcuts,
} from "./index";
import { useBoardActions } from "./useBoardActions";
import type {
  BoardNodeData,
  Edge,
  EdgeDraft,
  GroupDragOffsets,
} from "../types";

export const useBoard = () => {
  // Core state
  const [nodes, setNodes] = useState<BoardNodeData[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [minimapVisible, setMinimapVisible] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showStartTrigger, setShowStartTrigger] = useState(false);

  // Interaction state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [sidebarDragType, setSidebarDragType] = useState<string | null>(null);
  const [edgeDraft, setEdgeDraft] = useState<EdgeDraft | null>(null);
  const [editingEdgeLabel, setEditingEdgeLabel] = useState<string | null>(null);
  const [edgeLabelDraft, setEdgeLabelDraft] = useState<string>("");
  const [editingNodeLabel, setEditingNodeLabel] = useState<string | null>(null);
  const [nodeLabelDraft, setNodeLabelDraft] = useState<string>("");
  const [groupDragOffsets, setGroupDragOffsets] = useState<GroupDragOffsets>(
    {}
  );

  // Refs
  const boardRef = useRef<HTMLDivElement>(null!);

  // Custom hooks
  const {
    push: pushHistory,
    undo: undoHistory,
    redo: redoHistory,
    canUndo,
    canRedo,
  } = useBoardHistory();
  const { contextMenu, openContextMenu, closeContextMenu } =
    useBoardContextMenu();
  const { selection, setSelection, clearSelection } = useBoardSelection();

  const {
    pan,
    setPan,
    zoom,
    setZoom,
    handleWheel,
    handleBoardMouseDown: handleBoardMouseDownPan,
    handleBoardMouseMovePan,
    handleBoardMouseUpPan,
  } = useBoardPanZoom({
    boardRef,
    nodes,
    NODE_WIDTH: 120,
    NODE_HEIGHT: 60,
  });

  // Toast utility
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1500);
  }, []);

  // Initialize board with API data
  useEffect(() => {
    const loadBoardFromAPI = async () => {
      try {
        // Get child agent ID from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const childId = urlParams.get("child");

        if (childId) {
          console.log("🏗️ Loading board for child agent:", childId);

          // Store child agent ID immediately
          window.agentId = parseInt(childId);

          // First, get boards for this child agent
          const boardsResponse = await fetch(
            `${config.api.baseURL}/api/v1/boards?agent_id=${childId}`
          );
          const boardsResult = await boardsResponse.json();

          if (boardsResult.success && boardsResult.data.length > 0) {
            const board = boardsResult.data[0]; // Use first board for this agent
            console.log("📋 Board loaded:", board);

            setNodes(board.nodes || []);
            setEdges(board.edges || []);

            // Store board ID for saving
            window.boardId = board.id;
          } else {
            console.log(
              "📋 No board found, creating new board for child agent:",
              childId
            );

            // Create a new board for this child agent
            const createBoardData = {
              name: `Training Board - Child Agent ${childId}`,
              description: `Auto-created training workflow board for child agent ${childId}`,
              agent_id: parseInt(childId),
              nodes: [],
              edges: [],
              settings: { zoom: 1 },
            };

            try {
              const createResponse = await fetch(
                `${config.api.baseURL}/api/v1/boards`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(createBoardData),
                }
              );

              const createResult = await createResponse.json();

              if (createResult.success) {
                console.log("✅ New board created:", createResult.data);
                window.boardId = createResult.data.id;
                setNodes([]);
                setEdges([]);
                setShowStartTrigger(true);
                showToast("New board created successfully!");
              } else {
                console.error(
                  "❌ Failed to create board:",
                  createResult.message
                );
                // Fallback to localStorage
                const data = loadBoardData();
                setNodes(data.nodes);
                setEdges(data.edges);
                setZoom(data.zoom);
                setShowStartTrigger(data.showStartTrigger);
              }
            } catch (createError) {
              console.error("❌ Error creating board:", createError);
              // Fallback to localStorage
              const data = loadBoardData();
              setNodes(data.nodes);
              setEdges(data.edges);
              setZoom(data.zoom);
              setShowStartTrigger(data.showStartTrigger);
            }
          }
        } else {
          console.log("⚠️ No agent ID in URL, using localStorage");
          // Fallback to localStorage if no agent ID
          const data = loadBoardData();
          setNodes(data.nodes);
          setEdges(data.edges);
          setZoom(data.zoom);
          setShowStartTrigger(data.showStartTrigger);
        }
      } catch (error) {
        console.error("❌ Error loading board:", error);
        // Fallback to localStorage
        const data = loadBoardData();
        setNodes(data.nodes);
        setEdges(data.edges);
        setZoom(data.zoom);
        setShowStartTrigger(data.showStartTrigger);
      }
    };

    loadBoardFromAPI();
  }, [setZoom, showToast]);

  // Autosave to both localStorage and API
  useEffect(() => {
    // Save to localStorage as backup
    saveBoardData(nodes, edges, zoom);

    // Save to API if we have board ID and agent ID
    const saveBoardToAPI = async () => {
      if (
        window.boardId &&
        window.agentId &&
        (nodes.length > 0 || edges.length > 0)
      ) {
        try {
          const boardData = {
            name: `Training Board for Agent ${window.agentId}`,
            description: `Training workflow board`,
            agent_id: window.agentId,
            nodes: nodes,
            edges: edges,
            settings: { zoom },
          };

          console.log("💾 Saving board to API:", window.boardId);

          const response = await fetch(
            `${config.api.baseURL}/api/v1/boards/${window.boardId}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(boardData),
            }
          );

          const result = await response.json();
          if (result.success) {
            console.log("✅ Board saved successfully");
          } else {
            console.error("❌ Failed to save board:", result.message);
          }
        } catch (error) {
          console.error("❌ Error saving board to API:", error);
        }
      }
    };

    // Debounce API saves
    const saveTimeout = setTimeout(saveBoardToAPI, 1000);
    return () => clearTimeout(saveTimeout);
  }, [nodes, edges, zoom]);

  // Theme persistence
  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  // Track changes for history
  useEffect(() => {
    pushHistory({ nodes, edges, zoom });
  }, [nodes, edges, zoom, pushHistory]);

  // Board actions hook
  const boardActions = useBoardActions({
    // State
    nodes,
    edges,
    zoom,
    pan,
    selection,
    edgeDraft,
    sidebarDragType,
    groupDragOffsets,

    // Setters
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

    // Utilities
    showToast,
    clearSelection,
    boardRef,

    // History and custom hooks
    undoHistory,
    redoHistory,
    handleBoardMouseDownPan,
    handleBoardMouseMovePan,
    handleBoardMouseUpPan,
    handleWheel,
    openContextMenu,
    closeContextMenu,

    // Add draggedId to params
    draggedId,
  });

  // Sidebar handlers
  const handleSidebarDragStart = useCallback(
    (type: string) => setSidebarDragType(type),
    []
  );
  const handleSidebarDragEnd = useCallback(() => setSidebarDragType(null), []);

  // Port handlers
  const handlePortMouseDown = useCallback(
    (
      e: React.MouseEvent,
      nodeId: string,
      portId: string,
      portType: "output" | "input"
    ) => {
      if (portType === "output") {
        e.stopPropagation();
        setEdgeDraft({
          source: nodeId,
          sourcePort: portId,
          mouse: { x: e.clientX, y: e.clientY },
        });
      }
    },
    []
  );

  const handlePortMouseUp = useCallback(
    (
      e: React.MouseEvent,
      nodeId: string,
      portId: string,
      portType: "output" | "input"
    ) => {
      if (portType === "input" && edgeDraft) {
        setEdges((edges) => [
          ...edges,
          {
            id: `e${edges.length + 1}`,
            source: edgeDraft.source,
            sourcePort: edgeDraft.sourcePort,
            target: nodeId,
            targetPort: portId,
          },
        ]);
        setEdgeDraft(null);
      }
    },
    [edgeDraft]
  );

  // Label editing handlers
  const handleNodeLabelDoubleClick = useCallback(
    (id: string, currentLabel: string) => {
      setEditingNodeLabel(id);
      setNodeLabelDraft(currentLabel);
    },
    []
  );

  const handleNodeLabelChange = useCallback((id: string, value: string) => {
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, label: value } : n))
    );
    setEditingNodeLabel(null);
  }, []);

  const handleEdgeLabelDoubleClick = useCallback(
    (id: string, currentLabel: string) => {
      setEditingEdgeLabel(id);
      setEdgeLabelDraft(currentLabel);
    },
    []
  );

  const handleEdgeLabelChange = useCallback((id: string, value: string) => {
    setEdges((edges) =>
      edges.map((e) => (e.id === id ? { ...e, label: value } : e))
    );
    setEditingEdgeLabel(null);
  }, []);

  const handleNodeResize = useCallback((id: string, w: number, h: number) => {
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, width: w, height: h } : n))
    );
  }, []);

  // Context menu handlers
  const handleContextMenuDelete = useCallback(() => {
    if (contextMenu?.type === "node" && contextMenu.id) {
      setNodes((nodes) => nodes.filter((n) => n.id !== contextMenu.id));
      setEdges((edges) =>
        edges.filter(
          (e) => e.source !== contextMenu.id && e.target !== contextMenu.id
        )
      );
    } else if (contextMenu?.type === "edge" && contextMenu.id) {
      setEdges((edges) => edges.filter((e) => e.id !== contextMenu.id));
    }
    closeContextMenu();
  }, [contextMenu, closeContextMenu]);

  // Edge deletion
  const handleEdgeDelete = useCallback(
    (id: string) => {
      setEdges((edges) => edges.filter((e) => e.id !== id));
      showToast("Edge deleted");
    },
    [showToast]
  );

  // Drag handlers
  const handleBoardDragOver = useCallback(
    (e: React.DragEvent) => {
      if (sidebarDragType) e.preventDefault();
    },
    [sidebarDragType]
  );

  // Keyboard shortcuts
  useBoardShortcuts({
    handleUndo: boardActions.handleUndo,
    handleRedo: boardActions.handleRedo,
    setNodes,
    setEdges,
    selection,
    clearSelection,
    nodes,
    showToast,
    zoom,
  });

  return {
    // State
    nodes,
    edges,
    theme,
    zoom,
    pan,
    sidebarOpen,
    minimapVisible,
    helpOpen,
    toast,
    showStartTrigger,

    // Interaction state
    draggedId,
    sidebarDragType,
    edgeDraft,
    editingEdgeLabel,
    edgeLabelDraft,
    editingNodeLabel,
    nodeLabelDraft,
    groupDragOffsets,
    selection,
    contextMenu,

    // State setters
    setSidebarOpen,
    setMinimapVisible,
    setHelpOpen,
    setEdgeLabelDraft,
    setNodeLabelDraft,

    // Refs
    boardRef,

    // History
    canUndo,
    canRedo,

    // Constants
    shortcuts: SHORTCUTS,

    // Actions from useBoardActions
    ...boardActions,

    // Pan/Zoom handlers from useBoardPanZoom
    handleBoardMouseDownPan,
    handleBoardMouseMovePan,
    handleBoardMouseUpPan,
    handleWheel,

    // Additional handlers
    handleSidebarDragStart,
    handleSidebarDragEnd,
    handlePortMouseDown,
    handlePortMouseUp,
    handleNodeLabelDoubleClick,
    handleNodeLabelChange,
    handleEdgeLabelDoubleClick,
    handleEdgeLabelChange,
    handleNodeResize,
    handleContextMenuDelete,
    handleEdgeDelete,
    handleBoardDragOver,

    // Utility actions
    onSidebarClose: () => setSidebarOpen(false),
    onSidebarNodeTypeSelect: () => setSidebarOpen(false),
    onBoardClick: clearSelection,
    onMinimapViewportChange: setPan,
    onMinimapToggleVisible: () => setMinimapVisible((v) => !v),
  };
};
