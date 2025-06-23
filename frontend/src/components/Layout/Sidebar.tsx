import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authService } from '../../services/auth';
import type { User } from '../../services/auth';

// Main navigation items - with Chat restored
const navigationItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/dashboard/agents', label: 'Agents', icon: '🤖' },
  { path: '/dashboard/chat', label: 'Chat', icon: '💬' },
  { path: '/dashboard/form-builder', label: 'Form Builder', icon: '📝' },
  { path: '/dashboard/tasks', label: 'Tasks', icon: '✅' },
  { path: '/dashboard/marketplace', label: 'Marketplace', icon: '🛒' },
  { path: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar() {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      console.log('🔍 Sidebar: Loading user data...');
      setLoading(true);
      
      // Check token first
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.log('❌ Sidebar: No access token found');
        setUser(null);
        setLoading(false);
        return;
      }

      console.log('✅ Sidebar: Token found, fetching from API...');
      
      // Try API first
      const userData = await authService.getCurrentUser();
      console.log('✅ Sidebar: API response:', userData);
      
      if (userData) {
        setUser(userData);
        console.log('✅ Sidebar: User set:', userData);
      }
      
    } catch (err) {
      console.error('❌ Sidebar: API failed:', err);
      
      // Try stored user
      const storedUser = authService.getStoredUser();
      if (storedUser) {
        console.log('🔄 Sidebar: Using stored user:', storedUser);
        setUser(storedUser);
      } else {
        console.log('❌ Sidebar: No stored user data available');
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      authService.logout();
      window.location.href = '/login';
    }
  };

  return (
    <div style={{
      width: '280px',
      backgroundColor: '#1a1a1a',
      color: 'white',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid #333' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>
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
          {navigationItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                margin: '0.25rem 0',
                borderRadius: '8px',
                color: 'white',
                textDecoration: 'none',
                backgroundColor: location.pathname === item.path ? '#2196f3' : 'transparent',
                transition: 'all 0.2s ease',
                fontSize: '0.925rem'
              }}
              onMouseEnter={(e) => {
                if (location.pathname !== item.path) {
                  e.currentTarget.style.backgroundColor = '#333';
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== item.path) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
              <span>{item.label}</span>
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
  );
}

export default Sidebar; 