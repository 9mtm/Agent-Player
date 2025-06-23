import React from 'react';

interface SettingsHeaderProps {
  onSave: () => void;
  showSaveIndicator: boolean;
}

const SettingsHeader: React.FC<SettingsHeaderProps> = ({ 
  onSave, 
  showSaveIndicator 
}) => {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '32px 0',
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
          radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)
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
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          
          {/* Title Section */}
          <div>
            <h1 style={{ 
              fontSize: '36px', 
              fontWeight: '800', 
              margin: '0 0 8px 0',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            }}>
              ⚙️ Settings & Preferences
            </h1>
            <p style={{ 
              fontSize: '16px', 
              opacity: 0.9, 
              margin: '0',
              fontWeight: '400',
            }}>
              Customize your Dpro experience with powerful configuration options
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}>
            
            {/* Save Status Indicator */}
            {showSaveIndicator && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: 'rgba(39, 174, 96, 0.2)',
                borderRadius: '20px',
                border: '1px solid rgba(39, 174, 96, 0.3)',
                animation: 'fadeIn 0.3s ease',
              }}>
                <span style={{ fontSize: '16px' }}>✅</span>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>
                  Settings Saved
                </span>
              </div>
            )}

            {/* Export Settings */}
            <button
              style={{
                padding: '12px 20px',
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '10px',
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
              <span>📤</span>
              Export Settings
            </button>

            {/* Save Changes */}
            <button
              onClick={onSave}
              style={{
                padding: '12px 24px',
                background: 'rgba(255, 255, 255, 0.9)',
                color: '#667eea',
                border: 'none',
                borderRadius: '10px',
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
              <span>💾</span>
              Save Changes
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{
          marginTop: '24px',
          display: 'flex',
          gap: '32px',
          opacity: 0.9,
        }}>
          {[
            { label: 'Settings Sections', value: '25', icon: '⚙️' },
            { label: 'Integrations Available', value: '12', icon: '🔌' },
            { label: 'AI Models Supported', value: '8', icon: '🤖' },
            { label: 'Last Backup', value: '2 hours ago', icon: '💾' },
          ].map((stat, index) => (
            <div key={index} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{ fontSize: '16px' }}>{stat.icon}</span>
              <div>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: '700',
                }}>
                  {stat.value}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  opacity: 0.8,
                }}>
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add CSS Animation */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
};

export default SettingsHeader; 