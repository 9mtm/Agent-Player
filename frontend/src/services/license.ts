import api from "./api";
import type {
  License,
  LicenseInfo,
  LicenseActivation,
  OnlineLicenseRequest,
  OnlineLicenseResponse,
  LicenseValidation,
  LicenseStats,
  LicenseStatus,
} from "../types/license";

export const licenseService = {
  // Request license from online server
  async requestLicenseOnline(
    request: OnlineLicenseRequest
  ): Promise<OnlineLicenseResponse> {
    const response = await api.post("/auth/request-license", request);
    return response.data;
  },

  // Register with license activation
  async registerWithLicense(
    userData: {
      username: string;
      email: string;
      password: string;
      full_name?: string;
    },
    licenseData: LicenseActivation
  ) {
    const response = await api.post("/auth/register-with-license", {
      ...userData,
      ...licenseData,
    });
    return response.data;
  },

  // Activate existing license
  async activateLicense(activation: LicenseActivation): Promise<License> {
    const response = await api.post("/license/activate", activation);
    return response.data;
  },

  // Get current user's license info
  async getCurrentLicense(): Promise<LicenseInfo> {
    const response = await api.get("/license/current");
    return response.data;
  },

  // Validate license key
  async validateLicense(licenseKey: string): Promise<LicenseValidation> {
    const response = await api.post(`/license/validate/${licenseKey}`);
    return response.data;
  },

  // Verify license online
  async verifyLicenseOnline(licenseKey: string) {
    const response = await api.post(`/license/verify/${licenseKey}`);
    return response.data;
  },

  // Get license details by ID
  async getLicense(licenseId: number): Promise<License> {
    const response = await api.get(`/license/${licenseId}`);
    return response.data;
  },

  // Check license limits
  async checkLimits() {
    const response = await api.get("/license/limits/check");
    return response.data;
  },

  // Update license usage (admin only)
  async updateUsage(
    licenseId: number,
    usage: {
      current_users?: number;
      current_agents?: number;
      current_tasks?: number;
      current_conversations?: number;
    }
  ): Promise<License> {
    const response = await api.put(`/license/usage/${licenseId}`, usage);
    return response.data;
  },

  // Get license statistics (admin only)
  async getStats(): Promise<LicenseStats> {
    const response = await api.get("/license/stats");
    return response.data;
  },

  // List licenses (admin only)
  async listLicenses(
    statusFilter?: LicenseStatus,
    skip = 0,
    limit = 100
  ): Promise<License[]> {
    const params = new URLSearchParams();
    if (statusFilter) params.append("status_filter", statusFilter);
    params.append("skip", skip.toString());
    params.append("limit", limit.toString());

    const response = await api.get(`/license/list?${params}`);
    return response.data;
  },

  // Cleanup expired licenses (admin only)
  async cleanupExpired() {
    const response = await api.post("/license/cleanup-expired");
    return response.data;
  },

  // Add user to existing license (admin only)
  async addUserToLicense(
    userData: {
      username: string;
      email: string;
      password: string;
      full_name?: string;
    },
    licenseKey: string
  ) {
    const response = await api.post("/auth/add-user-to-license", {
      ...userData,
      license_key: licenseKey,
    });
    return response.data;
  },

  // Helper function to check if user can perform action
  async canPerformAction(
    action: "add_user" | "add_agent" | "add_task" | "add_conversation"
  ): Promise<boolean> {
    try {
      const limits = await this.checkLimits();
      const actionMap = {
        add_user: "can_add_user",
        add_agent: "can_add_agent",
        add_task: "can_add_task",
        add_conversation: "can_add_conversation",
      };
      return limits[actionMap[action]] || false;
    } catch {
      return false;
    }
  },

  // Helper function to get feature availability
  async hasFeature(featureName: string): Promise<boolean> {
    try {
      const license = await this.getCurrentLicense();
      return license.features[featureName] || false;
    } catch {
      return false;
    }
  },

  // Generate hardware fingerprint (simple implementation)
  generateHardwareFingerprint(): string {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillText("Hardware fingerprint", 2, 2);
    }

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + "x" + screen.height,
      new Date().getTimezoneOffset().toString(),
      canvas.toDataURL(),
    ].join("|");

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  },
};
