export type CategoryType = "agents" | "workflows" | "tasks" | "users";

export interface Category {
  id: CategoryType;
  label: string;
  icon: string;
}

export interface TopItem {
  id: number;
  name: string;
  score: number;
  usage: string;
  trend: string;
  description: string;
}

export interface TopData {
  agents: TopItem[];
  workflows: TopItem[];
  tasks: TopItem[];
  users: TopItem[];
}

export interface PerformanceMetrics {
  averageScore: number;
  growthRate: string;
  totalItems: number;
  availability: string;
}
