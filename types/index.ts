// Custom Field Builder Types

export interface CustomField {
  id: number;
  name: string;
  label: string;
  fieldType: FieldType;
  description?: string;
  placeholder?: string;
  defaultValue?: any;
  options?: FieldOption[];
  validationRules?: ValidationRule[];
  isRequired: boolean;
  position: number;
  groupId?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldGroup {
  id: number;
  name: string;
  description?: string;
  location: FieldLocation;
  entityType: EntityType;
  displayRules?: DisplayRule[];
  position: number;
  isActive: boolean;
  fields?: CustomField[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldValue {
  id: number;
  fieldId: number;
  entityType: EntityType;
  entityId: number;
  value: any;
  createdAt: string;
  updatedAt: string;
}

export interface FieldTemplate {
  id: number;
  name: string;
  description?: string;
  category: TemplateCategory;
  fieldsConfig: CustomField[];
  previewImage?: string;
  isPublic: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

// Field Types - 20 different types
export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "email"
  | "password"
  | "url"
  | "phone"
  | "select"
  | "multiselect"
  | "radio"
  | "checkbox"
  | "toggle"
  | "date"
  | "datetime"
  | "time"
  | "file"
  | "image"
  | "color"
  | "range"
  | "rating";

// Field Locations - where fields can be added
export type FieldLocation =
  | "agent_form"
  | "task_form"
  | "user_profile"
  | "chat_settings"
  | "training_workspace"
  | "marketplace_item"
  | "license_config"
  | "dashboard_widget";

// Entity Types
export type EntityType =
  | "agent"
  | "task"
  | "user"
  | "chat"
  | "training"
  | "marketplace"
  | "license"
  | "dashboard";

// Template Categories
export type TemplateCategory =
  | "agent"
  | "task"
  | "user"
  | "general"
  | "advanced"
  | "business"
  | "personal";

export interface FieldOption {
  label: string;
  value: any;
  isDefault?: boolean;
}

export interface ValidationRule {
  type: ValidationType;
  value?: any;
  message: string;
}

export type ValidationType =
  | "required"
  | "minLength"
  | "maxLength"
  | "min"
  | "max"
  | "pattern"
  | "email"
  | "url"
  | "custom";

export interface DisplayRule {
  condition: string;
  field: string;
  operator: DisplayOperator;
  value: any;
}

export type DisplayOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "greater_than"
  | "less_than"
  | "is_empty"
  | "is_not_empty";

// Builder UI States
export interface FieldBuilderState {
  selectedField?: CustomField;
  draggedField?: CustomField;
  isEditing: boolean;
  isDragging: boolean;
  previewMode: boolean;
  errors: Record<string, string>;
}

// API Response Types
export interface FieldsResponse {
  success: boolean;
  data: {
    fields: CustomField[];
    total: number;
    page: number;
    pages: number;
    hasNext: boolean;
  };
}

export interface FieldResponse {
  success: boolean;
  data: CustomField;
}

export interface GroupsResponse {
  success: boolean;
  data: {
    groups: CustomFieldGroup[];
    total: number;
  };
}

export interface TemplatesResponse {
  success: boolean;
  data: {
    templates: FieldTemplate[];
    total: number;
  };
}

// Form Integration Types
export interface FieldRendererProps {
  field: CustomField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

export interface FormWithCustomFields {
  originalForm: any;
  customFields: CustomField[];
  customValues: Record<number, any>;
}
