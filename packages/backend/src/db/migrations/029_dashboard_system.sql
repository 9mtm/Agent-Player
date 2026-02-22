-- Migration 027: Customizable Dashboard System
-- Enables users to customize their dashboard with widgets
-- Extensions can register custom widgets

-- Dashboard Widgets Registry (System + Extension Widgets)
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  component_type TEXT NOT NULL, -- stats, chart, list, table, calendar, activity
  extension_id TEXT, -- NULL for system widgets, extension ID for extension widgets
  default_size TEXT DEFAULT 'medium', -- small, medium, large, full
  icon TEXT,
  category TEXT, -- analytics, tasks, communications, storage, team
  data_endpoint TEXT, -- API endpoint to fetch widget data
  refresh_interval INTEGER DEFAULT 60000, -- milliseconds (default: 1 minute)
  settings_schema TEXT, -- JSON: widget-specific settings schema
  created_at TEXT DEFAULT (datetime('now'))
);

-- User Dashboard Layouts (Per User Customization)
CREATE TABLE IF NOT EXISTS user_dashboard_layouts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  layout_name TEXT DEFAULT 'default',
  widgets TEXT NOT NULL, -- JSON: [{widgetId, x, y, w, h, settings}]
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user ON user_dashboard_layouts(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_ext ON dashboard_widgets(extension_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_active ON user_dashboard_layouts(user_id, is_active);

-- Insert System Widgets (Built-in)
INSERT INTO dashboard_widgets (id, name, description, component_type, extension_id, default_size, icon, category, data_endpoint, refresh_interval) VALUES
  -- Analytics Category
  ('quick-stats', 'Quick Stats', 'Overview of tasks, agents, and workflows', 'stats', NULL, 'large', 'activity', 'analytics', '/api/dashboard/widgets/quick-stats', 30000),
  ('task-overview', 'Task Overview', 'Tasks breakdown by status', 'chart', NULL, 'medium', 'list-todo', 'analytics', '/api/dashboard/widgets/task-overview', 60000),
  ('agent-performance', 'Agent Performance', 'Agent activity chart', 'chart', NULL, 'medium', 'bot', 'analytics', '/api/dashboard/widgets/agent-performance', 60000),
  ('storage-usage', 'Storage Usage', 'Storage breakdown by zone', 'chart', NULL, 'medium', 'hard-drive', 'storage', '/api/dashboard/widgets/storage-usage', 120000),

  -- Activity Category
  ('recent-activity', 'Recent Activity', 'Latest 10 system actions', 'list', NULL, 'medium', 'clock', 'analytics', '/api/dashboard/widgets/recent-activity', 15000),
  ('workflow-status', 'Active Workflows', 'Currently running workflows', 'list', NULL, 'medium', 'workflow', 'tasks', '/api/dashboard/widgets/workflow-status', 30000),

  -- Communications Category
  ('notifications', 'Notifications', 'Recent 5 notifications', 'list', NULL, 'small', 'bell', 'communications', '/api/dashboard/widgets/notifications', 30000),

  -- Calendar Category
  ('calendar-events', 'Calendar', 'Upcoming events', 'calendar', NULL, 'medium', 'calendar', 'tasks', '/api/dashboard/widgets/calendar-events', 300000),

  -- Team Category
  ('team-members', 'Team Members', 'Active team members', 'table', NULL, 'medium', 'users', 'team', '/api/dashboard/widgets/team-members', 120000),

  -- AI Usage Category
  ('ai-tools-usage', 'AI Usage', 'LLM API calls today', 'stats', NULL, 'small', 'cpu', 'analytics', '/api/dashboard/widgets/ai-usage', 60000);
