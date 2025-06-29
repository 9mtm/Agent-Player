import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface InstalledApp {
  id: string;
  name: string;
  description: string;
  icon: string;
  version: string;
  status: 'active' | 'inactive' | 'updating';
  lastUsed: string;
  size: string;
  developer: string;
  path: string;
  isFree: boolean;
  features: string[];
}

const AppsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // التطبيقات المثبتة
  const installedApps: InstalledApp[] = [
    {
      id: 'custom-field-builder',
      name: 'Custom Field Builder Pro',
      description: 'Revolutionary ACF-style field builder with Python code execution, auto-generated APIs, and MCP tools for AI agents. Create custom pages without coding!',
      icon: '🔧',
      version: '1.0.0',
      status: 'active',
      lastUsed: '2 hours ago',
      size: '2.3 MB',
      developer: 'DPRO AI Team',
      path: '/dashboard/apps/custom-field-builder-pro',
      isFree: true,
      features: [
        '🆓 Completely FREE',
        '🔧 30+ Field Types',
        '🐍 Python Code Execution',
        '🤖 Auto-Generated MCP Tools',
        '📡 REST API Generation',
        '🎨 Drag & Drop Builder',
        '📊 Live Preview Mode',
        '⚙️ Page Settings',
        '🔗 Sidebar Integration'
      ]
    }
  ];

  const filteredApps = installedApps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || app.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#27ae60';
      case 'inactive': return '#95a5a6';
      case 'updating': return '#f39c12';
      default: return '#95a5a6';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '✅';
      case 'inactive': return '⭕';
      case 'updating': return '🔄';
      default: return '⭕';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
        }}>
          <div style={{ marginBottom: '20px' }}>
            <h1 style={{ 
              fontSize: '36px', 
              color: '#2c3e50', 
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              📱 My Apps
            </h1>
            <p style={{ color: '#7f8c8d', fontSize: '18px', margin: 0 }}>
              Manage your installed applications and discover new tools to enhance your workflow
            </p>
          </div>

          {/* Search and Filters */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <input
                type="text"
                placeholder="🔍 Search apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '10px',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              {[
                { id: 'all', name: 'All Apps', count: installedApps.length },
                { id: 'active', name: 'Active', count: installedApps.filter(a => a.status === 'active').length },
                { id: 'inactive', name: 'Inactive', count: installedApps.filter(a => a.status === 'inactive').length }
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setFilterStatus(filter.id as any)}
                  style={{
                    padding: '10px 16px',
                    background: filterStatus === filter.id ? '#3498db' : '#f8f9fa',
                    color: filterStatus === filter.id ? 'white' : '#2c3e50',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {filter.name} ({filter.count})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Apps Grid */}
        {filteredApps.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '60px',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>📱</div>
            <h3 style={{ color: '#2c3e50', marginBottom: '10px' }}>No Apps Found</h3>
            <p style={{ color: '#7f8c8d', fontSize: '16px' }}>
              {searchQuery ? `No apps match "${searchQuery}"` : 'No apps available for this filter'}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '25px'
          }}>
            {filteredApps.map(app => (
              <div
                key={app.id}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '25px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease',
                  border: '1px solid #f0f0f0'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
                }}
              >
                {/* App Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', marginBottom: '20px' }}>
                  <div style={{
                    fontSize: '48px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '12px',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '64px',
                    height: '64px'
                  }}>
                    {app.icon}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                      <h3 style={{ color: '#2c3e50', margin: 0, fontSize: '20px', fontWeight: '700' }}>
                        {app.name}
                      </h3>
                      {app.isFree && (
                        <span style={{
                          background: '#27ae60',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          FREE
                        </span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
                      <span style={{
                        color: getStatusColor(app.status),
                        fontSize: '14px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {getStatusIcon(app.status)} {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                      </span>
                      
                      <span style={{ color: '#95a5a6', fontSize: '14px' }}>
                        v{app.version}
                      </span>
                      
                      <span style={{ color: '#95a5a6', fontSize: '14px' }}>
                        {app.size}
                      </span>
                    </div>
                    
                    <p style={{ color: '#7f8c8d', fontSize: '14px', margin: 0, lineHeight: '1.4' }}>
                      {app.description}
                    </p>
                  </div>
                </div>

                {/* Features */}
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: '#2c3e50', fontSize: '16px', marginBottom: '10px' }}>
                    ✨ Key Features
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {app.features.slice(0, 6).map((feature, index) => (
                      <span
                        key={index}
                        style={{
                          background: '#f8f9fa',
                          color: '#495057',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          border: '1px solid #e9ecef'
                        }}
                      >
                        {feature}
                      </span>
                    ))}
                    {app.features.length > 6 && (
                      <span style={{
                        color: '#6c757d',
                        fontSize: '12px',
                        padding: '4px 8px'
                      }}>
                        +{app.features.length - 6} more
                      </span>
                    )}
                  </div>
                </div>

                {/* App Stats */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '15px',
                  marginBottom: '20px',
                  padding: '15px',
                  background: '#f8f9fa',
                  borderRadius: '10px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#2c3e50' }}>
                      {app.developer}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>Developer</div>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#2c3e50' }}>
                      {app.lastUsed}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>Last Used</div>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#27ae60' }}>
                      Active
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>Status</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Link
                    to={app.path}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '10px',
                      fontWeight: '600',
                      textAlign: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #5a67d8 0%, #667eea 100%)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    }}
                  >
                    🚀 Open App
                  </Link>
                  
                  <button
                    style={{
                      padding: '12px 16px',
                      background: '#f8f9fa',
                      color: '#495057',
                      border: '1px solid #dee2e6',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    ⚙️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '25px',
          marginTop: '30px',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '10px' }}>🛒 Discover More Apps</h3>
          <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>
            Browse our marketplace to find more powerful tools and integrations
          </p>
          <Link
            to="/dashboard/marketplace"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: '#3498db',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '10px',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
          >
            🛒 Browse Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AppsPage; 