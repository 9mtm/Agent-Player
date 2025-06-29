import axios from "axios";
import type {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosError,
  CreateAxiosDefaults,
  AxiosResponse,
} from "axios";
import config from "../config";

// Custom types for our extended Axios configuration
interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryCondition: (error: AxiosError) => boolean;
}

interface CustomAxiosConfig extends CreateAxiosDefaults {
  retryConfig?: RetryConfig;
}

interface CustomInternalAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: {
    startTime: Date;
  };
  _retry?: number;
  retryConfig?: RetryConfig;
}

// API Base URL - from central configuration
const API_BASE_URL = config.api.baseURL;

// Helper function to check if token is expired
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const now = Date.now() / 1000;
    return payload.exp < now;
  } catch (error) {
    console.error("Error checking token expiration:", error);
    return true;
  }
};

// Helper function to clear auth data
const clearAuthData = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
  delete api.defaults.headers.common["Authorization"];
};

// Create axios instance with standardized configuration
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL, // No /api/v1 prefix - endpoints are now standardized
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 10000, // Default timeout reduced to 10 seconds
  withCredentials: false,
  // Add retry configuration
  retryConfig: {
    retries: 2,
    retryDelay: 1000,
    retryCondition: (error: AxiosError) => {
      return (
        axios.isAxiosError(error) &&
        (error.code === "ECONNABORTED" ||
          error.code === "ETIMEDOUT" ||
          (error.response && error.response.status >= 500))
      );
    },
  },
} as CustomAxiosConfig);

// Add request interceptor for debugging
api.interceptors.request.use(
  (config: CustomInternalAxiosRequestConfig) => {
    // Add request timestamp for timeout tracking
    config.metadata = { startTime: new Date() };

    console.log(
      `🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`,
      {
        baseURL: config.baseURL,
        fullUrl: `${config.baseURL}${config.url}`,
        headers: config.headers,
        data: config.data,
        timeout: config.timeout,
      }
    );

    const token = localStorage.getItem("access_token");
    if (token && config.headers) {
      // Check if token is expired before using it
      if (isTokenExpired(token)) {
        console.warn("🔒 Token is expired, clearing auth data");
        clearAuthData();
        // Redirect to login page
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(new Error("Token expired"));
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error("🔥 API Request Error:", error);
    return Promise.reject(error);
  }
);

// Handle responses and errors with retry logic
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Calculate request duration
    const config = response.config as CustomInternalAxiosRequestConfig;
    const duration = config.metadata
      ? new Date().getTime() - new Date(config.metadata.startTime).getTime()
      : 0;

    console.log(`✅ API Response: ${response.status}`, {
      url: response.config.url,
      status: response.status,
      duration: `${duration}ms`,
      data: response.data,
    });
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as CustomInternalAxiosRequestConfig;
    const retryConfig = config.retryConfig;

    // Check if we should retry the request
    if (
      retryConfig &&
      (!config._retry || config._retry < retryConfig.retries) &&
      retryConfig.retryCondition(error)
    ) {
      config._retry = (config._retry || 0) + 1;

      // Wait before retrying
      await new Promise((resolve) =>
        setTimeout(resolve, retryConfig.retryDelay)
      );

      // Increase timeout for retry
      config.timeout = config.timeout ? config.timeout * 1.5 : 15000;

      console.log(`🔄 Retrying request (attempt ${config._retry}):`, {
        url: config.url,
        timeout: config.timeout,
      });

      return api(config);
    }

    console.error("❌ API Response Error:", {
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      retryAttempts: config?._retry || 0,
    });

    if (error.response?.status === 401) {
      console.warn("🔒 Received 401 Unauthorized, clearing auth data");
      clearAuthData();

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

// Helper functions for data handling - ALL CODE IN ENGLISH
export const setAuthToken = (token: string) => {
  // Validate token before setting
  if (isTokenExpired(token)) {
    console.warn("🔒 Attempted to set expired token");
    return;
  }

  localStorage.setItem("access_token", token);
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};

export const removeAuthToken = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
  delete api.defaults.headers.common["Authorization"];
};

export const isAuthenticated = () => {
  const token = localStorage.getItem("access_token");
  if (!token) return false;

  // Check if token is expired
  if (isTokenExpired(token)) {
    console.warn("🔒 Token in localStorage is expired, clearing auth data");
    clearAuthData();
    return false;
  }

  return true;
};

// Helper function for API calls - ALL CODE IN ENGLISH
export const apiCall = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("access_token");

  // Check token validity before making request
  if (token && isTokenExpired(token)) {
    console.warn("🔒 Token expired during API call, clearing auth data");
    clearAuthData();
    throw new Error("Token expired");
  }

  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      console.warn("🔒 Received 401 from fetch API call, clearing auth data");
      clearAuthData();
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

export default api;
