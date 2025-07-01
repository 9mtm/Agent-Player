import React, { useState } from 'react';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');

  const stats = {
    totalUsers: 12547,
    activeUsers: 8932,
    totalThemes: 156,
    pendingThemes: 23,
    monthlyRevenue: 12345.67,
  };

  const renderOverview = () => (
    <div>
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {[
          { title: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: '👥', color: '#3498db', change: '+12%' },
          { title: 'Active Users', value: stats.activeUsers.toLocaleString(), icon: '🟢', color: '#27ae60', change: '+8%' },
          { title: 'Total Themes', value: stats.totalThemes.toLocaleString(), icon: '🎨', color: '#9b59b6', change: '+15%' },
          { title: 'Monthly Revenue', value: `$${stats.monthlyRevenue.toLocaleString()}`, icon: '💰', color: '#f39c12', change: '+23%' }
        ].map((stat, index) => (
          <div key={index} style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            border: `3px solid ${stat.color}20`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ 
                background: stat.color + '20',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '24px'
              }}>
                {stat.icon}
              </div>
              <div style={{
                background: '#e8f5e8',
                color: '#27ae60',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {stat.change}
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#2c3e50', marginBottom: '4px' }}>
              {stat.value}
            </div>
            <div style={{ color: '#7f8c8d', fontSize: '14px' }}>
              {stat.title}
            </div>
          </div>
        ))}
      </div>

      {/* Charts and Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* User Growth Chart */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: '#2c3e50' }}>
            📈 User Growth Trend
          </h3>
          <div style={{
            height: '200px',
            background: 'linear-gradient(135deg, #667eea20, #764ba220)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            color: '#7f8c8d',
            textAlign: 'center' as const
          }}>
            Interactive Chart Placeholder
            <br />
            <small>(Integration with Chart.js)</small>
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: '#2c3e50' }}>
            🔔 Recent Activity
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { action: 'New user registration', user: 'System Administrator', time: '2 min ago', type: 'user' },
              { action: 'Theme submission', user: 'DesignMaster', time: '15 min ago', type: 'theme' },
              { action: 'Premium upgrade', user: 'TechCorp LLC', time: '1 hour ago', type: 'billing' },
              { action: 'Theme download', user: 'Anonymous', time: '2 hours ago', type: 'download' }
            ].map((activity, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: '#f8f9fa',
                borderRadius: '8px',
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: activity.type === 'user' ? '#3498db' : 
                             activity.type === 'theme' ? '#9b59b6' :
                             activity.type === 'billing' ? '#f39c12' : '#27ae60'
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', color: '#2c3e50' }}>{activity.action}</div>
                  <div style={{ fontSize: '12px', color: '#7f8c8d' }}>{activity.user} • {activity.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
          👥 User Management
        </h2>
        <p style={{ color: '#7f8c8d', fontSize: '16px' }}>
          Manage user accounts, subscriptions, and access permissions
        </p>
      </div>

      {/* User Management Interface */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        textAlign: 'center' as const
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
        <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
          User Management System
        </h3>
        <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>
          Complete user administration interface with filtering, search, and management tools
        </p>
        <div style={{
          background: '#f8f9fa',
          padding: '16px',
          borderRadius: '8px',
          color: '#7f8c8d',
          fontSize: '14px'
        }}>
          Features: User search, subscription management, account status control, analytics
        </div>
      </div>
    </div>
  );

  const renderThemes = () => (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
          🎨 Theme Marketplace Management
        </h2>
        <p style={{ color: '#7f8c8d', fontSize: '16px' }}>
          Review and manage theme submissions from the community
        </p>
      </div>

      {/* Pending Themes */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#2c3e50' }}>
          ⏳ Pending Approval ({stats.pendingThemes})
        </h3>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '2px solid #f39c1230',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', alignItems: 'flex-start' }}>
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#2c3e50' }}>
                Modern Dark Pro Theme
              </h4>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '14px', color: '#7f8c8d' }}>
                <span>👤 DesignMaster</span>
                <span>📧 designer@example.com</span>
                <span>💰 $4.99</span>
                <span>📅 2024-01-18</span>
              </div>
              <p style={{ margin: '0 0 16px 0', color: '#555', lineHeight: '1.5' }}>
                A professional dark theme with modern UI elements and smooth animations
              </p>
              
              {/* Review Actions */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button style={{
                  padding: '8px 16px',
                  background: '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}>
                  ✅ Approve
                </button>
                <button style={{
                  padding: '8px 16px',
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}>
                  ❌ Reject
                </button>
                <button style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  color: '#667eea',
                  border: '2px solid #667eea',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}>
                  👀 Preview
                </button>
              </div>
            </div>

            {/* Theme Preview */}
            <div style={{
              width: '200px',
              height: '120px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              Theme Preview
            </div>
          </div>
        </div>
      </div>

      {/* Approved Themes */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#2c3e50' }}>
          ✅ Approved Themes ({stats.totalThemes - stats.pendingThemes})
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {['Dark Matrix', 'Ocean Breeze', 'Sunset Gradient'].map((themeName, index) => (
            <div key={index} style={{
              background: 'white',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              border: '2px solid #27ae6030',
            }}>
              <div style={{
                height: '120px',
                background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                {themeName}
              </div>
              
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>
                    by Designer{index + 1}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: '#f39c12', fontSize: '14px' }}>⭐</span>
                    <span style={{ fontSize: '14px', color: '#7f8c8d' }}>4.{7 + index}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#7f8c8d' }}>
                  <span>📥 {(234 + index * 100).toLocaleString()} downloads</span>
                  <span style={{
                    background: index === 0 ? '#27ae6020' : '#3498db20',
                    color: index === 0 ? '#27ae60' : '#3498db',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: '600'
                  }}>
                    {index === 0 ? 'Free' : '$2.99'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#2c3e50', marginBottom: '8px' }}>
          🛡️ Admin Dashboard
        </h1>
        <p style={{ color: '#7f8c8d', fontSize: '16px' }}>
          System management and analytics for DPRO Agent Platform
        </p>
      </div>

      {/* Navigation Tabs */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', gap: '8px', background: 'white', padding: '8px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {[
            { id: 'overview', label: '📊 Overview', desc: 'System stats' },
            { id: 'users', label: '👥 Users', desc: 'User management' },
            { id: 'themes', label: '🎨 Themes', desc: 'Marketplace' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '16px',
                background: activeTab === tab.id ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#7f8c8d',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'center' as const,
                transition: 'all 0.2s',
              }}
            >
              <div>{tab.label}</div>
              {activeTab !== tab.id && (
                <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                  {tab.desc}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'themes' && renderThemes()}
      </div>
    </div>
  );
};

export default AdminDashboard; 