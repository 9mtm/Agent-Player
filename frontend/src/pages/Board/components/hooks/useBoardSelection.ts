import { useState } from "react";

export type SelectionItem = { type: "node" | "edge"; id: string };

const useBoardSelection = () => {
  const [selection, setSelection] = useState<SelectionItem[]>([]);

  const isSelected = (type: "node" | "edge", id: string) =>
    selection.some((s) => s.type === type && s.id === id);

  const select = (item: SelectionItem) => {
    setSelection((sel) =>
      sel.some((s) => s.type === item.type && s.id === item.id)
        ? sel
        : [...sel, item]
    );
  };

  const deselect = (item: SelectionItem) => {
    setSelection((sel) =>
      sel.filter((s) => !(s.type === item.type && s.id === item.id))
    );
  };

  const toggle = (item: SelectionItem) => {
    setSelection((sel) =>
      sel.some((s) => s.type === item.type && s.id === item.id)
        ? sel.filter((s) => !(s.type === item.type && s.id === item.id))
        : [...sel, item]
    );
  };

  const selectAll = (items: SelectionItem[]) => {
    setSelection(items);
  };

  const clearSelection = () => setSelection([]);

  return {
    selection,
    setSelection,
    isSelected,
    select,
    deselect,
    toggle,
    selectAll,
    clearSelection,
  };
};

export default useBoardSelection;
