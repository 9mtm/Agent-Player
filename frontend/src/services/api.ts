import axios from "axios";
import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import config from "../config";

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

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 30000,
  withCredentials: false,
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    console.log(
      `🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`,
      {
        baseURL: config.baseURL,
        fullUrl: `${config.baseURL}${config.url}`,
        headers: config.headers,
        data: config.data,
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

// Handle responses and errors
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status}`, {
      url: response.config.url,
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error("❌ API Response Error:", {
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });

    // Log for debugging
    if (error.response?.status === 401) {
      console.log("API: 401 error on:", error.config?.url);
      console.warn(
        "🔒 Received 401 Unauthorized, clearing auth data and redirecting to login"
      );

      // Clear expired/invalid token data
      clearAuthData();

      // Redirect to login page if not already there
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    // Don't auto-redirect on 401 - let ProtectedRoute handle it
    // This prevents the race condition that causes white screen
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
