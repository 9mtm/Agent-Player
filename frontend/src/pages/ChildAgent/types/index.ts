export interface ChildAgent {
  id: number;
  name: string;
  status: "active" | "idle" | "disabled";
  description: string;
}

export interface UseChildAgentsReturn {
  agents: ChildAgent[];
  addAgent: () => void;
  removeAgent: (id: number) => void;
  updateAgent: (id: number, updates: Partial<ChildAgent>) => void;
}
