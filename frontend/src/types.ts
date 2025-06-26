export interface Agent {
  id: number;
  name: string;
  description: string;
  agent_type: "main" | "child";
  is_active: boolean;
  parent_agent_id?: number;
  updated_at: string;
  version?: string;
}

export interface AgentData {
  name: string;
  color: string;
  status: "active" | "idle" | "busy";
  tasks?: number;
  description: string;
  uptime?: string;
  responseTime?: string;
  connectedChilds?: number;
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
  type?: string;
  connectedTo?: number[];
  performance?: string;
  currentTask?: string;
}

export interface NetworkConnection {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  active: boolean;
  name: string;
  strength: string;
}

export interface ActivityItem {
  time: string;
  action: string;
  type: string;
  color: string;
}
