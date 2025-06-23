import React from 'react';
import { loadingOverlayStyle, loadingCardStyle } from '../utils/styles';

interface LoadingOverlayProps {
  message?: string;
  show: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  message = 'Loading tasks...', 
  show 
}) => {
  if (!show) return null;

  return (
    <div style={loadingOverlayStyle}>
      <div style={loadingCardStyle}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            fontSize: '1.5rem',
            animation: 'spin 1s linear infinite'
          }}>
            ⏳
          </div>
          <div style={{
            fontSize: '16px',
            fontWeight: '500',
            color: '#333'
          }}>
            {message}
          </div>
        </div>
      </div>
      
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}; 