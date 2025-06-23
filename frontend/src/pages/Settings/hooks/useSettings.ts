import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../../services";
import type { User } from "../../../services";
import type { SettingsJson, Profile, Theme } from "../types";

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

  // Load user data from backend
  const loadUserData = async () => {
    try {
      setLoading(true);
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);

      // Initialize settings with user data
      setSettingsJson((prev) => ({
        ...prev,
        individualInfo: {
          ...prev.individualInfo,
          fullName: currentUser.full_name || "",
          preferredLanguage: currentUser.language || "",
        },
      }));

      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error loading user data");
      console.error("Error loading user data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Update user settings
  const updateUserSettings = async (updates: Partial<User>) => {
    try {
      const updatedUser = await authService.updateProfile(updates);
      setUser(updatedUser);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error updating user");
      console.error("Error updating user:", err);
    }
  };

  // Handle data deletion request
  const handleDeleteRequest = () => {
    setProfile((prev) => ({ ...prev, deletionRequested: true }));
    setShowDeleteInfo(true);
  };

  // Handle error/crash report sharing toggle
  const handleShareErrorsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile((prev) => ({ ...prev, shareErrors: e.target.checked }));
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
      } catch (error) {
        console.error("Upload error:", error);
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
    handleDeleteRequest,
    handleShareErrorsChange,
    handleFileUpload,
  };
};
