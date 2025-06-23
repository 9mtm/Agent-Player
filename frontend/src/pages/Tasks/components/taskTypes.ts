// Task types definition
export interface Task {
  id: number;
  title: string;
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
}

export interface TaskNode {
  id: string;
  x: number;
  y: number;
  label: string;
  type: string;
}
