import { useState, useEffect } from "react";
import { authService } from "../../../services/auth";
import type { User } from "../../../services/auth";
import type { DashboardStats, ConnectionStatus } from "../types";

export const useDashboardData = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("checking");

  // Mock data - in real application, this will come from API
  const [stats, setStats] = useState<DashboardStats>({
    agents: {
      total: 12,
      active: 8,
      mainAgents: 3,
      childAgents: 9,
    },
    tasks: {
      total: 156,
      completed: 128,
      pending: 23,
      failed: 5,
    },
    chats: {
      total: 1247,
      today: 34,
      thisWeek: 189,
    },
    workflows: {
      total: 45,
      running: 12,
      paused: 3,
    },
    system: {
      uptime: "72h 34m",
      cpuUsage: 23,
      memoryUsage: 67,
      apiCalls: 4567,
    },
  });

  useEffect(() => {
    loadUser();
    // Update statistics every 30 seconds
    const interval = setInterval(updateStats, 30000);
    // Update connection status every minute
    const connectionInterval = setInterval(checkConnection, 60000);

    return () => {
      clearInterval(interval);
      clearInterval(connectionInterval);
    };
  }, []);

  const loadUser = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Dashboard: Loading user data...");

      const userData = await authService.getCurrentUser();
      console.log("Dashboard: User data loaded:", userData);

      setUser(userData);
      setConnectionStatus("online");

      // Update last activity
      authService.updateLastActivity();
    } catch (err) {
      console.error("Dashboard: Error loading user:", err);

      // Try using stored user data
      const storedUser = authService.getStoredUser();
      if (storedUser) {
        console.log("Dashboard: Using stored user data");
        setUser(storedUser);
        setConnectionStatus("offline");
        setError("Using cached data. Some features may be unavailable.");
      } else {
        setError("Failed to load user data. Check your internet connection.");
        setConnectionStatus("offline");
      }
    } finally {
      setLoading(false);
    }
  };

  const checkConnection = async () => {
    try {
      setConnectionStatus("checking");
      const isConnected = await authService.retryConnection();
      setConnectionStatus(isConnected ? "online" : "offline");

      if (isConnected && error) {
        // If connection is restored, try to update data
        loadUser();
      }
    } catch {
      setConnectionStatus("offline");
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    await loadUser();
    setIsRetrying(false);
  };

  const handleWorkOffline = () => {
    const demoUser = authService.getDemoUser();
    setUser(demoUser);
    setError(null);
    setConnectionStatus("offline");
  };

  const updateStats = () => {
    // Simulate statistics update
    setStats((prev) => ({
      ...prev,
      system: {
        ...prev.system,
        cpuUsage: Math.random() * 100,
        memoryUsage: Math.random() * 100,
        apiCalls: prev.system.apiCalls + Math.floor(Math.random() * 10),
      },
    }));
  };

  return {
    user,
    loading,
    error,
    isRetrying,
    connectionStatus,
    stats,
    loadUser,
    checkConnection,
    handleRetry,
    handleWorkOffline,
    updateStats,
  };
};
