import React from 'react';

interface SettingsSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  resultCount: number;
}

const SettingsSearch: React.FC<SettingsSearchProps> = ({
  searchQuery,
  onSearchChange,
  resultCount,
}) => {
  const clearSearch = () => {
    onSearchChange('');
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      marginBottom: '32px',
    }}>
      
      {/* Search Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
      }}>
        <div>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#2c3e50',
            margin: '0 0 4px 0',
          }}>
            🔍 Find Settings
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#7f8c8d',
            margin: '0',
          }}>
            Search through all configuration options and preferences
          </p>
        </div>
        
        {/* Quick Clear Button */}
        {searchQuery && (
          <button
            onClick={clearSearch}
            style={{
              padding: '8px 16px',
              background: 'rgba(231, 76, 60, 0.1)',
              color: '#e74c3c',
              border: '1px solid rgba(231, 76, 60, 0.2)',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(231, 76, 60, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(231, 76, 60, 0.1)';
            }}
          >
            ✕ Clear Search
          </button>
        )}
      </div>

      {/* Search Input */}
      <div style={{
        position: 'relative',
        marginBottom: '16px',
      }}>
        <div style={{
          position: 'absolute',
          left: '20px',
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
          placeholder="Search for themes, AI models, integrations, security..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            width: '100%',
            padding: '16px 20px 16px 52px',
            fontSize: '16px',
            border: '2px solid #e1e5e9',
            borderRadius: '12px',
            background: '#f8f9fa',
            color: '#2c3e50',
            outline: 'none',
            transition: 'all 0.3s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#667eea';
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.transform = 'scale(1.01)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.1)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#e1e5e9';
            e.currentTarget.style.background = '#f8f9fa';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        
        {/* Clear Button Inside Input */}
        {searchQuery && (
          <button
            onClick={clearSearch}
            style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: 'none',
              background: '#95a5a6',
              color: 'white',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#7f8c8d';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#95a5a6';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Search Results Info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '16px',
      }}>
        
        {/* Results Count */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            padding: '6px 12px',
            background: searchQuery 
              ? 'linear-gradient(135deg, #667eea, #764ba2)' 
              : 'rgba(149, 165, 166, 0.1)',
            color: searchQuery ? 'white' : '#7f8c8d',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: '600',
            transition: 'all 0.3s ease',
          }}>
            {resultCount} results
          </div>
          
          {searchQuery && (
            <span style={{
              fontSize: '14px',
              color: '#7f8c8d',
            }}>
              for "{searchQuery}"
            </span>
          )}
        </div>

        {/* Quick Search Suggestions */}
        {!searchQuery && (
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}>
            <span style={{
              fontSize: '12px',
              color: '#95a5a6',
              marginRight: '8px',
            }}>
              Quick search:
            </span>
            
            {[
              { label: 'Theme', icon: '🎨' },
              { label: 'AI', icon: '🤖' },
              { label: 'Security', icon: '🔐' },
              { label: 'Backup', icon: '💾' },
            ].map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSearchChange(suggestion.label.toLowerCase())}
                style={{
                  padding: '4px 8px',
                  background: 'rgba(102, 126, 234, 0.1)',
                  color: '#667eea',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#667eea';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                  e.currentTarget.style.color = '#667eea';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span>{suggestion.icon}</span>
                {suggestion.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Advanced Search Tips */}
      {searchQuery && resultCount === 0 && (
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: 'rgba(241, 196, 15, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(241, 196, 15, 0.2)',
        }}>
          <div style={{
            fontSize: '14px',
            color: '#f39c12',
            fontWeight: '600',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            💡 Search Tips
          </div>
          <div style={{
            fontSize: '12px',
            color: '#7f8c8d',
            lineHeight: '1.4',
          }}>
            Try searching for: "profile", "password", "theme", "notifications", "backup", "api", "automation", or "integrations"
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsSearch; 