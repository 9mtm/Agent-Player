import { FieldType } from "../types";

// Field Categories
export const FIELD_CATEGORIES = {
  TEXT: "text",
  CHOICE: "choice",
  MEDIA: "media",
  ADVANCED: "advanced",
} as const;

// Available Field Types
export const FIELD_TYPES: Record<string, FieldType> = {
  SHORT_TEXT: {
    id: "short_text",
    name: "Short Text",
    icon: "📝",
    category: "text",
    description: "Single line text input",
    defaultProperties: {
      placeholder: "Enter your answer",
      maxLength: 255,
    },
  },
  LONG_TEXT: {
    id: "long_text",
    name: "Long Text",
    icon: "📄",
    category: "text",
    description: "Multi-line text area",
    defaultProperties: {
      placeholder: "Write your detailed answer here...",
      maxLength: 2000,
    },
  },
  EMAIL: {
    id: "email",
    name: "Email",
    icon: "📧",
    category: "text",
    description: "Email address input",
    defaultProperties: {
      placeholder: "Enter your email address",
      inputType: "email",
    },
  },
  NUMBER: {
    id: "number",
    name: "Number",
    icon: "🔢",
    category: "text",
    description: "Numeric input field",
    defaultProperties: {
      placeholder: "Enter a number",
      inputType: "number",
    },
  },
  PHONE: {
    id: "phone",
    name: "Phone",
    icon: "📞",
    category: "text",
    description: "Phone number input",
    defaultProperties: {
      placeholder: "Enter your phone number",
      inputType: "tel",
    },
  },
  URL: {
    id: "url",
    name: "Website",
    icon: "🌐",
    category: "text",
    description: "URL input field",
    defaultProperties: {
      placeholder: "https://example.com",
      inputType: "url",
    },
  },
  DATE: {
    id: "date",
    name: "Date",
    icon: "📅",
    category: "text",
    description: "Date picker",
    defaultProperties: {
      dateFormat: "YYYY-MM-DD",
    },
  },
  TIME: {
    id: "time",
    name: "Time",
    icon: "🕐",
    category: "text",
    description: "Time picker",
    defaultProperties: {},
  },
  SINGLE_CHOICE: {
    id: "single_choice",
    name: "Single Choice",
    icon: "🔘",
    category: "choice",
    description: "Radio buttons for single selection",
    defaultProperties: {
      options: [
        { id: "1", label: "Option 1", value: "option1" },
        { id: "2", label: "Option 2", value: "option2" },
      ],
    },
  },
  MULTIPLE_CHOICE: {
    id: "multiple_choice",
    name: "Multiple Choice",
    icon: "☑️",
    category: "choice",
    description: "Checkboxes for multiple selection",
    defaultProperties: {
      options: [
        { id: "1", label: "Option 1", value: "option1" },
        { id: "2", label: "Option 2", value: "option2" },
      ],
    },
  },
  DROPDOWN: {
    id: "dropdown",
    name: "Dropdown",
    icon: "📋",
    category: "choice",
    description: "Dropdown selection menu",
    defaultProperties: {
      options: [
        { id: "1", label: "Option 1", value: "option1" },
        { id: "2", label: "Option 2", value: "option2" },
      ],
    },
  },
  YES_NO: {
    id: "yes_no",
    name: "Yes/No",
    icon: "✅",
    category: "choice",
    description: "Simple yes/no question",
    defaultProperties: {
      options: [
        { id: "1", label: "Yes", value: "yes" },
        { id: "2", label: "No", value: "no" },
      ],
    },
  },
  RATING: {
    id: "rating",
    name: "Rating",
    icon: "⭐",
    category: "choice",
    description: "Star rating system",
    defaultProperties: {
      ratingType: "stars",
      ratingMax: 5,
    },
  },
  SCALE: {
    id: "scale",
    name: "Scale",
    icon: "📊",
    category: "choice",
    description: "Linear scale rating",
    defaultProperties: {
      ratingType: "numbers",
      ratingMax: 10,
      ratingLabels: ["Poor", "Excellent"],
    },
  },
  RANKING: {
    id: "ranking",
    name: "Ranking",
    icon: "📈",
    category: "choice",
    description: "Drag to rank options",
    defaultProperties: {
      options: [
        { id: "1", label: "Option 1", value: "option1" },
        { id: "2", label: "Option 2", value: "option2" },
        { id: "3", label: "Option 3", value: "option3" },
      ],
    },
  },
  FILE_UPLOAD: {
    id: "file_upload",
    name: "File Upload",
    icon: "📁",
    category: "media",
    description: "File upload field",
    defaultProperties: {
      acceptedTypes: ["image/*", "application/pdf"],
      maxFileSize: 10,
      maxFiles: 5,
    },
  },
  IMAGE: {
    id: "image",
    name: "Image",
    icon: "🖼️",
    category: "media",
    description: "Display an image",
    defaultProperties: {},
  },
  VIDEO: {
    id: "video",
    name: "Video",
    icon: "🎥",
    category: "media",
    description: "Embed a video",
    defaultProperties: {},
  },
  SECTION_BREAK: {
    id: "section_break",
    name: "Section Break",
    icon: "➖",
    category: "advanced",
    description: "Visual section separator",
    defaultProperties: {},
  },
  STATEMENT: {
    id: "statement",
    name: "Statement",
    icon: "💬",
    category: "advanced",
    description: "Display text or HTML content",
    defaultProperties: {},
  },
  PAYMENT: {
    id: "payment",
    name: "Payment",
    icon: "💳",
    category: "advanced",
    description: "Payment processing field",
    defaultProperties: {},
  },
  SIGNATURE: {
    id: "signature",
    name: "Signature",
    icon: "✍️",
    category: "advanced",
    description: "Digital signature pad",
    defaultProperties: {},
  },
  ADDRESS: {
    id: "address",
    name: "Address",
    icon: "🏠",
    category: "advanced",
    description: "Address input with autocomplete",
    defaultProperties: {},
  },
  MATRIX: {
    id: "matrix",
    name: "Matrix",
    icon: "🔲",
    category: "advanced",
    description: "Matrix/grid of questions",
    defaultProperties: {},
  },
  CALCULATION: {
    id: "calculation",
    name: "Calculation",
    icon: "🧮",
    category: "advanced",
    description: "Calculate values from other fields",
    defaultProperties: {},
  },
};

