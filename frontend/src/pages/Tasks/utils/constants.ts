import { TaskStatus, TaskPriority } from "../../../services";
import type { TaskStatusConfig, TaskPriorityConfig } from "../types";

// Task status configurations
export const TASK_STATUS_CONFIG: Record<TaskStatus, TaskStatusConfig> = {
  [TaskStatus.TODO]: {
    label: "To Do",
    color: "#fff",
    backgroundColor: "#ffa726",
    icon: "⏳",
  },
  [TaskStatus.IN_PROGRESS]: {
    label: "In Progress",
    color: "#fff",
    backgroundColor: "#42a5f5",
    icon: "▶️",
  },
  [TaskStatus.UNDER_REVIEW]: {
    label: "Under Review",
    color: "#fff",
    backgroundColor: "#ab47bc",
    icon: "👀",
  },
  [TaskStatus.COMPLETED]: {
    label: "Completed",
    color: "#fff",
    backgroundColor: "#66bb6a",
    icon: "✅",
  },
  [TaskStatus.CANCELLED]: {
    label: "Cancelled",
    color: "#fff",
    backgroundColor: "#bdbdbd",
    icon: "⏹️",
  },
  [TaskStatus.ON_HOLD]: {
    label: "On Hold",
    color: "#fff",
    backgroundColor: "#ef5350",
    icon: "⏸️",
  },
};

// Task priority configurations
export const TASK_PRIORITY_CONFIG: Record<TaskPriority, TaskPriorityConfig> = {
  [TaskPriority.LOW]: {
    label: "Low",
    color: "#4caf50",
    icon: "🟢",
    weight: 1,
  },
  [TaskPriority.MEDIUM]: {
    label: "Medium",
    color: "#ff9800",
    icon: "🟡",
    weight: 2,
  },
  [TaskPriority.HIGH]: {
    label: "High",
    color: "#ff5722",
    icon: "🟠",
    weight: 3,
  },
  [TaskPriority.URGENT]: {
    label: "Urgent",
    color: "#f44336",
    icon: "🔴",
    weight: 4,
  },
};

// Default filter options
export const FILTER_OPTIONS: Array<"all" | TaskStatus> = [
  "all",
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.UNDER_REVIEW,
  TaskStatus.COMPLETED,
  TaskStatus.ON_HOLD,
  TaskStatus.CANCELLED,
];

// Sort options
export const SORT_OPTIONS = [
  { value: "created_at", label: "Created Date" },
  { value: "updated_at", label: "Updated Date" },
  { value: "title", label: "Title" },
  { value: "priority", label: "Priority" },
  { value: "status", label: "Status" },
  { value: "progress", label: "Progress" },
];

// Utility functions
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return (
    date.toLocaleDateString() +
    " " +
    date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
};

export const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60)
  );

  if (diffInMinutes < 1) return "just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return formatDate(dateString);
};

export const getTaskStatusBadgeStyle = (status: TaskStatus) => {
  const config = TASK_STATUS_CONFIG[status];
  return {
    background: config.backgroundColor,
    color: config.color,
    padding: "2px 8px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600",
    textTransform: "uppercase" as const,
  };
};

export const getPriorityIcon = (priority: TaskPriority): string => {
  return TASK_PRIORITY_CONFIG[priority].icon;
};

export const sortTasks = (
  tasks: any[],
  sortBy: string,
  sortOrder: "asc" | "desc"
) => {
  return [...tasks].sort((a, b) => {
    let valueA = a[sortBy];
    let valueB = b[sortBy];

    // Handle priority sorting by weight
    if (sortBy === "priority") {
      valueA = TASK_PRIORITY_CONFIG[valueA as TaskPriority].weight;
      valueB = TASK_PRIORITY_CONFIG[valueB as TaskPriority].weight;
    }

    // Handle string comparison
    if (typeof valueA === "string") {
      valueA = valueA.toLowerCase();
      valueB = valueB.toLowerCase();
    }

    // Handle date comparison
    if (sortBy.includes("_at")) {
      valueA = new Date(valueA).getTime();
      valueB = new Date(valueB).getTime();
    }

    let result = 0;
    if (valueA < valueB) result = -1;
    if (valueA > valueB) result = 1;

    return sortOrder === "desc" ? -result : result;
  });
};

export const filterTasks = (
  tasks: any[],
  filter: "all" | TaskStatus,
  searchTerm: string
) => {
  let filtered = tasks;

  // Filter by status
  if (filter !== "all") {
    filtered = filtered.filter((task) => task.status === filter);
  }

  // Filter by search term
  if (searchTerm) {
    const search = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (task) =>
        task.title.toLowerCase().includes(search) ||
        (task.description && task.description.toLowerCase().includes(search))
    );
  }

  return filtered;
};

export const calculateTaskStats = (tasks: any[]) => {
  const stats = {
    total: tasks.length,
    todo: 0,
    in_progress: 0,
    under_review: 0,
    completed: 0,
    on_hold: 0,
    cancelled: 0,
  };

  tasks.forEach((task) => {
    switch (task.status) {
      case TaskStatus.TODO:
        stats.todo++;
        break;
      case TaskStatus.IN_PROGRESS:
        stats.in_progress++;
        break;
      case TaskStatus.UNDER_REVIEW:
        stats.under_review++;
        break;
      case TaskStatus.COMPLETED:
        stats.completed++;
        break;
      case TaskStatus.ON_HOLD:
        stats.on_hold++;
        break;
      case TaskStatus.CANCELLED:
        stats.cancelled++;
        break;
    }
  });

  return stats;
};

export const parseApiError = (error: unknown): string => {
  if (error && typeof error === "object" && "response" in error) {
    const apiError = error as { response?: { data?: { detail?: string } } };
    return apiError.response?.data?.detail || "An unexpected error occurred";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred";
};
