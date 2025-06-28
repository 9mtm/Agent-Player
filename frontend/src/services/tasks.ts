import api from "./api";

// Types for tasks - Updated to match backend API
export const TaskStatus = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  UNDER_REVIEW: "under_review",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  ON_HOLD: "on_hold",
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

  // Assignment
  assigned_to_user_id?: number;
  assigned_to_agent_id?: number;
  created_by_user_id: number;

  // Categorization
  category?: string;
  tags: string[];

  // Timing
  due_date?: string;
  estimated_duration?: number;
  actual_duration?: number;
  started_at?: string;
  completed_at?: string;

  // Task data
  task_data?: Record<string, unknown>;
  requirements?: Record<string, unknown>;
  deliverables?: Record<string, unknown>;

  // Relationships
  parent_task_id?: number;
  dependencies: number[];

  // Collaboration
  is_collaborative: boolean;
  team_id?: number;

  created_at: string;
  updated_at: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: TaskPriority;
  agent_id?: number;
  board_id?: number;
  task_metadata?: Record<string, unknown>;
  estimated_duration?: number;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  status?: TaskStatus;
  progress?: number;
  execution_details?: Record<string, unknown>;
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
  result?: unknown;
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
  async getTaskHistory(id: number): Promise<unknown[]> {
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
  async getTasksStats(): Promise<unknown> {
    const response = await api.get("/tasks/stats");
    return response.data;
  }

  // Export tasks
  async exportTasks(format: "json" | "csv" = "json"): Promise<unknown> {
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

  // NEW ENDPOINTS - Updated to match backend API

  // Comments
  async addComment(taskId: number, comment: string): Promise<unknown> {
    const response = await api.post(`/tasks/${taskId}/comments`, { comment });
    return response.data;
  }

  async getComments(
    taskId: number,
    params?: { skip?: number; limit?: number }
  ): Promise<unknown> {
    const response = await api.get(`/tasks/${taskId}/comments`, { params });
    return response.data;
  }

  // Task Assignment
  async assignTask(
    taskId: number,
    assignmentData: {
      assigned_to_user_id?: number;
      assigned_to_agent_id?: number;
      due_date?: string;
      priority?: TaskPriority;
    }
  ): Promise<Task> {
    const response = await api.post(`/tasks/${taskId}/assign`, assignmentData);
    return response.data;
  }

  // Time Logging
  async logTime(
    taskId: number,
    timeData: {
      hours: number;
      description?: string;
      log_date?: string;
    }
  ): Promise<unknown> {
    const response = await api.post(`/tasks/${taskId}/time-logs`, timeData);
    return response.data;
  }

  async getTimeLogs(
    taskId: number,
    params?: { skip?: number; limit?: number }
  ): Promise<unknown> {
    const response = await api.get(`/tasks/${taskId}/time-logs`, { params });
    return response.data;
  }

  // Analytics
  async getAnalytics(
    timeframe?: string,
    filters?: Record<string, unknown>
  ): Promise<unknown> {
    const params = { timeframe, ...filters };
    const response = await api.get("/tasks/analytics", { params });
    return response.data;
  }

  // User's Tasks
  async getMyTasks(params?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    due_date_filter?: "overdue" | "today" | "this_week" | "this_month";
    skip?: number;
    limit?: number;
  }): Promise<unknown> {
    const response = await api.get("/tasks/my-tasks", { params });
    return response.data;
  }

  // Task Dependencies
  async addDependency(taskId: number, dependsOnTaskId: number): Promise<void> {
    await api.post(`/tasks/${taskId}/dependencies`, {
      depends_on_task_id: dependsOnTaskId,
    });
  }

  async removeDependency(taskId: number, dependencyId: number): Promise<void> {
    await api.delete(`/tasks/${taskId}/dependencies/${dependencyId}`);
  }

  // Task Templates
  async createTemplate(
    taskId: number,
    templateData: {
      name: string;
      description?: string;
      category?: string;
    }
  ): Promise<unknown> {
    const response = await api.post(`/tasks/${taskId}/template`, templateData);
    return response.data;
  }

  async getTemplates(category?: string): Promise<unknown> {
    const params = category ? { category } : {};
    const response = await api.get("/tasks/templates", { params });
    return response.data;
  }

  async createFromTemplate(
    templateId: number,
    taskData: {
      title: string;
      assigned_to_user_id?: number;
      assigned_to_agent_id?: number;
      due_date?: string;
    }
  ): Promise<Task> {
    const response = await api.post(
      `/tasks/templates/${templateId}/create`,
      taskData
    );
    return response.data;
  }
}

// Create and export a single instance
const tasksService = new TasksService();
export default tasksService;

// Also export the class for type checking if needed
export { TasksService as TasksServiceClass };
