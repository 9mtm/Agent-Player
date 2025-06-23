import React, { useState, useEffect } from 'react';

export interface NotificationProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

export const Notification: React.FC<NotificationProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose(id);
    }, 300);
  };

  if (!isVisible) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#d4edda',
          borderColor: '#28a745',
          color: '#155724',
          icon: '✅',
        };
      case 'error':
        return {
          backgroundColor: '#f8d7da',
          borderColor: '#dc3545',
          color: '#721c24',
          icon: '❌',
        };
      case 'warning':
        return {
          backgroundColor: '#fff3cd',
          borderColor: '#ffc107',
          color: '#856404',
          icon: '⚠️',
        };
      case 'info':
        return {
          backgroundColor: '#d1ecf1',
          borderColor: '#17a2b8',
          color: '#0c5460',
          icon: 'ℹ️',
        };
      default:
        return {
          backgroundColor: '#f8f9fa',
          borderColor: '#6c757d',
          color: '#495057',
          icon: 'ℹ️',
        };
    }
  };

  const typeStyles = getTypeStyles();

  const notificationStyle: React.CSSProperties = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: typeStyles.backgroundColor,
    border: `2px solid ${typeStyles.borderColor}`,
    borderRadius: '12px',
    padding: '16px 20px',
    maxWidth: '400px',
    minWidth: '300px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
    zIndex: 10000,
    transform: isExiting ? 'translateX(120%)' : 'translateX(0)',
    opacity: isExiting ? 0 : 1,
    transition: 'all 0.3s ease-in-out',
    color: typeStyles.color,
    fontFamily: 'inherit',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: '600',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const messageStyle: React.CSSProperties = {
    fontSize: '14px',
    lineHeight: '1.5',
    margin: 0,
    whiteSpace: 'pre-line',
  };

  const closeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    color: typeStyles.color,
    opacity: 0.7,
    transition: 'opacity 0.2s ease',
  };

  return (
    <div style={notificationStyle}>
      <div style={headerStyle}>
        <h4 style={titleStyle}>
          <span>{typeStyles.icon}</span>
          {title}
        </h4>
        <button
          style={closeButtonStyle}
          onClick={handleClose}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
        >
          ×
        </button>
      </div>
      <p style={messageStyle}>{message}</p>
    </div>
  );
};

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  type = 'info',
  onConfirm,
  onCancel,
}) => {
  // Add keyframe animation via a style tag
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes dialogSlideIn {
        from {
          opacity: 0;
          transform: scale(0.9) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'warning':
        return {
          icon: '⚠️',
          confirmButtonColor: '#ffc107',
          confirmButtonHoverColor: '#e0a800',
        };
      case 'danger':
        return {
          icon: '🚨',
          confirmButtonColor: '#dc3545',
          confirmButtonHoverColor: '#c82333',
        };
      default:
        return {
          icon: 'ℹ️',
          confirmButtonColor: '#667eea',
          confirmButtonHoverColor: '#5a6fd8',
        };
    }
  };

  const typeStyles = getTypeStyles();

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px',
  };

  const dialogStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    transform: 'scale(1)',
    animation: 'dialogSlideIn 0.3s ease-out',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '600',
    margin: 0,
    color: '#2c3e50',
  };

  const messageStyle: React.CSSProperties = {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#495057',
    marginBottom: '24px',
    whiteSpace: 'pre-line',
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };

  const cancelButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#f8f9fa',
    color: '#495057',
    border: '1px solid #dee2e6',
  };

  const confirmButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: typeStyles.confirmButtonColor,
    color: 'white',
  };

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <span style={{ fontSize: '24px' }}>{typeStyles.icon}</span>
          <h3 style={titleStyle}>{title}</h3>
        </div>
        <p style={messageStyle}>{message}</p>
        <div style={actionsStyle}>
          <button
            style={cancelButtonStyle}
            onClick={onCancel}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e9ecef';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f9fa';
            }}
          >
            {cancelText}
          </button>
          <button
            style={confirmButtonStyle}
            onClick={onConfirm}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = typeStyles.confirmButtonHoverColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = typeStyles.confirmButtonColor;
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}; 