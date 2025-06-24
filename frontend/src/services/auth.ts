import api, { setAuthToken, removeAuthToken } from "./api";

// Types for authentication
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username?: string;
  full_name?: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface SystemStatus {
  admin_exists: boolean;
  system_initialized: boolean;
  requires_setup: boolean;
  message: string;
}

export interface AdminSetupData {
  email: string;
  username: string;
  full_name: string;
  password: string;
}

export interface UsersListResponse {
  users: User[];
  total: number;
}

// Authentication Service - Updated to use new API structure
class AuthService {
  // User login
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      console.log("Starting login request...", { email: credentials.email });

      const requestData = {
        email: credentials.email,
        password: credentials.password,
      };

      const response = await api.post("/auth/login", requestData, {
        timeout: 15000,
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Handle new response format
      const authData: AuthResponse = response.data.data || response.data;

      if (!authData.access_token) {
        throw new Error("No access token received from server");
      }

      // Save data to localStorage
      setAuthToken(authData.access_token);
      localStorage.setItem("user", JSON.stringify(authData.user));
      localStorage.setItem("lastLoginTime", new Date().toISOString());
      this.updateLastActivity();

      return authData;
    } catch (error: unknown) {
      console.error("Login failed:", error);
      throw new Error(
        "Login failed. Please check your credentials and try again."
      );
    }
  }

  // Register new admin user
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await api.post("/auth/register/admin", userData);

      // Handle new response format
      const authData: AuthResponse = response.data.data || response.data;

      // Save data to localStorage
      if (authData.access_token) {
        setAuthToken(authData.access_token);
        localStorage.setItem("user", JSON.stringify(authData.user));
        localStorage.setItem("lastLoginTime", new Date().toISOString());
        this.updateLastActivity();
      }

      return authData;
    } catch (error) {
      console.error("Registration failed:", error);
      throw new Error("User registration failed. Please try again.");
    }
  }

  // User logout
  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      removeAuthToken();
      localStorage.removeItem("user");
      localStorage.removeItem("lastLoginTime");
      localStorage.removeItem("lastActivity");
    }
  }

  // Get current user information
  async getCurrentUser(): Promise<User> {
    try {
      const response = await api.get("/auth/me");

      // Handle new wrapped response format
      if (response.data.success && response.data.data) {
        // Backend is returning wrapped format: {success: true, data: userData}
        return response.data.data;
      } else if (response.data.id) {
        // Backend is returning direct user data
        return response.data;
      } else {
        // Fallback - extract user data from any nested structure
        const userData =
          response.data.user || response.data.data || response.data;

        // Ensure required fields are present
        return {
          id: userData.id || userData.user_id || 1,
          email: userData.email || "user@dpro-agent.com",
          username: userData.username || userData.name || "User",
          full_name: userData.full_name || userData.name || "User",
          is_active:
            userData.is_active !== undefined ? userData.is_active : true,
          is_superuser: userData.is_superuser || false,
        };
      }
    } catch (error) {
      console.error("Get current user failed:", error);
      throw new Error("Failed to get user information.");
    }
  }

  // Update user profile
  async updateProfile(userData: Partial<User>): Promise<User> {
    try {
      const response = await api.put("/users/profile", userData);

      // Handle new response format
      const updatedUser = response.data.data || response.data;

      // Update local data
      localStorage.setItem("user", JSON.stringify(updatedUser));

      return updatedUser;
    } catch (error) {
      console.error("Update profile failed:", error);
      throw new Error("Failed to update profile.");
    }
  }

  // Update password
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      await api.put("/users/password", {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: newPassword,
      });
    } catch (error) {
      console.error("Change password failed:", error);
      throw new Error("Failed to change password.");
    }
  }

  // Get user from localStorage
  getCurrentUserFromStorage(): User | null {
    try {
      const userJson = localStorage.getItem("user");
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error("Error parsing user from localStorage:", error);
      return null;
    }
  }

  // Alias for getCurrentUserFromStorage (for compatibility)
  getStoredUser(): User | null {
    return this.getCurrentUserFromStorage();
  }

  // Update last activity timestamp
  updateLastActivity(): void {
    try {
      localStorage.setItem("lastActivity", new Date().toISOString());
      console.log("Last activity updated");
    } catch (error) {
      console.error("Error updating last activity:", error);
    }
  }

  // Try to reconnect to server
  async retryConnection(): Promise<boolean> {
    try {
      const response = await api.get("/auth/system/status", { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      console.log("Connection retry failed:", error);
      return false;
    }
  }

  // Get demo user for offline mode
  getDemoUser(): User {
    return {
      id: 1,
      email: "demo@dpro-agent.com",
      username: "demo_user",
      full_name: "Demo User",
      is_active: true,
      is_superuser: false,
    };
  }

  // Check if token is expired
  isTokenExpired(): boolean {
    const token = localStorage.getItem("access_token");
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const now = Date.now() / 1000;

      const isExpired = payload.exp < now;

      // If token is expired, clear auth data automatically
      if (isExpired) {
        console.warn(
          "🔒 Token expired in isTokenExpired check, clearing auth data"
        );
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
      }

      return isExpired;
    } catch (error) {
      console.error("Error checking token expiration:", error);
      // If we can't parse the token, consider it expired
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      return true;
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = localStorage.getItem("access_token");
    if (!token) return false;

    // Use the updated isTokenExpired method which auto-clears expired tokens
    return !this.isTokenExpired();
  }

  // Check system status for admin setup
  async checkSystemStatus(): Promise<SystemStatus> {
    try {
      const response = await api.get("/auth/system/status");
      return response.data.data || response.data;
    } catch (error) {
      console.error("System status check failed:", error);
      throw new Error("Failed to check system status.");
    }
  }

  // Setup first admin account
  async setupFirstAdmin(adminData: AdminSetupData): Promise<AuthResponse> {
    try {
      const response = await api.post("/auth/register/admin", adminData);

      // Handle new response format
      const authData: AuthResponse = response.data.data || response.data;

      if (authData.access_token) {
        // Save data to localStorage
        setAuthToken(authData.access_token);
        localStorage.setItem("user", JSON.stringify(authData.user));
        localStorage.setItem("lastLoginTime", new Date().toISOString());
        this.updateLastActivity();
      }

      return authData;
    } catch (error: unknown) {
      console.error("Admin setup failed:", error);
      const errorMessage =
        error instanceof Error && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : "Failed to setup admin account.";
      throw new Error(errorMessage || "Failed to setup admin account.");
    }
  }

  // Get admin users list (for admin only)
  async getAdminUsersList(): Promise<UsersListResponse> {
    try {
      const response = await api.get("/auth/users");
      return response.data.data || response.data;
    } catch (error) {
      console.error("Get admin users failed:", error);
      throw new Error("Failed to get users list.");
    }
  }
}

// Create single service instance
export const authService = new AuthService();

// Export default
export default authService;
