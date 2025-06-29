import { apiCall } from "./api";

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role: string;
  is_active: boolean;
  is_superuser: boolean;
  is_verified?: boolean;
  avatar_url?: string;
  bio?: string;
  job_title?: string;
  company?: string;
  department?: string;
  timezone?: string;
  language?: string;
  country?: string;
  city?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  last_activity?: string;
}

export interface UserPreferences {
  theme: string;
  language: string;
  timezone: string;
  email_notifications: boolean;
  push_notifications: boolean;
  marketing_emails: boolean;
  two_factor_enabled: boolean;
  profile_visibility: string;
  show_email: boolean;
  show_phone: boolean;
}

export interface UserStats {
  total_agents: number;
  total_tasks: number;
  total_conversations: number;
  total_projects: number;
  storage_used: number;
  storage_limit: number;
  login_count: number;
}

export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  bio?: string;
  job_title?: string;
  company?: string;
  department?: string;
  timezone?: string;
  language?: string;
  country?: string;
  city?: string;
}

export interface UsersResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

class UsersService {
  private readonly baseUrl = "/users";

  // Profile Management
  async getCurrentUser(): Promise<UsersResponse<User>> {
    return apiCall(`${this.baseUrl}/profile`, {
      method: "GET",
    });
  }

  async updateProfile(
    profileData: ProfileUpdateData
  ): Promise<UsersResponse<User>> {
    return apiCall(`${this.baseUrl}/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profileData),
    });
  }

  async uploadAvatar(
    file: File
  ): Promise<UsersResponse<{ avatar_url: string }>> {
    const formData = new FormData();
    formData.append("avatar", file);

    return apiCall(`${this.baseUrl}/profile/avatar`, {
      method: "POST",
      body: formData,
    });
  }

  // User Preferences
  async getPreferences(): Promise<UsersResponse<UserPreferences>> {
    return apiCall(`${this.baseUrl}/preferences`, {
      method: "GET",
    });
  }

  async updatePreferences(
    preferences: Partial<UserPreferences>
  ): Promise<UsersResponse<UserPreferences>> {
    return apiCall(`${this.baseUrl}/preferences`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferences),
    });
  }

  // User Statistics
  async getUserStats(): Promise<UsersResponse<UserStats>> {
    return apiCall(`${this.baseUrl}/statistics`, {
      method: "GET",
    });
  }

  // Password Management
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<UsersResponse<null>> {
    return apiCall(`${this.baseUrl}/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
  }

  // Utility Methods
  getInitials(user: User): string {
    if (user.first_name && user.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    }
    if (user.full_name) {
      const names = user.full_name.split(" ");
      return names.length > 1
        ? `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase()
        : names[0].charAt(0).toUpperCase();
    }
    return user.username.charAt(0).toUpperCase();
  }

  getDisplayName(user: User): string {
    if (user.full_name) return user.full_name;
    if (user.first_name && user.last_name)
      return `${user.first_name} ${user.last_name}`;
    return user.username;
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    if (!/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const usersService = new UsersService();
export default usersService;
