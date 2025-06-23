import React from 'react';
import { useTasks } from './hooks';
import { 
  TaskHeader, 
  TaskForm, 
  TaskList, 
  LoadingOverlay 
} from './components';
import { 
  pageContainerStyle, 
  pageContentStyle 
} from './utils/styles';

interface TasksPageProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  showRelativeDates?: boolean;
  compactMode?: boolean;
}

const TasksPage: React.FC<TasksPageProps> = ({
  autoRefresh = false,
  refreshInterval = 30000,
  showRelativeDates = true,
  compactMode = false
}) => {
  const {
    // State
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
    createTask,
    toggleTaskStatus,
    updateTaskProgress,
    deleteTask,
    refreshTasks,
    
    // Filter and search actions
    setFilter,
    setSearchTerm,
    setSortBy,
    setSortOrder,
    clearError
  } = useTasks({
    autoRefresh,
    refreshInterval
  });

  // Show full loading overlay only on initial load
  const showLoadingOverlay = loading && filteredTasks.length === 0;

  return (
    <>
      <div style={pageContainerStyle}>
        <div style={pageContentStyle}>
          {/* Header with stats and filters */}
          <TaskHeader
            taskStats={taskStats}
            error={error}
            filter={filter}
            searchTerm={searchTerm}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onRefresh={refreshTasks}
            onFilterChange={setFilter}
            onSearchChange={setSearchTerm}
            onSortChange={setSortBy}
            onSortOrderChange={setSortOrder}
            onClearError={clearError}
          />

          {/* Task creation form */}
          <TaskForm
            onSubmit={createTask}
            loading={loading}
          />

          {/* Task list */}
          <TaskList
            tasks={filteredTasks}
            loading={loading}
            filter={filter}
            searchTerm={searchTerm}
            onToggleStatus={toggleTaskStatus}
            onDelete={deleteTask}
            onUpdateProgress={updateTaskProgress}
            showRelativeDates={showRelativeDates}
            compact={compactMode}
          />
        </div>
      </div>

      {/* Loading overlay for initial load */}
      <LoadingOverlay
        show={showLoadingOverlay}
        message="Loading your tasks..."
      />
    </>
  );
};

export default TasksPage; 