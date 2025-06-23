import { useRef } from "react";

export interface BoardState {
  nodes: any[];
  edges: any[];
  zoom: number;
}

class BoardHistory {
  private stack: BoardState[] = [];
  private pointer = -1;
  private max = 50;

  push(state: BoardState) {
    if (this.pointer < this.stack.length - 1) {
      this.stack = this.stack.slice(0, this.pointer + 1);
    }
    this.stack.push(JSON.parse(JSON.stringify(state)));
    if (this.stack.length > this.max) this.stack.shift();
    this.pointer = this.stack.length - 1;
  }

  undo(): BoardState | null {
    if (this.pointer > 0) {
      this.pointer--;
      return JSON.parse(JSON.stringify(this.stack[this.pointer]));
    }
    return null;
  }

  redo(): BoardState | null {
    if (this.pointer < this.stack.length - 1) {
      this.pointer++;
      return JSON.parse(JSON.stringify(this.stack[this.pointer]));
    }
    return null;
  }

  canUndo() {
    return this.pointer > 0;
  }
  canRedo() {
    return this.pointer < this.stack.length - 1;
  }
}

const useBoardHistory = () => {
  const historyRef = useRef<BoardHistory>();
  if (!historyRef.current) {
    historyRef.current = new BoardHistory();
  }

  const push = (state: BoardState) => {
    historyRef.current!.push(state);
  };
  const undo = () => historyRef.current!.undo();
  const redo = () => historyRef.current!.redo();
  const canUndo = () => historyRef.current!.canUndo();
  const canRedo = () => historyRef.current!.canRedo();

  return { push, undo, redo, canUndo, canRedo };
};

export default useBoardHistory;
