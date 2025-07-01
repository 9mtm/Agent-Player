import { apiCall } from "./api";

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  phone?: string;
  job_title?: string;
  company?: string;
  department?: string;
  profession?: string;
  experience_years?: number;
  skills: string[];
  timezone: string;
  language: string;
  country?: string;
  city?: string;

  // Account Status
  is_active: boolean;
  is_verified: boolean;
  subscription_type: string;
  role: string;

  // Privacy Settings
  profile_visibility: string;
  searchable: boolean;
  allow_messages: boolean;
  show_email: boolean;
  show_phone: boolean;
  show_location: boolean;

  // Notification Preferences
  email_notifications: boolean;
  push_notifications: boolean;
  marketing_emails: boolean;
  news_updates: boolean;

  // UI Preferences
  theme: string;
  ui_language: string;
  date_format: string;
  time_format: string;

  // Statistics
  total_agents: number;
  total_tasks: number;
  total_projects: number;
  storage_used: number;
  storage_limit: number;
  login_count: number;

  // Timestamps
  created_at: string;
  updated_at: string;
  last_login?: string;
  last_active: string;
}

export interface UserAddress {
  id?: number;
  street: string;
  city: string;
  state?: string;
  country: string;
  postal_code?: string;
  address_type: "home" | "work" | "business" | "other";
  is_default: boolean;
  label?: string;
  latitude?: number;
  longitude?: number;
}

export interface UserLink {
  id?: number;
  title: string;
  url: string;
  link_type: string;
  description?: string;
  is_public: boolean;
  order_index?: number;
}

export interface UserFile {
  id: number;
  filename: string;
  original_name: string;
  file_size: number;
  file_type: string;
  category: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  url: string;
}

export interface Country {
  code: string;
  name: string;
  flag: string;
  cities: City[];
}

export interface City {
  id: string;
  name: string;
}

export interface SettingsResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

class SettingsService {
  private readonly baseUrl = "/users";

  // Settings Overview - Fixed URL
  async getSettingsOverview(): Promise<SettingsResponse<any>> {
    return apiCall(`${this.baseUrl}/settings`, {
      method: "GET",
    });
  }

  async getAllSettings(): Promise<SettingsResponse<any>> {
    return apiCall(`${this.baseUrl}/settings`, {
      method: "GET",
    });
  }

  // Theme Settings - Map to main settings
  async getThemeSettings(): Promise<SettingsResponse<any>> {
    const result = await apiCall(`${this.baseUrl}/preferences`, {
      method: "GET",
    });

    // Extract theme-related preferences
    const themeSettings = {
      theme: result.data?.theme || "light",
      ui_language: result.data?.ui_language || "en",
      animations_enabled: result.data?.animations_enabled !== false,
    };

    return {
      success: true,
      data: themeSettings,
    };
  }

