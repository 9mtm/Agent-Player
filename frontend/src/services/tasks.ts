import api from "./api";

// Types for tasks
export const TaskStatus = {
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskPriority = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  agent_id?: number;
  board_id?: number;
  task_metadata?: Record<string, any>;
  execution_details?: Record<string, any>;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  estimated_duration?: number;
  actual_duration?: number;
  created_at: string;
  updated_at: string;
  user_id: number;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: TaskPriority;
  agent_id?: number;
  board_id?: number;
  task_metadata?: Record<string, any>;
  estimated_duration?: number;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  status?: TaskStatus;
  progress?: number;
  execution_details?: Record<string, any>;
  error_message?: string;
}

export interface TaskListParams {
  skip?: number;
  limit?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  agent_id?: number;
  board_id?: number;
}

export interface TaskListResponse {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface TaskExecution {
  task_id: number;
  execution_id: string;
  status: TaskStatus;
  progress: number;
  result?: any;
  error?: string;
}

// Tasks Service - ALL CODE IN ENGLISH
class TasksService {
  // Get list of tasks
  async getTasks(params: TaskListParams = {}): Promise<TaskListResponse> {
    const response = await api.get("/tasks", { params });
    return response.data;
  }

  // Get task by ID
  async getTask(id: number): Promise<Task> {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  }

  // Create new task
  async createTask(taskData: CreateTaskRequest): Promise<Task> {
    const response = await api.post("/tasks", taskData);
    return response.data;
  }

  // Update task
  async updateTask(id: number, taskData: UpdateTaskRequest): Promise<Task> {
    const response = await api.put(`/tasks/${id}`, taskData);
    return response.data;
  }

  // Delete task
  async deleteTask(id: number): Promise<void> {
    await api.delete(`/tasks/${id}`);
  }

  // Execute task
  async executeTask(id: number): Promise<TaskExecution> {
    const response = await api.post(`/tasks/${id}/execute`);
    return response.data;
  }

  // Cancel task
  async cancelTask(id: number): Promise<Task> {
    const response = await api.post(`/tasks/${id}/cancel`);
    return response.data;
  }

  // Update task status
  async updateTaskStatus(id: number, status: TaskStatus): Promise<Task> {
    const response = await api.patch(`/tasks/${id}/status`, { status });
    return response.data;
  }

  // Update task progress
  async updateTaskProgress(id: number, progress: number): Promise<Task> {
    const response = await api.patch(`/tasks/${id}/progress`, {
      progress,
    });
    return response.data;
  }

  // Get task execution history
  async getTaskHistory(id: number): Promise<any[]> {
    const response = await api.get(`/tasks/${id}/history`);
    return response.data;
  }

  // Get task logs
  async getTaskLogs(id: number): Promise<string[]> {
    const response = await api.get(`/tasks/${id}/logs`);
    return response.data;
  }

  // Search tasks
  async searchTasks(
    query: string,
    params: TaskListParams = {}
  ): Promise<TaskListResponse> {
    const response = await api.get("/tasks/search", {
      params: { ...params, q: query },
    });
    return response.data;
  }

  // Task statistics
  async getTasksStats(): Promise<any> {
    const response = await api.get("/tasks/stats");
    return response.data;
  }

  // Export tasks
  async exportTasks(format: "json" | "csv" = "json"): Promise<any> {
    const response = await api.get(`/tasks/export?format=${format}`);
    return response.data;
  }

  // Get tasks by status
  async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
    const response = await api.get(`/tasks/by-status/${status}`);
    return response.data;
  }

  // Get overdue tasks
  async getOverdueTasks(): Promise<Task[]> {
    const response = await api.get("/tasks/overdue");
    return response.data;
  }

  // Duplicate task
  async duplicateTask(id: number, newTitle?: string): Promise<Task> {
    const response = await api.post(`/tasks/${id}/duplicate`, {
      title: newTitle,
    });
    return response.data;
  }
}

export default new TasksService();
