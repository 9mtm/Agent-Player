export interface UserAddress {
  id: string;
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  isDefault: boolean;
  type: "home" | "work" | "business" | "other";
  verified: boolean;
}

export interface UserLink {
  id: string;
  title: string;
  url: string;
  type:
    | "website"
    | "linkedin"
    | "github"
    | "twitter"
    | "facebook"
    | "instagram"
    | "youtube"
    | "other";
  description?: string;
  isPublic: boolean;
  order: number;
}

export interface UserFile {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  type: string;
  url: string;
  uploadDate: string;
  category:
    | "profile"
    | "resume"
    | "certificate"
    | "portfolio"
    | "document"
    | "other";
  description?: string;
  isPublic: boolean;
}

export interface ComprehensiveUser {
  // Basic Info
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
  phone?: string;
  phoneVerified: boolean;

  // Profile Details
  firstName: string;
  lastName: string;
  displayName: string;
  bio: string;
  avatar?: string;
  coverImage?: string;
  birthDate?: string;

  // Professional Info
  title?: string;
  company?: string;
  department?: string;
  profession?: string;
  experience?: string;
  skills: string[];

  // Location & Addresses
  addresses: UserAddress[];
  timezone: string;
  language: string;

  // Social & Links
  links: UserLink[];

  // Files & Documents
  files: UserFile[];

  // Account Settings
  subscription: "free" | "pro" | "enterprise";
  role: "user" | "admin" | "developer";
  joinedDate: string;
  lastActive: string;
  isActive: boolean;

  // Privacy Settings
  profileVisibility: "public" | "private" | "limited";
  searchable: boolean;
  allowMessages: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showLocation: boolean;

  // Preferences
  preferences: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    marketingEmails: boolean;
    newsUpdates: boolean;
    theme: "light" | "dark" | "auto";
    language: string;
    timezone: string;
    dateFormat: string;
    timeFormat: "12h" | "24h";
  };

  // Statistics
  stats: {
    totalAgents: number;
    totalTasks: number;
    totalProjects: number;
    apiCalls: number;
    storageUsed: number;
    storageLimit: number;
    lastLoginDate: string;
    loginCount: number;
  };
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
  countryCode: string;
  state?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface AddressValidation {
  street: boolean;
  city: boolean;
  state: boolean;
  country: boolean;
  postalCode: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface LinkValidation {
  url: boolean;
  reachable: boolean;
  title?: string;
  description?: string;
  favicon?: string;
}

export interface FileUploadConfig {
  maxSize: number; // MB
  allowedTypes: string[];
  maxFiles: number;
  categories: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
  }>;
}
