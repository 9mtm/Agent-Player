import type { KeyboardShortcut, BoardNodeData, Edge } from "../../types";

// Storage keys
export const THEME_KEY = "dpro-board-theme";
export const AUTOSAVE_KEY = "dpro-board-autosave";

// Board constraints
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 3;
export const NODE_WIDTH = 120;
export const NODE_HEIGHT = 60;

// Default values
export const DEFAULT_ZOOM = 1;
export const DEFAULT_PAN = { x: 0, y: 0 };

// Keyboard shortcuts for help dialog
export const SHORTCUTS: KeyboardShortcut[] = [
  { keys: "Ctrl+Z", desc: "Undo last action" },
  { keys: "Ctrl+Y", desc: "Redo last action" },
  { keys: "Ctrl+C", desc: "Copy selected items" },
  { keys: "Ctrl+V", desc: "Paste copied items" },
  { keys: "Ctrl+D", desc: "Duplicate selected items" },
  { keys: "Delete", desc: "Delete selected items" },
  { keys: "Escape", desc: "Clear selection" },
  { keys: "Arrow Keys", desc: "Move selected items" },
  { keys: "Alt+L/C/R", desc: "Align left/center/right" },
  { keys: "Alt+T/M/B", desc: "Align top/middle/bottom" },
];

// Theme utilities
export const getInitialTheme = (): "light" | "dark" => {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export const saveTheme = (theme: "light" | "dark") => {
  localStorage.setItem(THEME_KEY, theme);
  document.body.classList.toggle("dpro-board-dark", theme === "dark");
};

// Board data utilities
export const saveBoardData = (
  nodes: BoardNodeData[],
  edges: Edge[],
  zoom: number
) => {
  localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ nodes, edges, zoom }));
};

export const loadBoardData = () => {
  try {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (saved) {
      const obj = JSON.parse(saved);
      if (obj.nodes && obj.edges && typeof obj.zoom === "number") {
        return {
          nodes: obj.nodes,
          edges: obj.edges,
          zoom: obj.zoom,
          showStartTrigger: !obj.nodes || obj.nodes.length === 0,
        };
      }
    }
    return { nodes: [], edges: [], zoom: DEFAULT_ZOOM, showStartTrigger: true };
  } catch {
    return { nodes: [], edges: [], zoom: DEFAULT_ZOOM, showStartTrigger: true };
  }
};

// File export/import utilities
export const exportBoardData = (
  nodes: BoardNodeData[],
  edges: Edge[],
  zoom: number
) => {
  const data = JSON.stringify({ nodes, edges, zoom }, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "board-export.json";
  a.click();
  URL.revokeObjectURL(url);
};

export const importBoardData = (
  file: File
): Promise<{ nodes: BoardNodeData[]; edges: Edge[]; zoom: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const obj = JSON.parse(evt.target?.result as string);
        if (obj.nodes && obj.edges && typeof obj.zoom === "number") {
          resolve({ nodes: obj.nodes, edges: obj.edges, zoom: obj.zoom });
        } else {
          reject(new Error("Invalid file format"));
        }
      } catch {
        reject(new Error("Invalid file format"));
      }
    };
    reader.readAsText(file);
  });
};
