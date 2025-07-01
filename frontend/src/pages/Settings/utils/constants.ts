import type { TabItem } from "../types";

// Tab definitions
export const TAB_LIST: TabItem[] = [
  { key: "general", label: "General" },
  { key: "llm", label: "AI Models & LLM" },
  { key: "knowledge", label: "Knowledge Base" },
  { key: "profile", label: "Profile" },
  { key: "account", label: "Account" },
  { key: "integrations", label: "Integrations" },
  { key: "updates", label: "Updates" },
  { key: "aisync", label: "AI Sync & Files" },
];

// Default settings
export const DEFAULT_THEME = "light";
export const DEFAULT_TAB = "general";
export const DEFAULT_SUB_TAB = "personal";
