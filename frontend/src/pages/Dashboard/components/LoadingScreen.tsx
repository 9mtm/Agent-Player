import React from 'react';
import type { ConnectionStatus } from '../types';

interface LoadingScreenProps {
  connectionStatus: ConnectionStatus;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ connectionStatus }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      gap: '20px',
    }}>
      <div style={{
        width: '60px',
        height: '60px',
        border: '4px solid rgba(255, 255, 255, 0.3)',
        borderTop: '4px solid white',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
      
      <div style={{ fontSize: '18px', fontWeight: '600' }}>
        Loading Dashboard...
      </div>
      
      <div style={{ 
        fontSize: '14px', 
        opacity: 0.8, 
        textAlign: 'center', 
        maxWidth: '300px' 
      }}>
        {connectionStatus === 'checking' 
          ? 'Checking connection...' 
          : 'Loading your AI agent data...'
        }
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen; 