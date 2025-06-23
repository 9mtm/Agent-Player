import { useState, useEffect } from "react";
import { licenseService } from "../../../services/license";
import type {
  LicenseInfo,
  OnlineLicenseRequest,
  LicenseActivation,
  LicenseType,
  LicenseStatus,
} from "../../../types/license";

export interface UseLicenseReturn {
  // States
  activeTab: string;
  setActiveTab: (tab: string) => void;
  licenseInfo: LicenseInfo | null;
  loading: boolean;
  error: string | null;
  success: string | null;
  licenseRequest: OnlineLicenseRequest;
  setLicenseRequest: React.Dispatch<React.SetStateAction<OnlineLicenseRequest>>;
  activationData: LicenseActivation;
  setActivationData: React.Dispatch<React.SetStateAction<LicenseActivation>>;
  registrationData: RegistrationData;
  setRegistrationData: React.Dispatch<React.SetStateAction<RegistrationData>>;

  // Functions
  loadCurrentLicense: () => Promise<void>;
  handleRequestLicense: () => Promise<void>;
  handleRegisterWithLicense: () => Promise<void>;
  clearMessages: () => void;
}

interface RegistrationData {
  username: string;
  email: string;
  password: string;
  full_name: string;
}

export const useLicense = (): UseLicenseReturn => {
  const [activeTab, setActiveTab] = useState("current");
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // License request form
  const [licenseRequest, setLicenseRequest] = useState<OnlineLicenseRequest>({
    email: "",
    name: "",
    company_name: "",
    license_type: "free" as LicenseType,
    requested_users: 1,
    requested_agents: 5,
  });

  // License activation form
  const [activationData, setActivationData] = useState<LicenseActivation>({
    license_key: "",
    owner_name: "",
    owner_email: "",
    company_name: "",
  });

  // Registration form
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    username: "",
    email: "",
    password: "",
    full_name: "",
  });

  useEffect(() => {
    loadCurrentLicense();
  }, []);

  const loadCurrentLicense = async () => {
    try {
      const license = await licenseService.getCurrentLicense();
      setLicenseInfo(license);
    } catch (error) {
      console.log("No license found or user not authenticated");
    }
  };

  const handleRequestLicense = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response =
        await licenseService.requestLicenseOnline(licenseRequest);

      if (response.success && response.license_key) {
        setSuccess(
          `License created successfully! License key: ${response.license_key}`
        );
        setActivationData((prev) => ({
          ...prev,
          license_key: response.license_key || "",
          owner_name: licenseRequest.name,
          owner_email: licenseRequest.email,
          company_name: licenseRequest.company_name,
        }));
        setActiveTab("activate");
      } else {
        setError(response.error_message || "Failed to create license");
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      setError(
        err.response?.data?.detail || "Error occurred while requesting license"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterWithLicense = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Generate hardware fingerprint
      const hardwareFingerprint = licenseService.generateHardwareFingerprint();

      const response = await licenseService.registerWithLicense(
        registrationData,
        {
          ...activationData,
          hardware_fingerprint: hardwareFingerprint,
        }
      );

      if (response.access_token) {
        // Store auth token and user data
        localStorage.setItem("access_token", response.access_token);
        if (response.user) {
          localStorage.setItem("user", JSON.stringify(response.user));
        }
        setSuccess("Registration and license activation successful!");
        loadCurrentLicense();
        setActiveTab("current");
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      setError(
        err.response?.data?.detail || "Failed to register or activate license"
      );
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  return {
    // States
    activeTab,
    setActiveTab,
    licenseInfo,
    loading,
    error,
    success,
    licenseRequest,
    setLicenseRequest,
    activationData,
    setActivationData,
    registrationData,
    setRegistrationData,

    // Functions
    loadCurrentLicense,
    handleRequestLicense,
    handleRegisterWithLicense,
    clearMessages,
  };
};
