// New refactored components
export { BoardToolbar } from "./BoardToolbar";
export { BoardContent } from "./BoardContent";
export { BoardToast } from "./BoardToast";

// Types
export type * from "../types";

// Board Components Index
export { default as BoardCanvas } from "./BoardCanvas";
export { default as BoardSidebar } from "./BoardSidebar";
export { default as BoardMinimap } from "./BoardMinimap";
export { default as BoardContextMenu } from "./BoardContextMenu";
export { default as BoardHelpDialog } from "./BoardHelpDialog";
export { default as BoardStartTrigger } from "./BoardStartTrigger";
export { default as BoardNode } from "./BoardNode";
export { default as BoardEdge } from "./BoardEdge";
export { default as WorkflowBoard } from "./WorkflowBoard";
export type { WorkflowBoardHandle } from "./WorkflowBoard";

// Hooks
export {
  useBoardHistory,
  useBoardContextMenu,
  useBoardSelection,
  useBoardPanZoom,
  useBoardShortcuts,
  useBoardDragDrop,
} from "./hooks";

// Types and utilities
export { NODE_TYPES } from "./nodeTypes";

export { StartTriggerModal } from './StartTriggerModal';
