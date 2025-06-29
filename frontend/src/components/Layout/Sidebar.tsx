import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authService } from '../../services/auth';
import type { User } from '../../services/auth';

// Main navigation items - with locked items and Workflows removed
const navigationItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊', locked: false, hidden: false },
  { path: '/dashboard/agents', label: 'Agents', icon: '🤖', locked: false, hidden: false },
  { path: '/dashboard/chat', label: 'Chat', icon: '💬', locked: false, hidden: false },
  { path: '/dashboard/training-lab', label: 'Training Lab', icon: '🧪', locked: true, hidden: false },
  { path: '/dashboard/tasks', label: 'Tasks', icon: '✅', locked: true, hidden: false },
  { path: '/dashboard/form-builder', label: 'Form Builder', icon: '📝', locked: true, hidden: false },
  { path: '/dashboard/apps', label: 'Apps', icon: '📱', locked: false, hidden: true },
  { path: '/dashboard/marketplace', label: 'Marketplace', icon: '🛒', locked: false, hidden: true },
  { path: '/dashboard/settings', label: 'Settings', icon: '⚙️', locked: false, hidden: false },
];

export function Sidebar() {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('sidebar');
      const toggleButton = document.getElementById('sidebar-toggle');
      if (sidebar && !sidebar.contains(event.target as Node) && 
          toggleButton && !toggleButton.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUserData = async () => {
    try {
      console.log('🔍 Sidebar: Loading user data...');
      
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.log('❌ Sidebar: No access token found');
        setUser(null);
        return;
      }

      console.log('✅ Sidebar: Token found, fetching from API...');
      
      const userData = await authService.getCurrentUser();
      console.log('✅ Sidebar: API response:', userData);
      
      if (userData) {
        setUser(userData);
        console.log('✅ Sidebar: User set:', userData);
      }
      
    } catch (err) {
      console.error('❌ Sidebar: API failed:', err);
      
      const storedUser = authService.getStoredUser();
      if (storedUser) {
        console.log('🔄 Sidebar: Using stored user:', storedUser);
        setUser(storedUser);
      } else {
        console.log('❌ Sidebar: No stored user data available');
        setUser(null);
      }
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      authService.logout();
      window.location.href = '/login';
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        id="sidebar-toggle"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          left: '10px',
          top: '10px',
          backgroundColor: '#333',
          border: 'none',
          color: 'white',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          zIndex: 1000,
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
          transition: 'transform 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {isOpen ? '←' : '☰'}
      </button>

      {/* Sidebar */}
      <div
        id="sidebar"
        style={{
          position: 'fixed',
          left: isOpen ? '0' : '-280px',
          top: '0',
          width: '280px',
          backgroundColor: '#1a1a1a',
          color: 'white',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          transition: 'left 0.3s ease',
          zIndex: 999,
          boxShadow: isOpen ? '2px 0 5px rgba(0,0,0,0.2)' : 'none'
        }}
      >
        {/* Header */}
        <div style={{ 
          padding: '1.5rem',
          borderBottom: '1px solid #333',
          marginTop: '10px'
        }}>
          <h1 style={{ 
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: '600'
          }}>
            🤖 Dpro Agent
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#aaa' }}>
            AI Agent Platform
          </p>
        </div>

        {/* User Info */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #333' }}>
          <div style={{ fontSize: '0.875rem' }}>
            <div style={{ fontWeight: '500' }}>
              {user ? (user.full_name || user.username || 'User') : 'User'}
            </div>
            <div style={{ color: '#aaa', fontSize: '0.75rem' }}>
              {user?.email || 'Not logged in'}
            </div>
            <div style={{ 
              color: user?.is_active ? '#4caf50' : '#f44336',
              fontSize: '0.75rem',
              marginTop: '0.25rem'
            }}>
              {user?.is_active ? '🟢 Active' : '🔴 Inactive'}
            </div>
          </div>
        </div>
        
        {/* Main Navigation */}
        <nav style={{ flex: 1, padding: '1rem' }}>
          <div>
            <div style={{ 
              fontSize: '0.75rem',
              color: '#888',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              fontWeight: '600',
              letterSpacing: '0.5px'
            }}>
              Main Menu
            </div>
            {navigationItems.filter(item => !item.hidden).map((item) => (
              <Link
                key={item.path}
                to={item.locked ? '#' : item.path}
                onClick={(e) => {
                  if (item.locked) {
                    e.preventDefault();
                  } else {
                    setIsOpen(false); // Close sidebar after navigation
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.875rem 1rem',
                  margin: '0.25rem 0',
                  borderRadius: '8px',
                  color: item.locked ? '#666' : 'white',
                  textDecoration: 'none',
                  backgroundColor: location.pathname === item.path ? '#2196f3' : 'transparent',
                  transition: 'all 0.2s ease',
                  fontSize: '0.925rem',
                  cursor: item.locked ? 'not-allowed' : 'pointer',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  if (!item.locked && location.pathname !== item.path) {
                    e.currentTarget.style.backgroundColor = '#333';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!item.locked && location.pathname !== item.path) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                <span>{item.label}</span>
                {item.locked && (
                  <span style={{
                    position: 'absolute',
                    right: '10px',
                    fontSize: '0.8rem'
                  }}>
                    🔒
                  </span>
                )}
              </Link>
            ))}
          </div>
        </nav>

        {/* Logout Button */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #333' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#d32f2f',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.925rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#b71c1c';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#d32f2f';
            }}
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}

export default Sidebar; 