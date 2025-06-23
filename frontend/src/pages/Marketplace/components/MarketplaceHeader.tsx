import React from 'react';

interface MarketplaceHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onFiltersToggle: () => void;
}

const MarketplaceHeader: React.FC<MarketplaceHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onFiltersToggle,
}) => {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '40px 0',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 40% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)
        `,
      }} />

      <div style={{ 
        maxWidth: '1400px', 
        margin: '0 auto', 
        padding: '0 24px',
        position: 'relative',
        zIndex: 1,
      }}>
        
        {/* Header Content */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ 
            fontSize: '48px', 
            fontWeight: '800', 
            margin: '0 0 16px 0',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          }}>
            🛒 Dpro Marketplace
          </h1>
          <p style={{ 
            fontSize: '20px', 
            opacity: 0.9, 
            fontWeight: '400',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.5',
          }}>
            Discover powerful extensions, stunning themes, intelligent agents, and MCP servers
          </p>
        </div>

        {/* Search and Actions Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          maxWidth: '800px',
          margin: '0 auto',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          
          {/* Search Box */}
          <div style={{ 
            position: 'relative', 
            flex: '1',
            minWidth: '300px',
            maxWidth: '500px',
          }}>
            <div style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '20px',
              color: '#7f8c8d',
              zIndex: 2,
            }}>
              🔍
            </div>
            <input
              type="text"
              placeholder="Search extensions, themes, agents, and MCP servers..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                width: '100%',
                padding: '16px 20px 16px 52px',
                fontSize: '16px',
                border: 'none',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#2c3e50',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(10px)',
                outline: 'none',
                transition: 'all 0.3s ease',
              }}
              onFocus={(e) => {
                e.target.style.transform = 'scale(1.02)';
                e.target.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            
            {/* Filters Toggle */}
            <button
              onClick={onFiltersToggle}
              style={{
                padding: '16px 24px',
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backdropFilter: 'blur(10px)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span>⚙️</span>
              Filters
            </button>

            {/* Upload Product Button */}
            <button
              style={{
                padding: '16px 24px',
                background: 'rgba(255, 255, 255, 0.9)',
                color: '#667eea',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.1)';
              }}
            >
              <span>📤</span>
              Upload Product
            </button>
          </div>
        </div>

        {/* Stats Banner */}
        <div style={{
          marginTop: '32px',
          display: 'flex',
          justifyContent: 'center',
          gap: '40px',
          flexWrap: 'wrap',
        }}>
          {[
            { label: 'Total Products', value: '2,847', icon: '📦' },
            { label: 'Active Developers', value: '1,256', icon: '👨‍💻' },
            { label: 'Downloads', value: '586K+', icon: '⬇️' },
            { label: 'Revenue Shared', value: '$127K', icon: '💰' },
          ].map((stat, index) => (
            <div key={index} style={{
              textAlign: 'center',
              opacity: 0.9,
            }}>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}>
                <span>{stat.icon}</span>
                {stat.value}
              </div>
              <div style={{ 
                fontSize: '14px', 
                opacity: 0.8,
                marginTop: '4px',
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarketplaceHeader; 