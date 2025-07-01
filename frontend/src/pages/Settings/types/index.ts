// Settings Types and Interfaces
export interface IndividualInfo {
  fullName: string;
  preferredLanguage: string;
  country: string;
  state: string;
  city: string;
  hobbies: string;
  jobField: string;
  goals: string;
  techLevel: string;
  communicationStyle: string;
  bestTimes: string;
  importantLinks: string;
  emails: string[];
  phones: string[];
  links: string[];
}

export interface CompanyExtraInfo {
  industry: string;
  size: string;
  address: string;
  website: string;
  socialMedia: string;
  contactPersons: string;
  workingHours: string;
  policies: string;
  companyGoals: string;
  emails: string[];
  phones: string[];
  branches: string[];
  socials: string[];
}

export interface LlmPermissions {
  readFiles: boolean;
  modifyFiles: boolean;
  uploadFiles: boolean;
  accessInternet: boolean;
  chooseBrowser: boolean;
  accessIntegrations: boolean;
}

export interface SettingsJson {
  systemType: "individual" | "company";
  companyInfo: {
    name: string;
    emails: string[];
    phones: string[];
    branches: string[];
    socials: string[];
  };
  aiContactName: string;
  defaultLLM: string;
  individualInfo: IndividualInfo;
  companyExtraInfo: CompanyExtraInfo;
  llmPermissions: LlmPermissions;
  llmAllowedPaths: string;
  llmAllowedPathsList: string[];
  llmUploadedFiles: File[];
  aiSyncFiles: { path: string; label: string; instructions: string }[];
  aiSyncLinks: { url: string; label: string; instructions: string }[];
  aiCoreDescription: string;
  aiMainRole: string;
  aiAudience: string;
  aiAccessControl: string;
}

export interface Profile {
  licenseType: "free" | "paid";
  licenseStatus: "active" | "inactive";
  deletionRequested: boolean;
  shareErrors: boolean;
}

export interface TabItem {
  key: string;
  label: string;
}

export interface SubTabItem {
  key: string;
  label: string;
}

export type Theme = "light" | "dark";
export type SystemType = "individual" | "company";

export interface SettingsSection {
  id: string;
  title: string;
  icon: string;
  description: string;
  category: SettingsCategory;
  searchTerms: string[];
  component: React.ComponentType<Record<string, unknown>>;
}

export type SettingsCategory =
  | "account"
  | "appearance"
  | "ai-models"
  | "automation"
  | "security"
  | "integrations"
  | "advanced";

export interface SettingField {
  id: string;
  type:
    | "toggle"
    | "input"
    | "select"
    | "slider"
    | "textarea"
    | "file"
    | "color"
    | "multi-select";
  label: string;
  description: string;
  value: string | number | boolean | string[];
  defaultValue: string | number | boolean | string[];
  options?: Array<{ label: string; value: string; description?: string }>;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  required?: boolean;
  validation?: (value: string | number | boolean | string[]) => string | null;
  helpText?: string;
  premium?: boolean;
  onChange?: (value: string | number | boolean | string[]) => void;
}

export interface SettingsGroup {
  id: string;
  title: string;
  description: string;
  icon: string;
  fields: SettingField[];
  collapsible?: boolean;
  collapsed?: boolean;
  premium?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "user" | "admin" | "developer";
  subscription: "free" | "pro" | "enterprise";
  joinedDate: string;
  lastActive: string;
  preferences: Record<string, any>;
  stats: {
    totalAgents: number;
    totalTasks: number;
    apiCalls: number;
    storageUsed: number;
  };
}

export interface ThemeConfig {
  id: string;
  name: string;
  type: "light" | "dark" | "auto";
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  fontSize: "small" | "medium" | "large";
  animations: boolean;
  customCss?: string;
}

export interface AIModelConfig {
  id: string;
  name: string;
  provider: "openai" | "anthropic" | "google" | "local" | "custom";
  model: string;
  apiKey: string;
  apiEndpoint?: string;
  maxTokens: number;
  temperature: number;
  systemPrompt?: string;
  enabled: boolean;
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  fallbackModel?: string;
}

export interface IntegrationConfig {
  id: string;
  name: string;
  type: "slack" | "discord" | "github" | "trello" | "notion" | "custom";
  enabled: boolean;
  apiKey?: string;
  webhookUrl?: string;
  settings: Record<string, any>;
  lastSync?: string;
  status: "connected" | "disconnected" | "error" | "syncing";
}

export interface SecuritySettings {
  twoFactorAuth: boolean;
  apiKeyRotation: "never" | "monthly" | "weekly" | "daily";
  sessionTimeout: number; // minutes
  ipWhitelist: string[];
  loginNotifications: boolean;
  dataRetention: number; // days
  encryptionLevel: "standard" | "high" | "maximum";
  auditLogging: boolean;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: {
    type: "schedule" | "event" | "webhook" | "condition";
    config: Record<string, any>;
  };
  actions: Array<{
    type: string;
    config: Record<string, any>;
  }>;
  lastRun?: string;
  nextRun?: string;
  status: "active" | "paused" | "error";
}

export interface NotificationSettings {
  email: {
    enabled: boolean;
    types: string[];
    frequency: "instant" | "daily" | "weekly";
  };
  push: {
    enabled: boolean;
    types: string[];
  };
  inApp: {
    enabled: boolean;
    types: string[];
  };
  slack: {
    enabled: boolean;
    webhook?: string;
    channel?: string;
  };
}

export interface PrivacySettings {
  dataSharing: boolean;
  analytics: boolean;
  crashReports: boolean;
  usageStatistics: boolean;
  marketingEmails: boolean;
  profileVisibility: "public" | "private" | "limited";
  searchIndexing: boolean;
}

export interface BackupSettings {
  autoBackup: boolean;
  frequency: "daily" | "weekly" | "monthly";
  retention: number; // days
  location: "local" | "cloud" | "both";
  encryption: boolean;
  includeSensitiveData: boolean;
  lastBackup?: string;
  nextBackup?: string;
}

export interface AdvancedSettings {
  developerMode: boolean;
  debugLogging: boolean;
  experimentalFeatures: boolean;
  customApiEndpoints: Record<string, string>;
  memoryLimit: number; // MB
  concurrentTasks: number;
  cacheSize: number; // MB
  logLevel: "error" | "warn" | "info" | "debug" | "trace";
}

export interface SettingsState {
  user: UserProfile;
  theme: ThemeConfig;
  aiModels: AIModelConfig[];
  integrations: IntegrationConfig[];
  security: SecuritySettings;
  automation: AutomationRule[];
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  backup: BackupSettings;
  advanced: AdvancedSettings;
}

export interface SettingsContextType {
  settings: SettingsState;
  updateSettings: (section: keyof SettingsState, data: Partial<any>) => void;
  resetSection: (section: keyof SettingsState) => void;
  exportSettings: () => string;
  importSettings: (data: string) => void;
  searchSettings: (query: string) => SettingsSection[];
  loading: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
  saveChanges: () => Promise<void>;
  discardChanges: () => void;
}

// Legacy types for backward compatibility
export interface TabItem {
  key: string;
  label: string;
}
