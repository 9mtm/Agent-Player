import React from 'react';
import type { ConnectionStatus } from '../types';

interface ErrorScreenProps {
  error: string;
  connectionStatus: ConnectionStatus;
  isRetrying: boolean;
  onRetry: () => void;
  onWorkOffline: () => void;
}

const ErrorScreen: React.FC<ErrorScreenProps> = ({
  error,
  connectionStatus,
  isRetrying,
  onRetry,
  onWorkOffline,
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
      color: 'white',
      gap: '20px',
      textAlign: 'center',
      padding: '20px',
    }}>
      <div style={{ fontSize: '48px' }}>⚠️</div>
      
      <div style={{ fontSize: '24px', fontWeight: '700' }}>
        Dashboard Error
      </div>
      
      <div style={{ 
        fontSize: '16px', 
        opacity: 0.9, 
        maxWidth: '500px', 
        lineHeight: '1.5' 
      }}>
        {error}
      </div>
      
      {/* Connection Status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '20px',
        fontSize: '14px',
      }}>
        <div style={{ 
          width: '8px', 
          height: '8px', 
          borderRadius: '50%',
          background: connectionStatus === 'online' ? '#4caf50' : 
                     connectionStatus === 'checking' ? '#ff9800' : '#f44336'
        }} />
        <span>
          {connectionStatus === 'online' ? 'Connected' : 
           connectionStatus === 'checking' ? 'Checking...' : 'Offline Mode'}
        </span>
      </div>

      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        flexWrap: 'wrap', 
        justifyContent: 'center' 
      }}>
        <button 
          onClick={onRetry}
          disabled={isRetrying}
          style={{
            padding: '12px 24px',
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            color: 'white',
            cursor: isRetrying ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            opacity: isRetrying ? 0.7 : 1,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isRetrying) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          {isRetrying ? '🔄 Retrying...' : '🔄 Try Again'}
        </button>
        
        <button 
          onClick={onWorkOffline}
          style={{
            padding: '12px 24px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          }}
        >
          📱 Work Offline
        </button>
        
        <button 
          onClick={() => window.location.href = '/login'}
          style={{
            padding: '12px 24px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          }}
        >
          🚪 Login Again
        </button>
      </div>

      {/* Helpful Tips */}
      <div style={{
        marginTop: '20px',
        padding: '16px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        maxWidth: '400px',
        fontSize: '13px',
        lineHeight: '1.4',
      }}>
        <div style={{ fontWeight: '600', marginBottom: '8px' }}>
          💡 Troubleshooting Tips:
        </div>
        <ul style={{ 
          margin: 0, 
          paddingLeft: '16px', 
          textAlign: 'left' 
        }}>
          <li>Check your internet connection</li>
          <li>Try refreshing the page</li>
          <li>Clear browser cache and cookies</li>
          <li>Use "Work Offline" for limited functionality</li>
        </ul>
      </div>
    </div>
  );
};

export default ErrorScreen; 