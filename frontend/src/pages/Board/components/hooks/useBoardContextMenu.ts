import { useState } from "react";

export type ContextMenuType = "node" | "edge" | "board";
export interface ContextMenuState {
  x: number;
  y: number;
  type: ContextMenuType;
  id?: string;
}

const useBoardContextMenu = () => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const openContextMenu = (
    x: number,
    y: number,
    type: ContextMenuType,
    id?: string
  ) => {
    setContextMenu({ x, y, type, id });
  };
  const closeContextMenu = () => setContextMenu(null);

  return {
    contextMenu,
    openContextMenu,
    closeContextMenu,
    setContextMenu, // for advanced use
  };
};

export default useBoardContextMenu;
