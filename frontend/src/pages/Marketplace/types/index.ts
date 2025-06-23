export type ProductCategory =
  | "all"
  | "extensions"
  | "themes"
  | "agents"
  | "mcp-servers";

export interface MarketplaceProduct {
  id: string;
  name: string;
  category: ProductCategory;
  description: string;
  longDescription: string;
  price: number;
  rating: number;
  downloads: number;
  developer: string;
  version: string;
  compatibility: string[];
  tags: string[];
  icon: string;
  images: string[];
  features: string[];
  requirements: string[];
  changelog: string;
  isPaid: boolean;
  isFeatured: boolean;
  installCount: number;
  lastUpdated: string;
}

export interface FilterOptions {
  pricing: "all" | "free" | "paid";
  rating: number;
  compatibility: string;
  sortBy: "popularity" | "rating" | "newest" | "price-low" | "price-high";
}

export interface ProductCounts {
  all: number;
  extensions: number;
  themes: number;
  agents: number;
  "mcp-servers": number;
}

export interface InstallationStep {
  title: string;
  description: string;
  command?: string;
  note?: string;
}

export interface Review {
  id: string;
  userId: string;
  username: string;
  rating: number;
  comment: string;
  date: string;
  helpful: number;
  verified: boolean;
}

export interface Publisher {
  id: string;
  name: string;
  avatar: string;
  verified: boolean;
  totalProducts: number;
  totalDownloads: number;
  memberSince: string;
  website?: string;
}

export type InstallStatus =
  | "not-installed"
  | "installing"
  | "installed"
  | "updating"
  | "error";

export interface InstalledProduct {
  productId: string;
  version: string;
  installedDate: string;
  status: InstallStatus;
  autoUpdate: boolean;
}
