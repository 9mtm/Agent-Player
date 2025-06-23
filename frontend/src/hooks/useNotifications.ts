import { useState, useCallback } from "react";

export interface NotificationItem {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  duration?: number;
}

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "info" | "warning" | "danger";
  onConfirm?: () => void;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: "",
    message: "",
  });

  const addNotification = useCallback(
    (
      type: NotificationItem["type"],
      title: string,
      message: string,
      duration?: number
    ) => {
      const id =
        Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const newNotification: NotificationItem = {
        id,
        type,
        title,
        message,
        duration: duration || 5000,
      };

      setNotifications((prev) => [...prev, newNotification]);
      return id;
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Helper functions for different notification types
  const showSuccess = useCallback(
    (title: string, message: string, duration?: number) => {
      return addNotification("success", title, message, duration);
    },
    [addNotification]
  );

  const showError = useCallback(
    (title: string, message: string, duration?: number) => {
      return addNotification("error", title, message, duration);
    },
    [addNotification]
  );

  const showWarning = useCallback(
    (title: string, message: string, duration?: number) => {
      return addNotification("warning", title, message, duration);
    },
    [addNotification]
  );

  const showInfo = useCallback(
    (title: string, message: string, duration?: number) => {
      return addNotification("info", title, message, duration);
    },
    [addNotification]
  );

  // Confirm dialog functions
  const showConfirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      options?: {
        confirmText?: string;
        cancelText?: string;
        type?: "info" | "warning" | "danger";
      }
    ) => {
      setConfirmDialog({
        isOpen: true,
        title,
        message,
        confirmText: options?.confirmText,
        cancelText: options?.cancelText,
        type: options?.type,
        onConfirm,
      });
    },
    []
  );

  const hideConfirm = useCallback(() => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmDialog.onConfirm) {
      confirmDialog.onConfirm();
    }
    hideConfirm();
  }, [confirmDialog.onConfirm, hideConfirm]);

  // Replacement functions for browser alerts
  const alert = useCallback(
    (message: string, title: string = "Alert") => {
      showInfo(title, message);
    },
    [showInfo]
  );

  const confirm = useCallback(
    (message: string, title: string = "Confirm", onConfirm: () => void) => {
      showConfirm(title, message, onConfirm, {
        confirmText: "Yes",
        cancelText: "Cancel",
        type: "warning",
      });
    },
    [showConfirm]
  );

  return {
    // Notifications state
    notifications,
    confirmDialog,

    // Notification functions
    addNotification,
    removeNotification,
    clearNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,

    // Confirm dialog functions
    showConfirm,
    hideConfirm,
    handleConfirm,

    // Browser replacement functions
    alert,
    confirm,
  };
};
