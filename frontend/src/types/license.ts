export const LicenseType = {
  FREE: "free",
  PERSONAL: "personal",
  BUSINESS: "business",
  ENTERPRISE: "enterprise",
} as const;

export type LicenseType = (typeof LicenseType)[keyof typeof LicenseType];

export const LicenseStatus = {
  PENDING: "pending",
  ACTIVE: "active",
  EXPIRED: "expired",
  SUSPENDED: "suspended",
  CANCELLED: "cancelled",
} as const;

export type LicenseStatus = (typeof LicenseStatus)[keyof typeof LicenseStatus];

export interface License {
  id: number;
  license_key: string;
  license_type: LicenseType;
  status: LicenseStatus;
  owner_name: string;
  owner_email: string;
  company_name?: string;
  max_users: number;
  max_agents: number;
  max_tasks: number;
  max_conversations: number;
  current_users: number;
  current_agents: number;
  current_tasks: number;
  current_conversations: number;
  issued_at: string;
  activated_at?: string;
  expires_at?: string;
  last_verified?: string;
  features: Record<string, boolean>;
  installation_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface LicenseInfo {
  license_type: LicenseType;
  status: LicenseStatus;
  owner_name: string;
  company_name?: string;
  is_active: boolean;
  is_expired: boolean;
  days_until_expiry: number;
  limits: {
    users: { current: number; max: number };
    agents: { current: number; max: number };
    tasks: { current: number; max: number };
    conversations: { current: number; max: number };
  };
  features: Record<string, boolean>;
}

export interface LicenseActivation {
  license_key: string;
  owner_name: string;
  owner_email: string;
  company_name?: string;
  hardware_fingerprint?: string;
}

export interface OnlineLicenseRequest {
  email: string;
  name: string;
  company_name?: string;
  license_type: LicenseType;
  requested_users: number;
  requested_agents: number;
  additional_info?: Record<string, unknown>;
}

export interface OnlineLicenseResponse {
  success: boolean;
  license_key?: string;
  license_type: LicenseType;
  max_users: number;
  max_agents: number;
  max_tasks: number;
  max_conversations: number;
  features: Record<string, boolean>;
  expires_at?: string;
  verification_url?: string;
  error_message?: string;
}

export interface LicenseValidation {
  is_valid: boolean;
  license?: License;
  error_message?: string;
  can_add_user: boolean;
  can_add_agent: boolean;
  can_add_task: boolean;
  can_add_conversation: boolean;
}

export interface LicenseStats {
  total_licenses: number;
  active_licenses: number;
  expired_licenses: number;
  pending_licenses: number;
  by_type: Record<string, number>;
  total_users: number;
  total_usage: Record<string, number>;
}

export interface LicenseFeature {
  name: string;
  display_name: string;
  description: string;
  available_in: LicenseType[];
}

export const LICENSE_FEATURES: LicenseFeature[] = [
  {
    name: "api_access",
    display_name: "API Access",
    description: "Access to REST API endpoints",
    available_in: [
      LicenseType.FREE,
      LicenseType.PERSONAL,
      LicenseType.BUSINESS,
      LicenseType.ENTERPRISE,
    ],
  },
  {
    name: "basic_ai",
    display_name: "Basic AI Models",
    description: "Access to basic AI models",
    available_in: [
      LicenseType.FREE,
      LicenseType.PERSONAL,
      LicenseType.BUSINESS,
      LicenseType.ENTERPRISE,
    ],
  },
  {
    name: "advanced_ai",
    display_name: "Advanced AI Models",
    description: "Access to advanced AI models (GPT-4, Claude, etc.)",
    available_in: [
      LicenseType.PERSONAL,
      LicenseType.BUSINESS,
      LicenseType.ENTERPRISE,
    ],
  },
  {
    name: "custom_models",
    display_name: "Custom Models",
    description: "Upload and use custom AI models",
    available_in: [LicenseType.BUSINESS, LicenseType.ENTERPRISE],
  },
  {
    name: "premium_support",
    display_name: "Premium Support",
    description: "Priority customer support",
    available_in: [
      LicenseType.PERSONAL,
      LicenseType.BUSINESS,
      LicenseType.ENTERPRISE,
    ],
  },
  {
    name: "white_labeling",
    display_name: "White Labeling",
    description: "Remove branding and customize interface",
    available_in: [LicenseType.BUSINESS, LicenseType.ENTERPRISE],
  },
  {
    name: "analytics",
    display_name: "Advanced Analytics",
    description: "Detailed usage analytics and reporting",
    available_in: [
      LicenseType.PERSONAL,
      LicenseType.BUSINESS,
      LicenseType.ENTERPRISE,
    ],
  },
  {
    name: "integrations",
    display_name: "Third-party Integrations",
    description: "Connect with external services",
    available_in: [
      LicenseType.FREE,
      LicenseType.PERSONAL,
      LicenseType.BUSINESS,
      LicenseType.ENTERPRISE,
    ],
  },
  {
    name: "file_upload",
    display_name: "File Upload",
    description: "Upload and process files",
    available_in: [
      LicenseType.FREE,
      LicenseType.PERSONAL,
      LicenseType.BUSINESS,
      LicenseType.ENTERPRISE,
    ],
  },
  {
    name: "export_data",
    display_name: "Data Export",
    description: "Export your data and conversations",
    available_in: [
      LicenseType.FREE,
      LicenseType.PERSONAL,
      LicenseType.BUSINESS,
      LicenseType.ENTERPRISE,
    ],
  },
  {
    name: "on_premise",
    display_name: "On-Premise Deployment",
    description: "Deploy on your own infrastructure",
    available_in: [LicenseType.ENTERPRISE],
  },
  {
    name: "custom_integration",
    display_name: "Custom Integration",
    description: "Custom integration and development",
    available_in: [LicenseType.ENTERPRISE],
  },
];

export const LICENSE_TYPE_CONFIGS = {
  [LicenseType.FREE]: {
    display_name: "Free",
    color: "bg-gray-500",
    max_users: 1,
    max_agents: 5,
    max_tasks: 100,
    max_conversations: 50,
    price: "Free",
    description: "For simple personal use",
  },
  [LicenseType.PERSONAL]: {
    display_name: "Personal",
    color: "bg-blue-500",
    max_users: 3,
    max_agents: 25,
    max_tasks: 1000,
    max_conversations: 500,
    price: "$29/month",
    description: "For individuals and small teams",
  },
  [LicenseType.BUSINESS]: {
    display_name: "Business",
    color: "bg-green-500",
    max_users: 25,
    max_agents: 100,
    max_tasks: 10000,
    max_conversations: 5000,
    price: "$99/month",
    description: "For companies and medium teams",
  },
  [LicenseType.ENTERPRISE]: {
    display_name: "Enterprise",
    color: "bg-purple-500",
    max_users: 100,
    max_agents: 1000,
    max_tasks: 100000,
    max_conversations: 50000,
    price: "Custom",
    description: "For large organizations",
  },
};
