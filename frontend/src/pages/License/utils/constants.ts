import React from "react";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

import type { LicenseStatus } from "../../../types/license";

// Status Icon Helper
export const getStatusIcon = (status: LicenseStatus) => {
  switch (status) {
    case "active":
      return React.createElement(CheckCircle, {
        className: "h-5 w-5 text-green-500",
      });
    case "expired":
      return React.createElement(XCircle, {
        className: "h-5 w-5 text-red-500",
      });
    case "pending":
      return React.createElement(AlertTriangle, {
        className: "h-5 w-5 text-yellow-500",
      });
    default:
      return React.createElement(XCircle, {
        className: "h-5 w-5 text-gray-500",
      });
  }
};

// Status Badge Configuration Helper
export const getStatusBadgeConfig = (status: LicenseStatus) => {
  const configs = {
    active: { variant: "default" as const, label: "Active" },
    pending: { variant: "secondary" as const, label: "Pending Activation" },
    expired: { variant: "destructive" as const, label: "Expired" },
    suspended: { variant: "destructive" as const, label: "Suspended" },
    cancelled: { variant: "outline" as const, label: "Cancelled" },
  };

  return configs[status] || configs.pending;
};

// Usage Percentage Helper
export const getUsagePercentage = (current: number, max: number): number => {
  return Math.min((current / max) * 100, 100);
};

// Validation Helpers
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidLicenseKey = (key: string): boolean => {
  // Basic validation for license key format (XXXX-XXXX-XXXX-XXXX-XXXX)
  const keyRegex =
    /^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/;
  return keyRegex.test(key);
};

export const isFormValid = {
  licenseRequest: (data: { name: string; email: string }): boolean => {
    return !!(data.name && data.email && isValidEmail(data.email));
  },

  activation: (
    activationData: { license_key: string },
    registrationData: { username: string; email: string; password: string }
  ): boolean => {
    return !!(
      activationData.license_key &&
      registrationData.username &&
      registrationData.email &&
      registrationData.password &&
      isValidEmail(registrationData.email)
    );
  },
};

// Tab Configuration
export const LICENSE_TABS = [
  { value: "current", label: "Current License" },
  { value: "request", label: "Request License" },
  { value: "activate", label: "Activate License" },
] as const;
