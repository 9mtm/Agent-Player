import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { BoardNodeData } from "../BoardNode";
import type { Edge } from "../edges";

interface SelectionItem {
  type: "node" | "edge";
  id: string;
}

interface UseBoardShortcutsProps {
  handleUndo: () => void;
  handleRedo: () => void;
  setNodes: Dispatch<SetStateAction<BoardNodeData[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  selection: SelectionItem[];
  clearSelection: () => void;
  nodes: BoardNodeData[];
  showToast: (msg: string) => void;
  zoom: number;
}

const useBoardShortcuts = ({
  handleUndo,
  handleRedo,
  setNodes,
  setEdges,
  selection,
  clearSelection,
  nodes,
  showToast,
  zoom,
}: UseBoardShortcutsProps) => {
  // Delete selected
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selection.length) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const nodeIds = selection
          .filter((s) => s.type === "node")
          .map((s) => s.id);
        const edgeIds = selection
          .filter((s) => s.type === "edge")
          .map((s) => s.id);
        setNodes((nodes) => nodes.filter((n) => !nodeIds.includes(n.id)));
        setEdges((edges) =>
          edges.filter(
            (e) =>
              !edgeIds.includes(e.id) &&
              !nodeIds.includes(e.source) &&
              !nodeIds.includes(e.target)
          )
        );
        clearSelection();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selection, setNodes, setEdges, clearSelection]);

  // Undo/Redo, align, etc
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === "y" ||
          (e.shiftKey && e.key.toLowerCase() === "z"))
      ) {
        e.preventDefault();
        handleRedo();
      }
      // Group Align
      const selectedNodes = nodes.filter((n) =>
        selection.some((s) => s.type === "node" && s.id === n.id)
      );
      if (selectedNodes.length > 1) {
        if (e.altKey && e.key.toLowerCase() === "l") {
          e.preventDefault();
          const minX = Math.min(...selectedNodes.map((n) => n.x));
          setNodes((nodes) =>
            nodes.map((n) =>
              selection.some((s) => s.type === "node" && s.id === n.id)
                ? { ...n, x: minX }
                : n
            )
          );
          showToast("Aligned left");
        }
        if (e.altKey && e.key.toLowerCase() === "c") {
          e.preventDefault();
          const minX = Math.min(...selectedNodes.map((n) => n.x));
          const maxX = Math.max(...selectedNodes.map((n) => n.x));
          const centerX = (minX + maxX) / 2;
          setNodes((nodes) =>
            nodes.map((n) =>
              selection.some((s) => s.type === "node" && s.id === n.id)
                ? { ...n, x: centerX }
                : n
            )
          );
          showToast("Aligned center");
        }
        if (e.altKey && e.key.toLowerCase() === "r") {
          e.preventDefault();
          const maxX = Math.max(...selectedNodes.map((n) => n.x));
          setNodes((nodes) =>
            nodes.map((n) =>
              selection.some((s) => s.type === "node" && s.id === n.id)
                ? { ...n, x: maxX }
                : n
            )
          );
          showToast("Aligned right");
        }
        if (e.altKey && e.key.toLowerCase() === "t") {
          e.preventDefault();
          const minY = Math.min(...selectedNodes.map((n) => n.y));
          setNodes((nodes) =>
            nodes.map((n) =>
              selection.some((s) => s.type === "node" && s.id === n.id)
                ? { ...n, y: minY }
                : n
            )
          );
          showToast("Aligned top");
        }
        if (e.altKey && e.key === "m") {
          e.preventDefault();
          const minY = Math.min(...selectedNodes.map((n) => n.y));
          const maxY = Math.max(...selectedNodes.map((n) => n.y));
          const centerY = (minY + maxY) / 2;
          setNodes((nodes) =>
            nodes.map((n) =>
              selection.some((s) => s.type === "node" && s.id === n.id)
                ? { ...n, y: centerY }
                : n
            )
          );
          showToast("Aligned middle");
        }
        if (e.altKey && e.key.toLowerCase() === "b") {
          e.preventDefault();
          const maxY = Math.max(...selectedNodes.map((n) => n.y));
          setNodes((nodes) =>
            nodes.map((n) =>
              selection.some((s) => s.type === "node" && s.id === n.id)
                ? { ...n, y: maxY }
                : n
            )
          );
          showToast("Aligned bottom");
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nodes, selection, setNodes, handleUndo, handleRedo, showToast]);

  // Arrow keys
  useEffect(() => {
    const handleArrowMove = (e: KeyboardEvent) => {
      if (!selection.length) return;
      let dx = 0,
        dy = 0;
      if (e.key === "ArrowLeft") dx = -10;
      if (e.key === "ArrowRight") dx = 10;
      if (e.key === "ArrowUp") dy = -10;
      if (e.key === "ArrowDown") dy = 10;
      if (dx !== 0 || dy !== 0) {
        e.preventDefault();
        setNodes((nodes) =>
          nodes.map((n) =>
            selection.some((s) => s.type === "node" && s.id === n.id)
              ? { ...n, x: n.x + dx / zoom, y: n.y + dy / zoom }
              : n
          )
        );
      }
    };
    window.addEventListener("keydown", handleArrowMove);
    return () => window.removeEventListener("keydown", handleArrowMove);
  }, [selection, zoom, setNodes]);

  // Escape (clear selection)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selection.length > 0) {
          clearSelection();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selection, clearSelection]);

  // TODO: Copy/paste shortcuts can be added here as well
};

export default useBoardShortcuts;
