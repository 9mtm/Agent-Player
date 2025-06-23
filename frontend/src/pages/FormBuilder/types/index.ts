// Form Builder Types
export interface FormField {
  id: string;
  type: FieldType;
  title: string;
  description?: string;
  required: boolean;
  properties: FieldProperties;
  position: number;
  conditional?: ConditionalLogic;
}

export interface FieldProperties {
  // Common properties
  placeholder?: string;
  helpText?: string;

  // Choice field properties
  options?: ChoiceOption[];
  allowMultiple?: boolean;
  allowOther?: boolean;
  randomizeOptions?: boolean;

  // Text field properties
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  inputType?: "text" | "email" | "url" | "password" | "number" | "tel";

  // Rating field properties
  ratingType?: "stars" | "numbers" | "hearts" | "thumbs";
  ratingMax?: number;
  ratingLabels?: string[];

  // Date field properties
  minDate?: string;
  maxDate?: string;
  dateFormat?: string;

  // File upload properties
  acceptedTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;

  // Advanced properties
  validation?: ValidationRule[];
  customCSS?: string;
}

export interface ChoiceOption {
  id: string;
  label: string;
  value: string;
  isOther?: boolean;
}

export interface ValidationRule {
  type: "required" | "minLength" | "maxLength" | "email" | "url" | "pattern";
  value?: any;
  message: string;
}

export interface ConditionalLogic {
  conditions: Condition[];
  action: "show" | "hide" | "require" | "skip";
}

export interface Condition {
  fieldId: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "greater_than"
    | "less_than";
  value: any;
}

export interface FormConfiguration {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  settings: FormSettings;
  customCSS?: string;
  theme: FormTheme;
}

export interface FormSettings {
  multiStep: boolean;
  progressBar: boolean;
  allowBack: boolean;
  submitButtonText: string;
  thankYouMessage: string;
  redirectUrl?: string;
  collectEmail: boolean;
  requireAuth: boolean;
  allowAnonymous: boolean;
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  email?: string;
  webhook?: string;
  slack?: string;
}

export interface FormTheme {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  fontFamily: string;
  fontSize: number;
}

export type FieldType =
  | "short_text"
  | "long_text"
  | "email"
  | "number"
  | "phone"
  | "url"
  | "date"
  | "time"
  | "datetime"
  | "single_choice"
  | "multiple_choice"
  | "dropdown"
  | "yes_no"
  | "rating"
  | "scale"
  | "ranking"
  | "file_upload"
  | "section_break"
  | "statement"
  | "image"
  | "video"
  | "payment"
  | "signature"
  | "address"
  | "matrix"
  | "calculation";

export interface FieldType {
  id: FieldType;
  name: string;
  icon: string;
  category: "text" | "choice" | "media" | "advanced";
  description: string;
  defaultProperties: Partial<FieldProperties>;
}

export interface DraggedField {
  type: FieldType;
  isNew: boolean;
  field?: FormField;
}

export interface FormBuilderState {
  form: FormConfiguration;
  selectedFieldId: string | null;
  draggedField: DraggedField | null;
  previewMode: boolean;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
}

// Form Response Types
export interface FormResponse {
  id: string;
  formId: string;
  responses: Record<string, any>;
  submittedAt: string;
  completionTime: number;
  respondentId?: string;
}

export interface FormAnalytics {
  totalViews: number;
  totalStarts: number;
  totalCompletions: number;
  completionRate: number;
  averageCompletionTime: number;
  responsesTrend: AnalyticsPoint[];
  fieldAnalytics: FieldAnalytics[];
}

export interface AnalyticsPoint {
  date: string;
  value: number;
}

export interface FieldAnalytics {
  fieldId: string;
  fieldTitle: string;
  responses: number;
  averageTime: number;
  dropoffRate: number;
}

// Component Props Types
export interface FieldComponentProps {
  field: FormField;
  value?: any;
  onChange?: (value: any) => void;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
  isPreview?: boolean;
  isEditing?: boolean;
}

export interface FieldEditorProps {
  field: FormField;
  onChange: (field: FormField) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export interface PropertiesPanelProps {
  field: FormField | null;
  onChange: (field: FormField) => void;
  onClose: () => void;
}

export interface FieldPaletteProps {
  onFieldDragStart: (fieldType: FieldType) => void;
  onFieldDragEnd: () => void;
}

// Form Builder Actions
export interface FormBuilderActions {
  addField: (fieldType: FieldType, position?: number) => void;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
  deleteField: (fieldId: string) => void;
  duplicateField: (fieldId: string) => void;
  moveField: (fieldId: string, newPosition: number) => void;
  selectField: (fieldId: string | null) => void;
  updateFormSettings: (settings: Partial<FormSettings>) => void;
  updateFormTheme: (theme: Partial<FormTheme>) => void;
  saveForm: () => Promise<void>;
  publishForm: () => Promise<void>;
  previewForm: () => void;
  exportForm: (format: "json" | "csv") => void;
  importForm: (data: any) => void;
}
