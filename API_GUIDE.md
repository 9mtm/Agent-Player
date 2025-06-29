# 🔧 Custom Field Builder API Guide

## Overview
Revolutionary ACF-style Custom Field Builder system that allows users to create dynamic forms without coding. This system supports 20+ field types with real-time preview and template management.

## Database Tables (4 new tables)

### 1. custom_fields
```sql
CREATE TABLE custom_fields (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    label VARCHAR(200) NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    description TEXT,
    placeholder VARCHAR(255),
    default_value TEXT,
    options TEXT,
    validation_rules TEXT,
    is_required BOOLEAN DEFAULT FALSE,
    position INTEGER DEFAULT 0,
    group_id INTEGER,
    created_by INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (group_id) REFERENCES custom_field_groups(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### 2. custom_field_groups
```sql
CREATE TABLE custom_field_groups (
    id INTEGER PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    location VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    display_rules TEXT,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### 3. custom_field_values
```sql
CREATE TABLE custom_field_values (
    id INTEGER PRIMARY KEY,
    field_id INTEGER NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    value TEXT,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (field_id) REFERENCES custom_fields(id),
    UNIQUE(field_id, entity_type, entity_id)
);
```

### 4. field_templates
```sql
CREATE TABLE field_templates (
    id INTEGER PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    fields_config TEXT NOT NULL,
    preview_image VARCHAR(255),
    is_public BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    created_by INTEGER NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

## API Endpoints (16 endpoints)

### Field Management (5 endpoints)

#### GET /api/custom-fields/
List all custom fields with filtering
```typescript
const response = await fetch('/api/custom-fields/?location=agent_form&entity_type=agent');
```

#### POST /api/custom-fields/
Create new custom field
```typescript
const fieldData = {
  name: 'agent_specialty',
  label: 'Agent Specialty',
  field_type: 'select',
  options: [
    { label: 'Medical', value: 'medical' },
    { label: 'Technical', value: 'technical' }
  ],
  is_required: true,
  group_id: 1
};
```

#### GET /api/custom-fields/{id}
Get field details

#### PUT /api/custom-fields/{id}
Update field configuration

#### DELETE /api/custom-fields/{id}
Delete field (soft delete)

### Field Groups (4 endpoints)

#### GET /api/custom-fields/groups/
List field groups

#### POST /api/custom-fields/groups/
Create field group

#### PUT /api/custom-fields/groups/{id}
Update group

#### DELETE /api/custom-fields/groups/{id}
Delete group

### Field Values (3 endpoints)

#### GET /api/custom-fields/values/
Get field values for entity

#### POST /api/custom-fields/values/
Save field values

#### PUT /api/custom-fields/values/{id}
Update field value

### Templates (4 endpoints)

#### GET /api/custom-fields/templates/
List available templates

#### POST /api/custom-fields/templates/
Create new template

#### GET /api/custom-fields/templates/{id}
Get template details

#### POST /api/custom-fields/templates/{id}/apply
Apply template to form

## Field Types (20 types supported)

### Basic Fields
- **text** - Single line text input
- **textarea** - Multi-line text input
- **number** - Numeric input with validation
- **email** - Email input with validation
- **password** - Password input with masking
- **url** - URL input with validation
- **phone** - Phone number input

### Selection Fields
- **select** - Dropdown selection
- **multiselect** - Multiple selection dropdown
- **radio** - Radio button group
- **checkbox** - Single checkbox
- **toggle** - Toggle switch

### Date/Time Fields
- **date** - Date picker
- **datetime** - Date and time picker
- **time** - Time picker

### File Fields
- **file** - General file upload
- **image** - Image upload with preview

### Advanced Fields
- **color** - Color picker
- **range** - Range slider
- **rating** - Star rating component

## Integration Points (8 locations)

### 1. Agent Forms
```typescript
// Add custom fields to agent creation/editing
<CustomFieldRenderer 
  location="agent_form"
  entityType="agent"
  entityId={agentId}
  onValuesChange={handleCustomFieldsChange}
/>
```

### 2. Task Management
```typescript
// Add custom fields to task forms
<CustomFieldRenderer 
  location="task_form"
  entityType="task"
  entityId={taskId}
/>
```

### 3. User Profiles
```typescript
// Add custom fields to user profiles
<CustomFieldRenderer 
  location="user_profile"
  entityType="user"
  entityId={userId}
/>
```

### 4. Chat Settings
### 5. Training Workspace
### 6. Marketplace Items
### 7. License Configuration
### 8. Dashboard Widgets

## React Components (29 components)

### Core Components
- **FieldBuilder** - Main drag & drop interface
- **FieldRenderer** - Dynamic form rendering
- **FieldLibrary** - Field type library
- **FieldPreview** - Live preview component

### Field Type Components (20 components)
- **TextField** - Text input component
- **SelectField** - Dropdown component
- **CheckboxField** - Checkbox component
- **FileField** - File upload component
- ... and 16 more field types

### Management Components
- **FieldGroups** - Group management
- **FieldTemplates** - Template system
- **FieldSettings** - Field configuration
- **FieldValidation** - Validation rules

## Usage Examples

### Creating a Custom Field
```typescript
const customField = {
  name: 'agent_experience_level',
  label: 'Experience Level',
  field_type: 'select',
  description: 'Select the agent experience level',
  options: [
    { label: 'Beginner', value: 'beginner', isDefault: true },
    { label: 'Intermediate', value: 'intermediate' },
    { label: 'Expert', value: 'expert' }
  ],
  validation_rules: [
    { type: 'required', message: 'Experience level is required' }
  ],
  is_required: true,
  position: 1
};

const response = await createCustomField(customField);
```

### Rendering Custom Fields in Form
```typescript
import { CustomFieldRenderer } from '../CustomFields';

const AgentForm = () => {
  const [formData, setFormData] = useState({});
  const [customFieldValues, setCustomFieldValues] = useState({});

  return (
    <form>
      {/* Regular form fields */}
      <input name="name" placeholder="Agent Name" />
      <textarea name="description" placeholder="Description" />
      
      {/* Custom fields automatically rendered */}
      <CustomFieldRenderer
        location="agent_form"
        entityType="agent"
        entityId={agentId}
        values={customFieldValues}
        onChange={setCustomFieldValues}
      />
      
      <button type="submit">Save Agent</button>
    </form>
  );
};
```

### Creating and Using Templates
```typescript
// Create template
const template = {
  name: 'AI Agent Template',
  description: 'Standard fields for AI agents',
  category: 'agent',
  fields_config: [
    {
      name: 'specialty',
      label: 'Agent Specialty',
      field_type: 'select',
      options: [
        { label: 'Customer Service', value: 'customer_service' },
        { label: 'Technical Support', value: 'technical_support' },
        { label: 'Sales Assistant', value: 'sales_assistant' }
      ]
    },
    {
      name: 'experience_level',
      label: 'Experience Level',
      field_type: 'rating',
      validation_rules: [
        { type: 'required', message: 'Please rate experience level' }
      ]
    }
  ],
  is_public: true
};

// Apply template
await applyTemplate(template.id, 'agent_form');
```

## Performance Specifications

### Response Times
- Field creation: < 500ms
- Field rendering: < 200ms
- Template application: < 1s
- Value saving: < 300ms

### Scalability
- Support up to 100 fields per form
- Support up to 50 field groups
- Support up to 1000 templates
- Efficient pagination for large datasets

## Security Features

### Field Validation
- Server-side validation for all field types
- XSS protection for text inputs
- File upload security (virus scanning)
- SQL injection protection

### Access Control
- User-based field visibility
- Group-based permissions
- Template sharing controls
- Audit logging for changes

## Error Handling

### Field Validation Errors
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "specialty": ["This field is required"],
    "experience_level": ["Please select a valid experience level"]
  }
}
```

### Template Application Errors
```json
{
  "success": false,
  "message": "Template application failed",
  "errors": ["Template not found or access denied"]
}
```

## Future Enhancements

### Phase 2 Features
- Conditional logic between fields
- Advanced validation rules
- Field dependencies
- Import/export functionality

### Phase 3 Features
- Visual field designer
- Advanced templates with logic
- Integration with external APIs
- Multi-language support

---

**Status:** Planning Complete ✅  
**Implementation:** Ready to Begin 🚀  
**Priority:** CRITICAL 🔥  
**Impact:** GAME-CHANGING 💫 