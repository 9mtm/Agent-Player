// Board data interfaces
export interface BoardNodeData {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  type: string;
  triggerType?: string;
}

export interface Edge {
  id: string;
  source: string;
  sourcePort: string;
  target: string;
  targetPort: string;
  label?: string;
}

export interface SelectionItem {
  type: "node" | "edge";
  id: string;
}

// Draft interfaces
export interface EdgeDraft {
  source: string;
  sourcePort: string;
  mouse: { x: number; y: number };
}

export interface GroupDragOffsets {
  [id: string]: { dx: number; dy: number };
}

// Board state interface
export interface BoardState {
  nodes: BoardNodeData[];
  edges: Edge[];
  zoom: number;
  pan: { x: number; y: number };
  theme: "light" | "dark";
  sidebarOpen: boolean;
  minimapVisible: boolean;
  helpOpen: boolean;
  toast: string | null;
  showStartTrigger: boolean;
}

// Interaction state interface
export interface InteractionState {
  draggedId: string | null;
  sidebarDragType: string | null;
  edgeDraft: EdgeDraft | null;
  editingEdgeLabel: string | null;
  edgeLabelDraft: string;
  editingNodeLabel: string | null;
  nodeLabelDraft: string;
  groupDragOffsets: GroupDragOffsets;
  selection: SelectionItem[];
}

// Board actions interface
export interface BoardActions {
  // Basic actions
  setNodes: React.Dispatch<React.SetStateAction<BoardNodeData[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setTheme: React.Dispatch<React.SetStateAction<"light" | "dark">>;

  // UI actions
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setMinimapVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setHelpOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setToast: React.Dispatch<React.SetStateAction<string | null>>;
  setShowStartTrigger: React.Dispatch<React.SetStateAction<boolean>>;

  // Interaction actions
  setDraggedId: React.Dispatch<React.SetStateAction<string | null>>;
  setSidebarDragType: React.Dispatch<React.SetStateAction<string | null>>;
  setEdgeDraft: React.Dispatch<React.SetStateAction<EdgeDraft | null>>;
  setEditingEdgeLabel: React.Dispatch<React.SetStateAction<string | null>>;
  setEdgeLabelDraft: React.Dispatch<React.SetStateAction<string>>;
  setEditingNodeLabel: React.Dispatch<React.SetStateAction<string | null>>;
  setNodeLabelDraft: React.Dispatch<React.SetStateAction<string>>;
  setGroupDragOffsets: React.Dispatch<React.SetStateAction<GroupDragOffsets>>;
  setSelection: React.Dispatch<React.SetStateAction<SelectionItem[]>>;

  // Utility actions
  showToast: (message: string) => void;
  clearSelection: () => void;
}

// Context menu interface
export interface ContextMenu {
  x: number;
  y: number;
  type: "node" | "edge" | "board";
  id?: string;
}

// History state interface
export interface HistoryState {
  nodes: BoardNodeData[];
  edges: Edge[];
  zoom: number;
}

// Keyboard shortcut interface
export interface KeyboardShortcut {
  keys: string;
  desc: string;
}
