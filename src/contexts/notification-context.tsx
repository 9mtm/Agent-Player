'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { config } from '@/lib/config';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'agent' | 'system' | 'reminder';
  channel: string;
  isRead: boolean;
  actionUrl: string | null;
  meta: Record<string, unknown> | null;
  source: string; // extensionId or 'system'
  createdAt: string;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearRead: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  refresh: async () => {},
  markRead: async () => {},
  markAllRead: async () => {},
  deleteNotification: async () => {},
  clearRead: async () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const authHeader = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const refresh = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${config.backendUrl}/api/notifications?limit=100`, {
        headers: authHeader(),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch { /* network error — ignore */ }
    finally { setLoading(false); }
  }, []);

  const markRead = useCallback(async (id: string) => {
    await fetch(`${config.backendUrl}/api/notifications/${id}/read`, {
      method: 'PATCH',
      headers: authHeader(),
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await fetch(`${config.backendUrl}/api/notifications/read-all`, {
      method: 'PATCH',
      headers: authHeader(),
    });
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    const target = notifications.find(n => n.id === id);
    await fetch(`${config.backendUrl}/api/notifications/${id}`, {
      method: 'DELETE',
      headers: authHeader(),
    });
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (target && !target.isRead) setUnreadCount(prev => Math.max(0, prev - 1));
  }, [notifications]);

  const clearRead = useCallback(async () => {
    await fetch(`${config.backendUrl}/api/notifications`, {
      method: 'DELETE',
      headers: authHeader(),
    });
    setNotifications(prev => prev.filter(n => !n.isRead));
  }, []);

  // Poll every 30 seconds for new notifications
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, loading,
      refresh, markRead, markAllRead, deleteNotification, clearRead,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
