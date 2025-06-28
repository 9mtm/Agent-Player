import { useState, useEffect } from "react";
import type { SystemMetricsData } from "../types";

interface UseSystemInfoOptions {
  enabled?: boolean;
  refreshInterval?: number;
}

interface UseSystemInfoResult {
  data: SystemMetricsData | null;
  error: string | null;
  loading: boolean;
  lastUpdated: Date | null;
  isStale: boolean;
  refetch: () => Promise<void>;
  history: SystemMetricsData[];
  collectNow: () => Promise<void>;
}

export const useSystemInfo = (
  options: UseSystemInfoOptions = {}
): UseSystemInfoResult => {
  const [data, setData] = useState<SystemMetricsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [history, setHistory] = useState<SystemMetricsData[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "http://localhost:8000/api/system/metrics/latest"
      );
      const result = await response.json();

      if (result.success && result.data) {
        setData(result.data);
        setHistory((prev) => [...prev, result.data].slice(-24)); // Keep last 24 data points
        setLastUpdated(new Date());
        setError(null);
      } else {
        setError(result.message || "Failed to fetch system metrics");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch system metrics"
      );
    } finally {
      setLoading(false);
    }
  };

  const collectNow = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "http://localhost:8000/api/system/metrics/collect",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const result = await response.json();

      if (result.success && result.data) {
        setData(result.data);
        setHistory((prev) => [...prev, result.data].slice(-24));
        setLastUpdated(new Date());
        setError(null);
      } else {
        setError(result.message || "Failed to collect system metrics");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to collect system metrics"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (options.enabled !== false) {
      fetchData();

      const interval = setInterval(() => {
        fetchData();
      }, options.refreshInterval || 5000);

      return () => clearInterval(interval);
    }
  }, [options.enabled, options.refreshInterval]);

  const isStale = lastUpdated
    ? new Date().getTime() - lastUpdated.getTime() > 30000
    : false;

  return {
    data,
    error,
    loading,
    lastUpdated,
    isStale,
    refetch: fetchData,
    history,
    collectNow,
  };
};
