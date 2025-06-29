// Re-export types from services
export type {
  Task,
  CreateTaskRequest,
  TaskStatus,
  TaskPriority,
} from "../../../services";

// Tasks page specific interfaces
export interface TasksState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  filter: "all" | TaskStatus;
  searchTerm: string;
  sortBy: TaskSortField;
  sortOrder: "asc" | "desc";
}

// Task actions interface
export interface TasksActions {
  // Task CRUD operations
  loadTasks: () => Promise<void>;
  createTask: (taskData: CreateTaskRequest) => Promise<void>;
  deleteTask: (taskId: number) => Promise<void>;
  toggleTaskStatus: (
    taskId: number,
    currentStatus: TaskStatus
  ) => Promise<void>;
  updateTaskProgress: (taskId: number, progress: number) => Promise<void>;

  // UI actions
  setFilter: (filter: "all" | TaskStatus) => void;
  setSearchTerm: (term: string) => void;
  setSortBy: (field: TaskSortField) => void;
  setSortOrder: (order: "asc" | "desc") => void;
  clearError: () => void;
}

// Component props interfaces
export interface TasksHeaderProps {
  error: string | null;
  onRefresh: () => void;
  onClearError: () => void;
}

export interface TasksFiltersProps {
  filter: "all" | TaskStatus;
  onFilterChange: (filter: "all" | TaskStatus) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortBy: TaskSortField;
  sortOrder: "asc" | "desc";
  onSortChange: (field: TaskSortField) => void;
  onSortOrderChange: (order: "asc" | "desc") => void;
}

export interface TaskFormProps {
  onSubmit: (taskData: CreateTaskRequest) => void;
  loading?: boolean;
}

export interface TaskListProps {
  tasks: Task[];
  loading: boolean;
  filter: "all" | TaskStatus;
  onToggleStatus: (taskId: number, currentStatus: TaskStatus) => void;
  onDelete: (taskId: number) => void;
  onUpdateProgress?: (taskId: number, progress: number) => void;
}

export interface TaskItemProps {
  task: Task;
  onToggleStatus: (taskId: number, currentStatus: TaskStatus) => void;
  onDelete: (taskId: number) => void;
  onUpdateProgress?: (taskId: number, progress: number) => void;
}

export interface TaskStatsProps {
  tasks: Task[];
}

// Utility interfaces
export interface TaskFormData {
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string;
}

export interface TaskStats {
  total: number;
  todo: number;
  in_progress: number;
  under_review: number;
  completed: number;
  on_hold: number;
  cancelled: number;
}

// Filter and sort types
export type TaskFilterType = "all" | TaskStatus;
export type TaskSortField =
  | "title"
  | "created_at"
  | "updated_at"
  | "priority"
  | "status"
  | "progress";

// Task display helpers
export interface TaskStatusConfig {
  label: string;
  color: string;
  backgroundColor: string;
  icon: string;
}

export interface TaskPriorityConfig {
  label: string;
  color: string;
  icon: string;
  weight: number;
}

// Error handling
export interface TaskError {
  message: string;
  type: "network" | "validation" | "server" | "unknown";
  taskId?: number;
}

// Loading states
export type TaskLoadingState =
  | "idle"
  | "loading"
  | "creating"
  | "updating"
  | "deleting";

// Progress tracking
export interface TaskProgress {
  taskId: number;
  progress: number;
  stage: string;
  lastUpdated: string;
}

// Task analytics
export interface TaskAnalytics {
  completionRate: number;
  averageTime: number;
  priorityDistribution: Record<TaskPriority, number>;
  statusDistribution: Record<TaskStatus, number>;
}

// Search and pagination
export interface TaskSearchParams {
  query?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  page?: number;
  limit?: number;
  sortBy?: TaskSortField;
  sortOrder?: "asc" | "desc";
}
