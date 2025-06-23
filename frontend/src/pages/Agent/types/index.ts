// Re-export types from services
export type { Agent, CreateAgentRequest } from "../../../services";

// Agent page specific interfaces
export interface AgentState {
  agents: Agent[];
  selectedAgent: string | null;
  loading: boolean;
  error: string | null;
  sidebarOpen: boolean;
}

// Agent actions interface
export interface AgentActions {
  // Agent CRUD operations
  loadAgents: () => Promise<void>;
  createNewAgent: () => Promise<void>;
  deleteAgent: (agentId: number) => Promise<void>;
  duplicateAgent: (agentId: number) => Promise<void>;
  toggleAgentStatus: (agentId: number, isActive: boolean) => Promise<void>;

  // UI actions
  setSelectedAgent: (agentId: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setError: (error: string | null) => void;
}

// Agent component props
export interface AgentSidebarProps {
  agents: Agent[];
  selectedAgent: string | null;
  loading: boolean;
  error: string | null;
  sidebarOpen: boolean;
  onSelectAgent: (agentId: string | null) => void;
  onCreateAgent: () => void;
  onRefresh: () => void;
  onToggleSidebar: () => void;
  onToggleStatus: (agentId: number, isActive: boolean) => void;
  onDuplicate: (agentId: number) => void;
  onDelete: (agentId: number) => void;
}

export interface AgentMainAreaProps {
  selectedAgent: string | null;
  agents: Agent[];
  sidebarOpen: boolean;
  onCreateAgent: () => void;
  onOpenSidebar: () => void;
  boardRef: React.RefObject<any>;
}

export interface AgentHeaderProps {
  error: string | null;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onCreate: () => void;
  onRefresh: () => void;
}

export interface AgentActionsProps {
  selectedAgent: string | null;
  agents: Agent[];
  onToggleStatus: (agentId: number, isActive: boolean) => void;
  onDuplicate: (agentId: number) => void;
  onDelete: (agentId: number) => void;
}

export interface QuickActionsProps {
  selectedAgent: string | null;
  boardRef: React.RefObject<any>;
}

// Utility interfaces
export interface AgentFormData {
  name: string;
  description: string;
  model_provider: string;
  model_name: string;
  system_prompt: string;
  tools_enabled: boolean;
}

// Error handling
export interface AgentError {
  message: string;
  type: "network" | "validation" | "server" | "unknown";
}

// Loading states
export type AgentLoadingState =
  | "idle"
  | "loading"
  | "creating"
  | "deleting"
  | "updating";

// Agent status
export type AgentStatus = "active" | "inactive" | "error" | "testing";
