import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../../services/auth';
import { authService } from '../../services/auth';

interface ToolbarProps {
  user: User | null;
  onToggleSidebar: () => void;
  isChildAgentActive?: boolean;
  unreadNotifications?: number;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'Child Agent Active',
    message: 'New child agent has started training',
    time: '2 min ago',
    isRead: false,
    type: 'success'
  },
  {
    id: '2',
    title: 'Task Completed',
    message: 'Agent completed the assigned task',
    time: '10 min ago',
    isRead: false,
    type: 'info'
  },
  {
    id: '3',
    title: 'System Update',
    message: 'New features available',
    time: '1 hour ago',
    isRead: true,
    type: 'info'
  }
];

const QUICK_TOOLS = [
  { id: 'new-agent', icon: '🤖', label: 'New Agent', action: () => console.log('New Agent') },
  { id: 'new-chat', icon: '💬', label: 'New Chat', action: () => console.log('New Chat') },
  { id: 'new-task', icon: '✅', label: 'New Task', action: () => console.log('New Task') },
  { id: 'training', icon: '🧪', label: 'Training Lab', action: () => console.log('Training Lab') },
  { id: 'marketplace', icon: '🛒', label: 'Marketplace', action: () => console.log('Marketplace') }
];

export const Toolbar: React.FC<ToolbarProps> = ({
  user,
  onToggleSidebar,
  isChildAgentActive = false,
  unreadNotifications = 0
}) => {
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isQuickToolsOpen, setIsQuickToolsOpen] = useState(false);
  
  const notificationsRef = useRef<HTMLDivElement>(null);
  const quickToolsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (quickToolsRef.current && !quickToolsRef.current.contains(event.target as Node)) {
        setIsQuickToolsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      authService.logout();
      navigate('/login');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '60px',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      zIndex: 100,
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
    }}>
      {/* Left Section - Menu Toggle & System Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={onToggleSidebar}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          ☰
        </button>

        {/* System Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          color: isChildAgentActive ? '#10B981' : '#6B7280',
          padding: '6px 12px',
          borderRadius: '16px',
          backgroundColor: isChildAgentActive ? 'rgba(16, 185, 129, 0.1)' : 'transparent'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isChildAgentActive ? '#10B981' : '#6B7280'
          }} />
          {isChildAgentActive ? 'LIVE' : 'Offline'}
        </div>
      </div>

      {/* Center Section - Search */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '600px',
          margin: '0 16px'
        }}>
          <input
            type="text"
            placeholder="Search anything..."
            style={{
              width: '100%',
              height: '40px',
              padding: '0 16px 0 40px',
              borderRadius: '20px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              backgroundColor: 'rgba(0, 0, 0, 0.03)',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
            onFocus={e => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
            }}
            onBlur={e => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.03)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <span style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#6B7280',
            fontSize: '16px'
          }}>
            🔍
          </span>
        </div>
      </div>

      {/* Right Section - Quick Tools, Notifications & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Quick Tools */}
        <div ref={quickToolsRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setIsQuickToolsOpen(!isQuickToolsOpen)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ⚡
          </button>

          {/* Quick Tools Dropdown */}
          {isQuickToolsOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              width: '220px',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              padding: '8px',
              marginTop: '8px'
            }}>
              {QUICK_TOOLS.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => {
                    tool.action();
                    setIsQuickToolsOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'none',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '14px',
                    color: '#1F2937',
                    textAlign: 'left'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span style={{ fontSize: '18px' }}>{tool.icon}</span>
                  {tool.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div ref={notificationsRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            🔔
          </button>
          {unreadNotifications > 0 && (
            <div style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              backgroundColor: '#EF4444',
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
              padding: '2px 6px',
              borderRadius: '10px',
              minWidth: '20px',
              textAlign: 'center'
            }}>
              {unreadNotifications}
            </div>
          )}

          {/* Notifications Dropdown */}
          {isNotificationsOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              width: '320px',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              padding: '8px',
              marginTop: '8px'
            }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Notifications</h3>
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '13px',
                    color: '#2563EB',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.1)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Mark all as read
                </button>
              </div>
              
              {MOCK_NOTIFICATIONS.map(notification => (
                <div
                  key={notification.id}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: notification.isRead ? 'transparent' : 'rgba(37, 99, 235, 0.05)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = notification.isRead ? 'transparent' : 'rgba(37, 99, 235, 0.05)'}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '16px' }}>{getNotificationIcon(notification.type)}</span>
                    <div>
                      <div style={{ 
                        fontSize: '14px',
                        fontWeight: notification.isRead ? '400' : '600',
                        color: '#1F2937',
                        marginBottom: '4px'
                      }}>
                        {notification.title}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6B7280' }}>
                        {notification.message}
                      </div>
                      <div style={{ 
                        fontSize: '12px',
                        color: '#9CA3AF',
                        marginTop: '4px'
                      }}>
                        {notification.time}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ padding: '12px 16px', textAlign: 'center' }}>
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '14px',
                    color: '#2563EB',
                    cursor: 'pointer',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    width: '100%'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.1)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#2563EB',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 'bold'
            }}>
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              width: '260px',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              padding: '8px',
              marginTop: '8px'
            }}>
              {/* User Info Section */}
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#2563EB',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 'bold'
                  }}>
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#1F2937'
                    }}>
                      {user?.full_name || user?.username || 'User'}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#6B7280'
                    }}>
                      {user?.email || 'No email'}
                    </div>
                  </div>
                </div>
                <div style={{
                  fontSize: '13px',
                  color: '#10B981',
                  padding: '4px 8px',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: '4px',
                  display: 'inline-block'
                }}>
                  {user?.role || 'User'} Account
                </div>
              </div>

              {/* Menu Items */}
              <div style={{ padding: '8px' }}>
                {[
                  { icon: '👤', label: 'My Profile', action: () => navigate('/profile') },
                  { icon: '⚙️', label: 'Settings', action: () => navigate('/dashboard/settings') },
                  { icon: '🔑', label: 'License', action: () => navigate('/license') },
                  { icon: '❓', label: 'Help & Support', action: () => window.open('/help', '_blank') }
                ].map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      item.action();
                      setIsProfileOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: 'none',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '14px',
                      color: '#1F2937',
                      textAlign: 'left'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <span style={{ fontSize: '18px' }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Logout Button */}
              <div style={{
                padding: '8px',
                borderTop: '1px solid rgba(0, 0, 0, 0.1)',
                marginTop: '8px'
              }}>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'none',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '14px',
                    color: '#DC2626',
                    textAlign: 'left'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.05)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span style={{ fontSize: '18px' }}>🚪</span>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Toolbar; 