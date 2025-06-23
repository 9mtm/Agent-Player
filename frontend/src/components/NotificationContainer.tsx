import React from 'react';
import { Notification, ConfirmDialog } from './ui/notification';

interface NotificationContainerProps {
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    duration?: number;
  }>;
  confirmDialog: {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'info' | 'warning' | 'danger';
  };
  onRemoveNotification: (id: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  confirmDialog,
  onRemoveNotification,
  onConfirm,
  onCancel,
}) => {
  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    pointerEvents: 'none', // Allow clicks to pass through empty areas
  };

  return (
    <>
      {/* Notifications Container */}
      <div style={containerStyle}>
        {notifications.map((notification) => (
          <div key={notification.id} style={{ pointerEvents: 'auto' }}>
            <Notification
              id={notification.id}
              type={notification.type}
              title={notification.title}
              message={notification.message}
              duration={notification.duration}
              onClose={onRemoveNotification}
            />
          </div>
        ))}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        type={confirmDialog.type}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </>
  );
}; 