import React from 'react';
import { TaskStatus } from '../../../services';
import { 
  headerStyle, 
  titleSectionStyle, 
  titleStyle, 
  subtitleStyle, 
  refreshButtonStyle,
  filtersContainerStyle,
  filterButtonsStyle,
  filterButtonStyle,
  searchInputStyle,
  statsContainerStyle,
  statItemStyle,
  statValueStyle,
  statLabelStyle,
  errorMessageStyle
} from '../utils/styles';
import { FILTER_OPTIONS, SORT_OPTIONS } from '../utils/constants';

interface TaskHeaderProps {
  // Data
  taskStats: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
  error: string | null;
  
  // Filter state
  filter: 'all' | TaskStatus;
  searchTerm: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  
  // Actions
  onRefresh: () => void;
  onFilterChange: (filter: 'all' | TaskStatus) => void;
  onSearchChange: (term: string) => void;
  onSortChange: (sortBy: string) => void;
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  onClearError: () => void;
}

export const TaskHeader: React.FC<TaskHeaderProps> = ({
  taskStats,
  error,
  filter,
  searchTerm,
  sortBy,
  sortOrder,
  onRefresh,
  onFilterChange,
  onSearchChange,
  onSortChange,
  onSortOrderChange,
  onClearError
}) => {
  return (
    <div>
      {/* Main Header */}
      <div style={headerStyle}>
        <div style={titleSectionStyle}>
          <h2 style={titleStyle}>Tasks</h2>
          <p style={subtitleStyle}>
            Manage your tasks and workflow items
          </p>
          {error && (
            <div style={errorMessageStyle}>
              {error}
              <button 
                onClick={onClearError}
                style={{
                  marginLeft: '8px',
                  padding: '2px 6px',
                  fontSize: '12px',
                  background: 'transparent',
                  border: '1px solid #ff5722',
                  borderRadius: '4px',
                  color: '#ff5722',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>
        <button 
          onClick={onRefresh}
          style={refreshButtonStyle}
          title="Refresh tasks"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Statistics */}
      <div style={statsContainerStyle}>
        <div style={statItemStyle}>
          <div style={statValueStyle}>{taskStats.total}</div>
          <div style={statLabelStyle}>Total</div>
        </div>
        <div style={statItemStyle}>
          <div style={statValueStyle}>{taskStats.pending}</div>
          <div style={statLabelStyle}>Pending</div>
        </div>
        <div style={statItemStyle}>
          <div style={statValueStyle}>{taskStats.running}</div>
          <div style={statLabelStyle}>Running</div>
        </div>
        <div style={statItemStyle}>
          <div style={statValueStyle}>{taskStats.completed}</div>
          <div style={statLabelStyle}>Completed</div>
        </div>
        <div style={statItemStyle}>
          <div style={statValueStyle}>{taskStats.failed}</div>
          <div style={statLabelStyle}>Failed</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div style={filtersContainerStyle}>
        {/* Filter Buttons */}
        <div style={filterButtonsStyle}>
          {FILTER_OPTIONS.map(status => (
            <button
              key={status}
              onClick={() => onFilterChange(status)}
              style={filterButtonStyle(filter === status)}
              title={`Filter by ${status === 'all' ? 'all tasks' : status + ' tasks'}`}
            >
              {status === 'all' ? 'All' : status}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tasks..."
          style={searchInputStyle}
        />

        {/* Sort Controls */}
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          style={{
            ...searchInputStyle,
            minWidth: '140px'
          }}
          title="Sort by"
        >
          {SORT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            backgroundColor: '#fff',
            cursor: 'pointer',
            fontSize: '14px',
            minWidth: '60px'
          }}
          title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>
    </div>
  );
}; 