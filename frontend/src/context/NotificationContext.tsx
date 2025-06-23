import React, { createContext, useContext, ReactNode } from 'react';
import { useNotifications } from '../hooks/useNotifications';

type NotificationContextType = ReturnType<typeof useNotifications>;

const NotificationContext = createContext<NotificationContextType | null>(null);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const notifications = useNotifications();

  return (
    <NotificationContext.Provider value={notifications}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}; 