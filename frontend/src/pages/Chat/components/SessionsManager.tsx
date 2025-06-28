// Sessions Manager Component - Chat Session Management UI
// All code in English as per project rules

import React, { useState, useEffect } from 'react';
import { sessionService, type ChatSession, type SessionAnalytics } from '../../../services/sessions';
import { useNotifications } from '../../../hooks/useNotifications';

interface SessionsManagerProps {
  conversationId?: string;
  agentId?: number;
  onSessionSelected?: (session: ChatSession) => void;
  className?: string;
}

export const SessionsManager: React.FC<SessionsManagerProps> = ({
  conversationId,
  agentId,
  onSessionSelected,
  className = ""
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const { addNotification } = useNotifications();

  // Load user sessions
  const loadSessions = async () => {
    try {
      setLoading(true);
      const result = await sessionService.getUserSessions(0, 50, statusFilter || undefined);
      setSessions(result.sessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      addNotification('Failed to load sessions', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load analytics
  const loadAnalytics = async () => {
    try {
      const analyticsData = await sessionService.getSessionAnalytics(30);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  // Create new session
  const createNewSession = async () => {
    if (!conversationId) {
      addNotification('No conversation selected', 'error');
      return;
    }

    try {
      const newSession = await sessionService.createSession({
        conversation_id: conversationId,
        agent_id: agentId,
        session_name: `Session ${new Date().toLocaleString()}`,
        session_type: 'chat'
      });

      setCurrentSession(newSession);
      setSessions(prev => [newSession, ...prev]);
      onSessionSelected?.(newSession);
      addNotification('New session created successfully', 'success');
    } catch (error) {
      console.error('Failed to create session:', error);
      addNotification('Failed to create new session', 'error');
    }
  };

  // End current session
  const endCurrentSession = async () => {
    if (!currentSession) return;

    try {
      const endedSession = await sessionService.endSession(currentSession.session_id);
      setCurrentSession(null);
      setSessions(prev => 
        prev.map(s => s.session_id === endedSession.session_id ? endedSession : s)
      );
      addNotification('Session ended successfully', 'success');
    } catch (error) {
      console.error('Failed to end session:', error);
      addNotification('Failed to end session', 'error');
    }
  };

  // Select session
  const selectSession = (session: ChatSession) => {
    setCurrentSession(session);
    onSessionSelected?.(session);
  };

  // Search sessions
  const searchSessions = async () => {
    if (!searchQuery.trim()) {
      loadSessions();
      return;
    }

    try {
      setLoading(true);
      const result = await sessionService.searchSessions({
        query: searchQuery,
        agent_id: agentId,
        limit: 50
      });
      setSessions(result.sessions);
    } catch (error) {
      console.error('Failed to search sessions:', error);
      addNotification('Failed to search sessions', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadSessions();
    loadAnalytics();
  }, [statusFilter, loadSessions, loadAnalytics]);

  // Search on query change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      searchSessions();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, searchSessions]);

  return (
    <div className={`sessions-manager ${className}`}>
      {/* Header with controls */}
      <div className="sessions-header">
        <div className="sessions-controls">
          <button 
            onClick={createNewSession}
            className="btn btn-primary"
            disabled={!conversationId}
          >
            🆕 New Session
          </button>
          
          {currentSession && (
            <button 
              onClick={endCurrentSession}
              className="btn btn-danger"
            >
              ⏹️ End Session
            </button>
          )}

          <button 
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="btn btn-secondary"
          >
            📊 Analytics
          </button>
        </div>

        {/* Search and filters */}
        <div className="sessions-filters">
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="status-filter"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="ended">Ended</option>
          </select>
        </div>
      </div>

      {/* Current session info */}
      {currentSession && (
        <div className="current-session">
          <div className="session-info">
            <h4>🔥 Current Session</h4>
            <div className="session-details">
              <span className="session-name">{currentSession.session_name}</span>
              <span className="session-status" style={{ color: sessionService.getSessionStatusColor(currentSession.status) }}>
                {sessionService.getSessionStatusIcon(currentSession.status)} {currentSession.status}
              </span>
              <span className="session-duration">
                ⏱️ {sessionService.formatDuration(currentSession.total_duration)}
              </span>
              <span className="session-messages">
                💬 {currentSession.messages_count} messages
              </span>
              <span className="session-cost">
                💰 {sessionService.formatCost(currentSession.cost_incurred)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Analytics panel */}
      {showAnalytics && analytics && (
        <div className="analytics-panel">
          <h4>📊 Session Analytics (Last 30 days)</h4>
          <div className="analytics-grid">
            <div className="metric">
              <span className="metric-label">Total Sessions</span>
              <span className="metric-value">{analytics.total_sessions}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Active Sessions</span>
              <span className="metric-value">{analytics.active_sessions}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Total Messages</span>
              <span className="metric-value">{analytics.total_messages}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Total Tokens</span>
              <span className="metric-value">{analytics.total_tokens.toLocaleString()}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Total Cost</span>
              <span className="metric-value">${analytics.total_cost.toFixed(4)}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Avg Duration</span>
              <span className="metric-value">{sessionService.formatDuration(analytics.average_duration)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Sessions list */}
      <div className="sessions-list">
        <h4>📋 All Sessions ({sessions.length})</h4>
        
        {loading ? (
          <div className="loading">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <p>No sessions found</p>
            {conversationId && (
              <button onClick={createNewSession} className="btn btn-primary">
                Create Your First Session
              </button>
            )}
          </div>
        ) : (
          <div className="sessions-grid">
            {sessions.map((session) => (
              <div 
                key={session.session_id}
                className={`session-card ${currentSession?.session_id === session.session_id ? 'active' : ''}`}
                onClick={() => selectSession(session)}
              >
                <div className="session-card-header">
                  <span className="session-name">{session.session_name}</span>
                  <span 
                    className="session-status"
                    style={{ color: sessionService.getSessionStatusColor(session.status) }}
                  >
                    {sessionService.getSessionStatusIcon(session.status)}
                  </span>
                </div>

                <div className="session-card-meta">
                  <div className="meta-row">
                    <span>📅 {sessionService.formatDate(session.created_at)}</span>
                  </div>
                  <div className="meta-row">
                    <span>⏱️ {sessionService.formatDuration(session.total_duration)}</span>
                    <span>💬 {session.messages_count}</span>
                  </div>
                  <div className="meta-row">
                    <span>🎯 {session.tokens_used} tokens</span>
                    <span>💰 {sessionService.formatCost(session.cost_incurred)}</span>
                  </div>
                  {session.last_activity && (
                    <div className="meta-row">
                      <span className="last-activity">
                        🕐 Last: {sessionService.formatDate(session.last_activity)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 