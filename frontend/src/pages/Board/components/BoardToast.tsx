import React, { useEffect, useState } from 'react';

interface BoardToastProps {
  message: string | null;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
}

export const BoardToast: React.FC<BoardToastProps> = ({ 
  message, 
  type = 'info', 
  duration = 3000,
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      setIsExiting(false);
      
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      setIsExiting(false);
    }
  }, [message, duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  };

  if (!message || !isVisible) return null;

  // Enhanced toast styles
  const toastStyle = {
    position: 'fixed' as const,
    bottom: '32px',
    left: '50%',
    transform: isExiting ? 'translateX(-50%) translateY(100%)' : 'translateX(-50%) translateY(0)',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(102, 126, 234, 0.2)',
    borderRadius: '16px',
    padding: '16px 24px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    zIndex: 9999,
    fontSize: '14px',
    fontWeight: '500',
    color: '#2c3e50',
    minWidth: '280px',
    maxWidth: '500px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: isExiting ? 0 : 1,
    animation: isExiting ? 'none' : 'slideUpBounce 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  };

  // Type-specific styles
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          borderColor: 'rgba(40, 167, 69, 0.3)',
          background: 'linear-gradient(135deg, rgba(40, 167, 69, 0.1), rgba(52, 168, 83, 0.1))',
          color: '#28a745',
        };
      case 'error':
        return {
          borderColor: 'rgba(220, 53, 69, 0.3)',
          background: 'linear-gradient(135deg, rgba(220, 53, 69, 0.1), rgba(233, 30, 99, 0.1))',
          color: '#dc3545',
        };
      case 'warning':
        return {
          borderColor: 'rgba(255, 193, 7, 0.3)',
          background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.1), rgba(255, 152, 0, 0.1))',
          color: '#f57c00',
        };
      default:
        return {
          borderColor: 'rgba(102, 126, 234, 0.3)',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
          color: '#667eea',
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <>
      <style>{`
        @keyframes slideUpBounce {
          0% {
            transform: translateX(-50%) translateY(100%);
            opacity: 0;
          }
          60% {
            transform: translateX(-50%) translateY(-10px);
            opacity: 1;
          }
          100% {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
        
        .toast-close-button {
          transition: all 0.2s ease;
        }
        
        .toast-close-button:hover {
          background: rgba(0, 0, 0, 0.1) !important;
          transform: scale(1.1);
        }
        
        @media (max-width: 768px) {
          .board-toast-responsive {
            bottom: 20px !important;
            left: 20px !important;
            right: 20px !important;
            transform: none !important;
            max-width: none !important;
            min-width: auto !important;
          }
          
          .board-toast-responsive.exiting {
            transform: translateY(100%) !important;
          }
        }
      `}</style>

      <div
        className={`board-toast-responsive ${isExiting ? 'exiting' : ''}`}
        style={{
          ...toastStyle,
          ...typeStyles,
        }}
      >
        {/* Icon */}
        <div style={{
          fontSize: '18px',
          lineHeight: '1',
          flexShrink: 0,
        }}>
          {getIcon()}
        </div>

        {/* Message */}
        <div style={{
          flex: 1,
          lineHeight: '1.4',
          wordBreak: 'break-word',
        }}>
          {message}
        </div>

        {/* Close Button */}
        <button
          className="toast-close-button"
          onClick={handleClose}
          style={{
            background: 'rgba(0, 0, 0, 0.05)',
            border: 'none',
            borderRadius: '6px',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '14px',
            color: 'inherit',
            flexShrink: 0,
          }}
          title="Close notification"
        >
          ✕
        </button>

        {/* Progress Bar */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '3px',
          background: 'currentColor',
          borderRadius: '0 0 16px 16px',
          opacity: 0.3,
          animation: `shrink ${duration}ms linear`,
        }} />
      </div>

      <style>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </>
  );
}; 