  async updateThemeSettings(themeData: any): Promise<SettingsResponse<any>> {
    return apiCall(`${this.baseUrl}/preferences`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(themeData),
    });
  }

  // Security Settings - Map to main settings
  async getSecuritySettings(): Promise<SettingsResponse<any>> {
    const result = await apiCall(`${this.baseUrl}/preferences`, {
      method: "GET",
    });

    // Extract security-related preferences
    const securitySettings = {
      login_alerts: result.data?.security_login_alerts !== false,
      session_timeout: result.data?.security_session_timeout || 3600,
      two_factor_enabled: result.data?.two_factor_enabled || false,
    };

    return {
      success: true,
      data: securitySettings,
    };
  }

  async updateSecuritySettings(
    securityData: any
  ): Promise<SettingsResponse<any>> {
    // Map security data to preferences format
    const preferencesUpdate = {
      security_login_alerts: securityData.login_alerts,
      security_session_timeout: securityData.session_timeout,
      two_factor_enabled: securityData.two_factor_enabled,
    };

    return apiCall(`${this.baseUrl}/preferences`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferencesUpdate),
    });
  }

  // Notification Settings - Map to main settings
  async getNotificationSettings(): Promise<SettingsResponse<any>> {
    const result = await apiCall(`${this.baseUrl}/preferences`, {
      method: "GET",
    });

    // Extract notification-related preferences
    const notificationSettings = {
      email_notifications: result.data?.email_notifications !== false,
      push_notifications: result.data?.push_notifications !== false,
      marketing_emails: result.data?.marketing_emails || false,
    };

    return {
      success: true,
      data: notificationSettings,
    };
  }

  async updateNotificationSettings(
    notificationData: any
  ): Promise<SettingsResponse<any>> {
    // Map notification data to preferences format
    const preferencesUpdate = {
      email_notifications: notificationData.email_notifications,
      push_notifications: notificationData.push_notifications,
      marketing_emails: notificationData.marketing_emails,
    };

    return apiCall(`${this.baseUrl}/preferences`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferencesUpdate),
    });
  }

  // AI Model Settings - Map to main settings
  async getAIModelSettings(): Promise<SettingsResponse<any>> {
    const result = await apiCall(`${this.baseUrl}/preferences`, {
      method: "GET",
    });

    // Extract AI-related preferences
    const aiSettings = {
      ai_suggestions_enabled: result.data?.ai_suggestions_enabled !== false,
      ai_auto_complete: result.data?.ai_auto_complete !== false,
      default_model: result.data?.default_model || "openai",
    };

    return {
      success: true,
      data: aiSettings,
    };
  }

  async updateAIModelSettings(
    aiModelData: any
  ): Promise<SettingsResponse<any>> {
    // Map AI model data to preferences format
    const preferencesUpdate = {
      ai_suggestions_enabled: aiModelData.ai_suggestions_enabled,
      ai_auto_complete: aiModelData.ai_auto_complete,
      default_model: aiModelData.default_model,
    };

    return apiCall(`${this.baseUrl}/preferences`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferencesUpdate),
    });
  }

  // Integration Settings - Map to main settings
  async getIntegrationSettings(): Promise<SettingsResponse<any>> {
    const result = await apiCall(`${this.baseUrl}/preferences`, {
      method: "GET",
    });

    // Extract integration-related preferences
    const integrationSettings = {
      integrations_enabled: result.data?.integrations_enabled !== false,
      third_party_access: result.data?.third_party_access || false,
    };

    return {
      success: true,
      data: integrationSettings,
    };
  }

  async updateIntegrationSettings(
    integrationData: any
  ): Promise<SettingsResponse<any>> {
    // Map integration data to preferences format
    const preferencesUpdate = {
      integrations_enabled: integrationData.integrations_enabled,
      third_party_access: integrationData.third_party_access,
    };

    return apiCall(`${this.baseUrl}/preferences`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferencesUpdate),
    });
  }

  // Advanced Settings - Map to main settings
  async getAdvancedSettings(): Promise<SettingsResponse<any>> {
    const result = await apiCall(`${this.baseUrl}/preferences`, {
      method: "GET",
    });

    // Extract advanced preferences
    const advancedSettings = {
      debug_mode: result.data?.debug_mode || false,
      telemetry_enabled: result.data?.telemetry_enabled !== false,
      auto_updates: result.data?.auto_updates !== false,
    };

    return {
      success: true,
      data: advancedSettings,
    };
  }

  async updateAdvancedSettings(
    advancedData: any
  ): Promise<SettingsResponse<any>> {
    // Map advanced data to preferences format
    const preferencesUpdate = {
      debug_mode: advancedData.debug_mode,
      telemetry_enabled: advancedData.telemetry_enabled,
      auto_updates: advancedData.auto_updates,
    };

    return apiCall(`${this.baseUrl}/preferences`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferencesUpdate),
    });
  }

  // Logs - Map to activity endpoint
  async getSettingsLogs(): Promise<SettingsResponse<any>> {
    return apiCall(`${this.baseUrl}/activity`, {
      method: "GET",
    });
  }

  // Health Check - Map to profile endpoint
  async getSettingsHealth(): Promise<SettingsResponse<any>> {
    try {
      const profileResult = await apiCall(`${this.baseUrl}/profile`, {
        method: "GET",
      });

      return {
        success: true,
        data: {
          status: "healthy",
          profile_accessible: true,
          last_updated:
            profileResult.data?.updated_at || new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        data: {
          status: "unhealthy",
          profile_accessible: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  // Profile Management
  async getUserProfile(): Promise<
    SettingsResponse<{
      user: UserProfile;
      addresses: UserAddress[];
      links: UserLink[];
      files: UserFile[];
    }>
  > {
    return apiCall(`${this.baseUrl}/profile`, {
      method: "GET",
    });
  }

  async updateUserProfile(
    profileData: Partial<UserProfile>
  ): Promise<SettingsResponse<UserProfile>> {
    return apiCall(`${this.baseUrl}/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profileData),
    });
  }

  // Address Management
  async createAddress(
    addressData: Omit<UserAddress, "id">
  ): Promise<SettingsResponse<UserAddress>> {
    return apiCall(`${this.baseUrl}/addresses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(addressData),
    });
  }

  async updateAddress(
    addressId: number,
    addressData: Partial<UserAddress>
  ): Promise<SettingsResponse<UserAddress>> {
    return apiCall(`${this.baseUrl}/addresses/${addressId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(addressData),
    });
  }

  async deleteAddress(addressId: number): Promise<SettingsResponse<null>> {
    return apiCall(`${this.baseUrl}/addresses/${addressId}`, {
      method: "DELETE",
    });
  }

  // Links Management
  async createLink(
    linkData: Omit<UserLink, "id">
  ): Promise<SettingsResponse<UserLink>> {
    return apiCall(`${this.baseUrl}/links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(linkData),
    });
  }

  async updateLink(
    linkId: number,
    linkData: Partial<UserLink>
  ): Promise<SettingsResponse<UserLink>> {
    return apiCall(`${this.baseUrl}/links/${linkId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(linkData),
    });
  }

  async deleteLink(linkId: number): Promise<SettingsResponse<null>> {
    return apiCall(`${this.baseUrl}/links/${linkId}`, {
      method: "DELETE",
    });
  }

  // File Management
  async uploadFile(
    file: File,
    category: string = "other",
    description?: string,
    isPublic: boolean = false
  ): Promise<
    SettingsResponse<{
      id: number;
      filename: string;
      original_name: string;
      size: number;
      type: string;
      category: string;
      url: string;
    }>
  > {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);
    formData.append("is_public", isPublic.toString());
    if (description) {
      formData.append("description", description);
    }

    return apiCall(`${this.baseUrl}/files/upload`, {
      method: "POST",
      body: formData,
    });
  }

  async deleteFile(fileId: number): Promise<SettingsResponse<null>> {
    return apiCall(`${this.baseUrl}/files/${fileId}`, {
      method: "DELETE",
    });
  }

  // Settings Export/Import
  async exportSettings(): Promise<
    SettingsResponse<{
      profile: Record<string, any>;
      preferences: Record<string, any>;
      privacy: Record<string, any>;
      addresses: any[];
      links: any[];
      export_date: string;
      version: string;
    }>
  > {
    return apiCall(`${this.baseUrl}/export`, {
      method: "GET",
    });
  }

  // Countries and Cities
  async getCountries(): Promise<SettingsResponse<Country[]>> {
    return apiCall(`${this.baseUrl}/countries`, {
      method: "GET",
    });
  }

  // Utility Methods
  downloadExportData(
    data: any,
    filename: string = "dpro-settings-export.json"
  ) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  getCountryFlag(countryCode: string): string {
    const flags: Record<string, string> = {
      SA: "🇸🇦",
      AE: "🇦🇪",
      EG: "🇪🇬",
      US: "🇺🇸",
      GB: "🇬🇧",
      FR: "🇫🇷",
      DE: "🇩🇪",
    };
    return flags[countryCode] || "🏳️";
  }

  getLinkTypeIcon(linkType: string): string {
    const icons: Record<string, string> = {
      website: "🌐",
      linkedin: "💼",
      github: "💻",
      twitter: "🐦",
      facebook: "📘",
      instagram: "📷",
      youtube: "📺",
      portfolio: "🎨",
      blog: "📝",
      other: "🔗",
    };
    return icons[linkType] || "🔗";
  }

  getFileTypeIcon(fileType: string): string {
    const icons: Record<string, string> = {
      ".pdf": "📄",
      ".doc": "📝",
      ".docx": "📝",
      ".txt": "📄",
      ".jpg": "🖼️",
      ".jpeg": "🖼️",
      ".png": "🖼️",
      ".gif": "🖼️",
      ".mp4": "🎥",
      ".mp3": "🎵",
      ".zip": "📦",
      ".rar": "📦",
      ".csv": "📊",
      ".xlsx": "📊",
    };
    return icons[fileType.toLowerCase()] || "📎";
  }

  // Theme and UI Utilities
  applyTheme(theme: string) {
    const root = document.documentElement;
    switch (theme) {
      case "dark":
        root.style.setProperty("--bg-primary", "#1a1a1a");
        root.style.setProperty("--bg-secondary", "#2d2d2d");
        root.style.setProperty("--text-primary", "#ffffff");
        root.style.setProperty("--text-secondary", "#cccccc");
        break;
      case "light":
        root.style.setProperty("--bg-primary", "#ffffff");
        root.style.setProperty("--bg-secondary", "#f8f9fa");
        root.style.setProperty("--text-primary", "#333333");
        root.style.setProperty("--text-secondary", "#666666");
        break;
      default:
        // Auto theme - detect system preference
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        this.applyTheme(prefersDark ? "dark" : "light");
    }
  }
}

export const settingsService = new SettingsService();
