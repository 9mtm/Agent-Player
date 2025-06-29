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
import { ChatPage } from './pages/Chat';
import FormBuilderPage from './pages/FormBuilder/FormBuilderPage';
import AgentPage from './pages/Agent/AgentPage';
import TasksPage from './pages/Tasks/TasksPage';
import MarketplacePage from './pages/Marketplace/MarketplacePage';
import SettingsPageNew from './pages/Settings/SettingsPageNew';
import BoardPage from './pages/Board/BoardPage';
import TrainingLabPage from './pages/TrainingLab/TrainingLabPage';
import { AppsPage } from './pages/Apps';
import CustomFieldBuilderPro from './pages/Apps/CustomFieldBuilderPro';
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

// Move handleInvalidRoute to be available in both components
const handleInvalidRoute = () => {
  return (
    <div style={{
      padding: '40px 20px',
      textAlign: 'center',
      color: '#666',
      background: '#f8f8f8',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        maxWidth: '600px',
        width: '100%'
      }}>
        <h2 style={{ color: '#dc3545', marginBottom: '20px' }}>Page Not Found</h2>
        <p style={{ marginBottom: '20px' }}>
          The requested page does not exist or you may not have permission to access it.
        </p>
        <div style={{ marginTop: '30px' }}>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '10px 20px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            ← Go Back
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            style={{
              padding: '10px 20px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

// Dashboard Layout Component
function DashboardLayout() {
  const location = useLocation();
  const isBoardPage = location.pathname.includes('/board');
  
  console.log('📍 Current location:', location.pathname);
  console.log('🎯 Is board page:', isBoardPage);

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
          <Route path="agents" element={<AgentPage />} />
          <Route path="child-agents" element={<ChildAgentPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="chat/:chatId" element={<ChatPage />} />
          <Route path="form-builder" element={<FormBuilderPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="training-lab" element={<TrainingLabPage />} />
          <Route path="marketplace" element={<MarketplacePage />} />
          <Route path="apps" element={<AppsPage />} />
          <Route path="settings" element={<SettingsPageNew />} />
          {/* Marketplace Apps Routes */}
          <Route path="apps/custom-field-builder-pro" element={<CustomFieldBuilderPro />} />
          {/* Board routes with agent IDs */}
          <Route path="board/child-agent/:agentId" element={<BoardPage />} />
          <Route path="board/agent/:agentId" element={<BoardPage />} />
          <Route path="board" element={<BoardPage />} />
          <Route path="*" element={handleInvalidRoute()} />
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
          <Route path="/apps" element={<Navigate to="/dashboard/apps" replace />} />
          <Route path="/dashboard/*" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          } />
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