import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService, settingsService } from "../../../services";
import type { User } from "../../../services";
import type { SettingsJson, Profile, Theme } from "../types";

// Interface for updating user settings
interface SettingsUpdate {
  full_name?: string;
  language?: string;
  country?: string;
  state?: string;
  city?: string;
}

export const useSettings = () => {
  const navigate = useNavigate();

  // Theme state
  const [theme, setTheme] = useState<Theme>(
    window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  );

  // Tab state
  const [activeTab, setActiveTab] = useState("general");
  const [generalSubTab, setGeneralSubTab] = useState("personal");

  // User data
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile>({
    licenseType: "free",
    licenseStatus: "active",
    deletionRequested: false,
    shareErrors: false,
  });

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteInfo, setShowDeleteInfo] = useState(false);

  // Central JSON state for all settings
  const [settingsJson, setSettingsJson] = useState<SettingsJson>({
    systemType: "individual",
    companyInfo: {
      name: "",
      emails: [],
      phones: [],
      branches: [],
      socials: [],
    },
    aiContactName: "",
    defaultLLM: "openai",
    individualInfo: {
      fullName: "",
      preferredLanguage: "",
      country: "",
      state: "",
      city: "",
      hobbies: "",
      jobField: "",
      goals: "",
      techLevel: "",
      communicationStyle: "",
      bestTimes: "",
      importantLinks: "",
      emails: [],
      phones: [],
      links: [],
    },
    companyExtraInfo: {
      industry: "",
      size: "",
      address: "",
      website: "",
      socialMedia: "",
      contactPersons: "",
      workingHours: "",
      policies: "",
      companyGoals: "",
      emails: [],
      phones: [],
      branches: [],
      socials: [],
    },
    llmPermissions: {
      readFiles: false,
      modifyFiles: false,
      uploadFiles: false,
      accessInternet: false,
      chooseBrowser: false,
      accessIntegrations: false,
    },
    llmAllowedPaths: "",
    llmAllowedPathsList: [],
    llmUploadedFiles: [],
    aiSyncFiles: [],
    aiSyncLinks: [],
    aiCoreDescription: "",
    aiMainRole: "",
    aiAudience: "",
    aiAccessControl: "",
  });

  // Apply theme effect
  useEffect(() => {
    if (theme === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [theme]);

  // Load user data effect
  useEffect(() => {
    loadUserData();
  }, []);

  // Load user data from backend using both authService and settingsService
  const loadUserData = async () => {
    try {
      setLoading(true);

      // Load current user from auth service
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);

      // Load user settings and preferences from settings service
      try {
        const userSettings = await settingsService.getAllSettings();
        const userPreferences = await settingsService.getSettingsOverview();

        // Update theme from settings
        if (userSettings.data?.theme) {
          setTheme(userSettings.data.theme as Theme);
        }

        // Initialize settings with user data and preferences
        setSettingsJson((prev) => ({
          ...prev,
          systemType: userSettings.data?.system_type || prev.systemType,
          defaultLLM: userSettings.data?.default_llm || prev.defaultLLM,
          individualInfo: {
            ...prev.individualInfo,
            fullName: currentUser.full_name || "",
            preferredLanguage: userSettings.data?.ui_language || "",
            country: userSettings.data?.country || "",
            state: userSettings.data?.state || "",
            city: userSettings.data?.city || "",
          },
          llmPermissions: {
            ...prev.llmPermissions,
            ...userSettings.data?.llm_permissions,
          },
        }));

        // Update profile from preferences
        setProfile((prev) => ({
          ...prev,
          licenseType: userPreferences.data?.subscription_type || "free",
          shareErrors: userPreferences.data?.telemetry_enabled || false,
        }));
      } catch (settingsError) {
        console.warn("Could not load user settings:", settingsError);
        // Continue with basic user data only
      }

      setError(null);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Error loading user data";
      setError(errorMessage);
      console.error("Error loading user data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Update user settings using both authService and settingsService
  const updateUserSettings = async (updates: SettingsUpdate) => {
    try {
      // Update basic profile fields through authService
      const profileUpdates: Partial<User> = {};
      if (updates.full_name !== undefined)
        profileUpdates.full_name = updates.full_name;

      if (Object.keys(profileUpdates).length > 0) {
        const updatedUser = await authService.updateProfile(profileUpdates);
        setUser(updatedUser);
      }

      // Update other settings through settingsService
      const settingsUpdates: Record<string, unknown> = {};
      if (updates.country !== undefined)
        settingsUpdates.country = updates.country;
      if (updates.state !== undefined) settingsUpdates.state = updates.state;
      if (updates.city !== undefined) settingsUpdates.city = updates.city;

      if (Object.keys(settingsUpdates).length > 0) {
        await settingsService.updateAdvancedSettings(settingsUpdates);
      }

      // Update language preference separately
      if (updates.language !== undefined) {
        await settingsService.updateThemeSettings({
          ui_language: updates.language,
        });
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Error updating user";
      setError(errorMessage);
      console.error("Error updating user:", err);
      throw err; // Re-throw to let the caller handle it
    }
  };

  // Update theme and save to backend
  const updateTheme = async (newTheme: Theme) => {
    try {
      setTheme(newTheme);
      await settingsService.updateThemeSettings({
        theme: newTheme,
      });
    } catch (err: unknown) {
      console.error("Error updating theme:", err);
      setError("Failed to save theme preference");
    }
  };

  // Handle data deletion request
  const handleDeleteRequest = () => {
    setProfile((prev) => ({ ...prev, deletionRequested: true }));
    setShowDeleteInfo(true);
  };

  // Handle error/crash report sharing toggle
  const handleShareErrorsChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const shareErrors = e.target.checked;
    setProfile((prev) => ({ ...prev, shareErrors }));

    try {
      await settingsService.updateAdvancedSettings({
        telemetry_enabled: shareErrors,
      });
    } catch (err: unknown) {
      console.error("Error updating error sharing preference:", err);
      setError("Failed to save error sharing preference");
    }
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("http://localhost:8000/upload", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          alert(`File uploaded successfully: ${result.filename}`);
        } else {
          alert("Upload failed");
        }
      } catch (uploadError) {
        console.error("Upload error:", uploadError);
        alert("Upload error");
      }
    }
  };

  return {
    // State
    theme,
    setTheme,
    activeTab,
    setActiveTab,
    generalSubTab,
    setGeneralSubTab,
    user,
    profile,
    setProfile,
    loading,
    error,
    showDeleteInfo,
    settingsJson,
    setSettingsJson,

    // Actions
    navigate,
    loadUserData,
    updateUserSettings,
    updateTheme,
    handleDeleteRequest,
    handleShareErrorsChange,
    handleFileUpload,
  };
};
