export type SettingsCategory =
  | "account"
  | "appearance"
  | "ai-models"
  | "automation"
  | "security"
  | "integrations"
  | "advanced";

export interface SettingsSection {
  id: string;
  title: string;
  icon: string;
  description: string;
  category: SettingsCategory;
  searchTerms: string[];
  premium?: boolean;
  beta?: boolean;
}

export interface SettingField {
  id: string;
  type:
    | "toggle"
    | "input"
    | "select"
    | "slider"
    | "textarea"
    | "file"
    | "color";
  label: string;
  description: string;
  value: string | number | boolean;
  defaultValue: string | number | boolean;
  options?: Array<{ label: string; value: string; description?: string }>;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  required?: boolean;
  helpText?: string;
  premium?: boolean;
  disabled?: boolean;
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

export interface UserStats {
  totalAgents: number;
  totalTasks: number;
  apiCalls: number;
  storageUsed: number;
  storageLimit: number;
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
  stats: UserStats;
}

export interface CategoryInfo {
  id: SettingsCategory | "all";
  title: string;
  icon: string;
  description: string;
  count: number;
  color: string;
}
