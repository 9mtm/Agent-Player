export interface DashboardStats {
  system: {
    uptime: string;
    cpuUsage: number;
    memoryUsage: number;
    apiCalls: number;
    childAgentsActive: number;
  };
  notifications: {
    total: number;
    unread: number;
  };
  agents: {
    total: number;
    active: number;
    training: number;
  };
  conversations: {
    total: number;
    active: number;
    completed: number;
  };
  tasks: {
    total: number;
    pending: number;
    completed: number;
  };
  chats: {
    total: number;
    today: number;
    thisWeek: number;
  };
  workflows: {
    total: number;
    running: number;
    paused: number;
  };
}

export interface DashboardConfig {
  showQuickActions: boolean;
  showSystemStats: boolean;
  showRecentActivity: boolean;
  showPerformanceMetrics: boolean;
  defaultView: "overview" | "agents" | "tasks" | "analytics" | "network";
}

export type ConnectionStatus = "online" | "offline" | "checking";
export type ActiveTab = "overview" | "analytics" | "network" | "settings";

export interface NetworkConnection {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  active: boolean;
  name: string;
  strength: "strong" | "medium" | "weak" | "bidirectional" | "direct";
}

export interface AgentData {
  name: string;
  color: string;
  status: "active" | "busy" | "idle";
  tasks?: number;
  type?: string;
  connectedTo?: number[];
  description?: string;
  uptime?: string;
  responseTime?: string;
  connectedChilds?: number;
  performance?: string;
  currentTask?: string;
  // Extended properties for detailed view
  version?: string;
  lastUpdate?: string;
  cpuUsage?: number;
  memoryUsage?: number;
  apiCalls?: number;
  successRate?: number;
  totalOperations?: number;
  errors24h?: number;
  warnings24h?: number;
  dataProcessed?: string;
  avgResponseTime?: string;
  peakResponseTime?: string;
  activeConnections?: number;
  queueSize?: number;
  throughput?: string;
  securityLevel?: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  permissions?: string[];
  protocols?: string[];
  dependencies?: string[];
}

export interface ActivityItem {
  time: string;
  action: string;
  type: "message" | "working" | "sync" | "alert" | "success" | "idle";
  color: string;
}

export interface QuickAction {
  icon: string;
  label: string;
  color: string;
  path: string;
}
