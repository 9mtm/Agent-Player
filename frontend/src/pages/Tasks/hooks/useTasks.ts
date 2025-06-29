import { useState, useEffect } from "react";
import { tasksService } from "../../../services";
import { TaskStatus, TaskPriority } from "../../../services";
import type { Task, CreateTaskRequest } from "../../../services";
import {
  parseApiError,
  calculateTaskStats,
  sortTasks,
  filterTasks,
} from "../utils/constants";

export interface UseTasksProps {
  initialFilter?: "all" | TaskStatus;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseTasksReturn {
  // State
  tasks: Task[];
  loading: boolean;
  error: string | null;
  filter: "all" | TaskStatus;
  searchTerm: string;
  sortBy: string;
  sortOrder: "asc" | "desc";

  // Computed values
  filteredTasks: Task[];
  taskStats: {
    total: number;
    todo: number;
    in_progress: number;
    under_review: number;
    completed: number;
    on_hold: number;
    cancelled: number;
  };

  // Actions
  loadTasks: () => Promise<void>;
  createTask: (
    title: string,
    description?: string,
    priority?: TaskPriority
  ) => Promise<void>;
  updateTaskStatus: (taskId: number, status: TaskStatus) => Promise<void>;
  updateTaskProgress: (taskId: number, progress: number) => Promise<void>;
  deleteTask: (taskId: number) => Promise<void>;
  toggleTaskStatus: (
    taskId: number,
    currentStatus: TaskStatus
  ) => Promise<void>;

  // Filter and search actions
  setFilter: (filter: "all" | TaskStatus) => void;
  setSearchTerm: (term: string) => void;
  setSortBy: (sortBy: string) => void;
  setSortOrder: (order: "asc" | "desc") => void;
  clearError: () => void;
  refreshTasks: () => Promise<void>;
}

export const useTasks = (props: UseTasksProps = {}): UseTasksReturn => {
  const {
    initialFilter = "all",
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
  } = props;

  // State management
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | TaskStatus>(initialFilter);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Load tasks function
  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = filter !== "all" ? { status: filter } : {};
      const response = await tasksService.getTasks(params);
      setTasks(response.tasks || []);
    } catch (err: unknown) {
      const errorMessage = parseApiError(err);
      setError(errorMessage);
      console.error("Error loading tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  // Create new task
  const createTask = async (
    title: string,
    description?: string,
    priority: TaskPriority = TaskPriority.MEDIUM
  ) => {
    try {
      if (!title.trim()) {
        throw new Error("Task title is required");
      }

      setError(null);
      const newTaskData: CreateTaskRequest = {
        title: title.trim(),
        description: description?.trim(),
        priority,
      };

      const newTask = await tasksService.createTask(newTaskData);
      setTasks((prev) => [newTask, ...prev]);
    } catch (err: unknown) {
      const errorMessage = parseApiError(err);
      setError(errorMessage);
      console.error("Error creating task:", err);
      throw err; // Re-throw to handle in component if needed
    }
  };

  // Update task status
  const updateTaskStatus = async (taskId: number, status: TaskStatus) => {
    try {
      setError(null);
      const updatedTask = await tasksService.updateTaskStatus(taskId, status);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
    } catch (err: unknown) {
      const errorMessage = parseApiError(err);
      setError(errorMessage);
      console.error("Error updating task status:", err);
      throw err;
    }
  };

  // Update task progress
  const updateTaskProgress = async (taskId: number, progress: number) => {
    try {
      setError(null);
      const updatedTask = await tasksService.updateTask(taskId, { progress });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
    } catch (err: unknown) {
      const errorMessage = parseApiError(err);
      setError(errorMessage);
      console.error("Error updating task progress:", err);
      throw err;
    }
  };

  // Delete task
  const deleteTask = async (taskId: number) => {
    try {
      setError(null);
      await tasksService.deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err: unknown) {
      const errorMessage = parseApiError(err);
      setError(errorMessage);
      console.error("Error deleting task:", err);
      throw err;
    }
  };

  // Toggle task completion status
  const toggleTaskStatus = async (
    taskId: number,
    currentStatus: TaskStatus
  ) => {
    const newStatus =
      currentStatus === TaskStatus.COMPLETED
        ? TaskStatus.TODO
        : TaskStatus.COMPLETED;
    await updateTaskStatus(taskId, newStatus);
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Refresh tasks (alias for loadTasks)
  const refreshTasks = loadTasks;

  // Computed values
  const filteredTasks = sortTasks(
    filterTasks(tasks, filter, searchTerm),
    sortBy,
    sortOrder
  );

  const taskStats = calculateTaskStats(tasks);

  // Effects
  useEffect(() => {
    loadTasks();
  }, [filter]); // Reload when filter changes

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadTasks();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Update document title with task count
  useEffect(() => {
    const activeCount = taskStats.todo + taskStats.in_progress;
    const title = activeCount > 0 ? `Tasks (${activeCount})` : "Tasks";

    document.title = title;

    return () => {
      document.title = "Dpro AI Agent";
    };
  }, [taskStats]);

  return {
    // State
    tasks,
    loading,
    error,
    filter,
    searchTerm,
    sortBy,
    sortOrder,

    // Computed values
    filteredTasks,
    taskStats,

    // Actions
    loadTasks,
    createTask,
    updateTaskStatus,
    updateTaskProgress,
    deleteTask,
    toggleTaskStatus,

    // Filter and search actions
    setFilter,
    setSearchTerm,
    setSortBy,
    setSortOrder,
    clearError,
    refreshTasks,
  };
};
