import { useState, useEffect } from "react";
import type { DashboardConfig } from "../types";

const DEFAULT_CONFIG: DashboardConfig = {
  showQuickActions: true,
  showSystemStats: true,
  showRecentActivity: true,
  showPerformanceMetrics: true,
  defaultView: "overview",
};

export const useDashboardConfig = () => {
  const [config, setConfig] = useState<DashboardConfig>(DEFAULT_CONFIG);

  // Load settings from localStorage on initialization
  useEffect(() => {
    const savedConfig = localStorage.getItem("dashboardConfig");
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig({ ...DEFAULT_CONFIG, ...parsedConfig });
      } catch (err) {
        console.error("Failed to load dashboard config:", err);
        // If loading fails, use default settings
        setConfig(DEFAULT_CONFIG);
      }
    }
  }, []);

  const updateConfig = (
    key: keyof DashboardConfig,
    value: boolean | string
  ) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);

    // Save settings to localStorage
    try {
      localStorage.setItem("dashboardConfig", JSON.stringify(newConfig));
    } catch (err) {
      console.error("Failed to save dashboard config:", err);
    }
  };

  const resetConfig = () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem("dashboardConfig");
  };

  const exportConfig = () => {
    return JSON.stringify(config, null, 2);
  };

  const importConfig = (configString: string) => {
    try {
      const importedConfig = JSON.parse(configString);
      const validatedConfig = { ...DEFAULT_CONFIG, ...importedConfig };
      setConfig(validatedConfig);
      localStorage.setItem("dashboardConfig", JSON.stringify(validatedConfig));
      return true;
    } catch (err) {
      console.error("Failed to import config:", err);
      return false;
    }
  };

  return {
    config,
    updateConfig,
    resetConfig,
    exportConfig,
    importConfig,
  };
};