// Default Form Configuration
export const DEFAULT_FORM: FormConfiguration = {
  id: "",
  title: "Untitled Form",
  description: "",
  fields: [],
  settings: {
    multiStep: false,
    progressBar: true,
    allowBack: true,
    submitButtonText: "Submit",
    thankYouMessage: "Thank you for your submission!",
    collectEmail: false,
    requireAuth: false,
    allowAnonymous: true,
    notifications: {},
  },
  theme: {
    primaryColor: "#4F46E5",
    backgroundColor: "#FFFFFF",
    textColor: "#1F2937",
    borderRadius: 8,
    fontFamily: "Inter, sans-serif",
    fontSize: 16,
  },
};

// Form Builder UI Constants
export const SIDEBAR_WIDTH = 280;
export const PROPERTIES_PANEL_WIDTH = 320;
export const TOOLBAR_HEIGHT = 60;
export const CANVAS_PADDING = 24;

// Animation Durations
export const ANIMATION_DURATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
};

// Z-Index Values
export const Z_INDEX = {
  MODAL: 1000,
  DROPDOWN: 100,
  TOOLTIP: 200,
  OVERLAY: 50,
};

// Color Palette
export const COLORS = {
  PRIMARY: "#4F46E5",
  SECONDARY: "#6B7280",
  SUCCESS: "#10B981",
  WARNING: "#F59E0B",
  ERROR: "#EF4444",
  GRAY: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },
};

// Breakpoints
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  "2XL": 1536,
};

// Form Builder Keyboard Shortcuts
export const KEYBOARD_SHORTCUTS = {
  SAVE: "Ctrl+S",
  PREVIEW: "Ctrl+P",
  UNDO: "Ctrl+Z",
  REDO: "Ctrl+Y",
  DELETE: "Delete",
  DUPLICATE: "Ctrl+D",
  SELECT_ALL: "Ctrl+A",
};

// Validation Messages
export const VALIDATION_MESSAGES = {
  REQUIRED: "This field is required",
  EMAIL: "Please enter a valid email address",
  URL: "Please enter a valid URL",
  NUMBER: "Please enter a valid number",
  MIN_LENGTH: (min: number) => `Minimum length is ${min} characters`,
  MAX_LENGTH: (max: number) => `Maximum length is ${max} characters`,
  PATTERN: "Please enter a valid format",
  FILE_SIZE: (max: number) => `File size must be less than ${max}MB`,
  FILE_TYPE: "File type not allowed",
};

// Form Builder Icons
export const ICONS = {
  ADD: "+",
  DELETE: "🗑️",
  EDIT: "✏️",
  DUPLICATE: "📋",
  MOVE: "↕️",
  SETTINGS: "⚙️",
  PREVIEW: "👁️",
  SAVE: "💾",
  PUBLISH: "🚀",
  EXPORT: "📤",
  IMPORT: "📥",
  CLOSE: "✕",
  DRAG: "⋮⋮",
  EXPAND: "▼",
  COLLAPSE: "▶",
  HELP: "❓",
  SUCCESS: "✅",
  ERROR: "❌",
  WARNING: "⚠️",
  INFO: "ℹ️",
};

// CSS Classes
export const CSS_CLASSES = {
  DRAGGING: "dragging",
  DRAG_OVER: "drag-over",
  SELECTED: "selected",
  EDITING: "editing",
  PREVIEW: "preview",
  LOADING: "loading",
  ERROR: "error",
  SUCCESS: "success",
  DISABLED: "disabled",
  HIDDEN: "hidden",
};

// Local Storage Keys
export const STORAGE_KEYS = {
  FORM_DRAFT: "formBuilder_draft",
  USER_PREFERENCES: "formBuilder_preferences",
  RECENT_FORMS: "formBuilder_recentForms",
};

// API Endpoints
export const API_ENDPOINTS = {
  FORMS: "/forms",
  FORM_RESPONSES: (formId: string) => `/forms/${formId}/responses`,
  FORM_ANALYTICS: (formId: string) => `/forms/${formId}/analytics`,
  PUBLIC_FORM: (token: string) => `/public/forms/${token}`,
};
