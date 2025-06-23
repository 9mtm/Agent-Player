export interface BoardState {
  nodes: any[];
  edges: any[];
  zoom: number;
}

export class BoardHistory {
  private stack: BoardState[] = [];
  private pointer = -1;
  private max = 50;

  push(state: BoardState) {
    // Remove redo states
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
