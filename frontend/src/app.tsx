import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthWrapper } from './components/Auth';
import { NotificationProvider, useNotificationContext } from './context/NotificationContext';
import { NotificationContainer } from './components/NotificationContainer';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/Auth/LoginPage';

// Import dashboard and other pages
import DashboardPage from './pages/Dashboard/DashboardPage';
import ChildAgentPage from './pages/ChildAgent/ChildAgentPage';
import { ChatPage, ChildAgentChat } from './pages/Chat';
import FormBuilderPage from './pages/FormBuilder/FormBuilderPage';
import AgentPage from './pages/Agent/AgentPage';
import TasksPage from './pages/Tasks/TasksPage';
import MarketplacePage from './pages/Marketplace/MarketplacePage';
import SettingsPageNew from './pages/Settings/SettingsPageNew';
import BoardPage from './pages/Board/BoardPage';
import { Sidebar } from './components/Layout/Sidebar';

// Import global styles
import './App.css';

// Simple Error Boundary Class Component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          margin: '2rem'
        }}>
          <h2 style={{ color: '#dc3545', marginBottom: '1rem' }}>Something went wrong</h2>
          <p style={{ color: '#6c757d', marginBottom: '1rem' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Dashboard Layout Component
function DashboardLayout() {
  const location = useLocation();
  const isBoardPage = location.pathname.includes('/board');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8f8f8' }}>
      {!isBoardPage && <Sidebar />}
      
      <div style={{ 
        flex: 1, 
        overflow: 'hidden',
        width: isBoardPage ? '100%' : 'auto',
        height: isBoardPage ? '100vh' : 'auto'
      }}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/agents" element={<AgentPage />} />
          <Route path="/child-agents" element={<ChildAgentPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:chatId" element={<ChildAgentChat />} />
          <Route path="/form-builder" element={<FormBuilderPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/settings" element={<SettingsPageNew />} />
          {/* Board routes with agent IDs */}
          <Route path="/board/child-agent/:agentId" element={<BoardPage />} />
          <Route path="/board/agent/:agentId" element={<BoardPage />} />
          <Route path="/board" element={<BoardPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function AppWithNotifications() {
  const {
    notifications,
    confirmDialog,
    removeNotification,
    handleConfirm,
    hideConfirm
  } = useNotificationContext();

  return (
    <>
      <AuthWrapper>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route 
            path="/dashboard/*" 
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            } 
          />
          
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthWrapper>
      <NotificationContainer
        notifications={notifications}
        confirmDialog={confirmDialog}
        onRemoveNotification={removeNotification}
        onConfirm={handleConfirm}
        onCancel={hideConfirm}
      />
    </>
  );
}

export default function App() {
  return (
    <NotificationProvider>
      <Router>
        <div className="App">
          <ErrorBoundary>
            <AppWithNotifications />
          </ErrorBoundary>
        </div>
      </Router>
    </NotificationProvider>
  );
} 