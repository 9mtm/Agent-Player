# 🔧 CUSTOM FIELD BUILDER (ACF) - TASK SPECIFICATION

## 🎯 **Task Summary**

**Feature Name:** Custom Field Builder (ACF-style)  
**Inspired By:** WordPress Advanced Custom Fields  
**Priority:** CRITICAL 🔥  
**Status:** NEW TASK  
**Estimated Time:** 2-3 weeks  
**Complexity:** HIGH  
**Impact:** GAME-CHANGING

---

## 📋 **Task Description**

Create a dynamic Custom Field Builder system that allows users to add custom fields to any component/page in the DPRO AI Agent system without requiring manual coding. This system should work similarly to WordPress ACF (Advanced Custom Fields) plugin.

### **Core Requirements**
1. **Dynamic Field Creation** - Users can create custom fields through UI
2. **Multiple Field Types** - Support 15+ field types (text, select, file, etc.)
3. **Auto-Rendering** - Fields automatically appear in designated forms
4. **Template System** - Reusable field configurations
5. **Integration Points** - Work with agents, tasks, profiles, etc.

---

## 🗄️ **Database Schema Required**

### New Tables (4 tables)
```sql
-- 1. custom_fields table
CREATE TABLE custom_fields (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    label VARCHAR(200) NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    description TEXT,
    placeholder VARCHAR(255),
    default_value TEXT,
    options TEXT, -- JSON
    validation_rules TEXT, -- JSON
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

-- 2. custom_field_groups table
CREATE TABLE custom_field_groups (
    id INTEGER PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    location VARCHAR(100) NOT NULL, -- 'agent_form', 'task_form', 'profile'
    entity_type VARCHAR(50), -- 'agent', 'task', 'user'
    display_rules TEXT, -- JSON
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 3. custom_field_values table
CREATE TABLE custom_field_values (
    id INTEGER PRIMARY KEY,
    field_id INTEGER NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    value TEXT, -- JSON for complex values
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (field_id) REFERENCES custom_fields(id),
    UNIQUE(field_id, entity_type, entity_id)
);

-- 4. field_templates table
CREATE TABLE field_templates (
    id INTEGER PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    fields_config TEXT NOT NULL, -- JSON
    preview_image VARCHAR(255),
    is_public BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    created_by INTEGER NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

---

## 🔧 **Field Types to Implement**

### Basic Fields (6 types)
- **text** - Single line text
- **textarea** - Multi-line text
- **number** - Numeric input
- **email** - Email validation
- **url** - URL validation
- **password** - Hidden input

### Selection Fields (4 types)
- **select** - Dropdown menu
- **multiselect** - Multiple selection
- **radio** - Radio buttons
- **checkbox** - Checkboxes

### Date/Time Fields (3 types)
- **date** - Date picker
- **datetime** - Date and time
- **time** - Time picker

### File Fields (3 types)
- **file** - General file upload
- **image** - Image with preview
- **video** - Video upload

### Advanced Fields (4 types)
- **color** - Color picker
- **richtext** - WYSIWYG editor
- **relationship** - Link to entities
- **json** - JSON editor

**Total: 20 field types**

---

## 🔗 **API Endpoints Required**

### Field Management (5 endpoints)
```
POST   /custom-fields/fields          - Create field
GET    /custom-fields/fields          - List fields
PUT    /custom-fields/fields/{id}     - Update field
DELETE /custom-fields/fields/{id}     - Delete field
GET    /custom-fields/fields/{id}     - Get field details
```

### Field Groups (4 endpoints)
```
POST   /custom-fields/groups          - Create field group
GET    /custom-fields/groups          - List groups
PUT    /custom-fields/groups/{id}     - Update group
DELETE /custom-fields/groups/{id}     - Delete group
```

### Field Values (3 endpoints)
```
POST   /custom-fields/values          - Save field values
GET    /custom-fields/values          - Get field values
PUT    /custom-fields/values/{id}     - Update value
```

### Templates (4 endpoints)
```
GET    /custom-fields/templates       - List templates
POST   /custom-fields/templates       - Create template
PUT    /custom-fields/templates/{id}  - Update template
DELETE /custom-fields/templates/{id}  - Delete template
```

**Total: 16 API endpoints**

---

## ⚛️ **React Components Required**

### Core Components (5 components)
1. **FieldBuilder** - Main field builder interface
2. **FieldRenderer** - Renders custom fields in forms
3. **FieldPalette** - Draggable field types
4. **FieldSettings** - Field configuration panel
5. **FieldPreview** - Preview of field appearance

### Field Type Components (20 components)
- TextFieldComponent
- TextareaFieldComponent
- NumberFieldComponent
- SelectFieldComponent
- CheckboxFieldComponent
- DateFieldComponent
- FileFieldComponent
- ImageFieldComponent
- ColorFieldComponent
- RichTextFieldComponent
- etc. (one for each field type)

### Management Components (4 components)
1. **FieldGroupManager** - Manage field groups
2. **TemplateManager** - Manage templates
3. **FieldValueManager** - Manage saved values
4. **CustomFieldsPage** - Main management page

**Total: 29 React components**

---

## 🔌 **Integration Points**

### Forms to Integrate (8 forms)
1. **Agent Creation Form** - Add custom agent fields
2. **Agent Editing Form** - Edit custom agent fields
3. **Child Agent Form** - Child agent specific fields
4. **Task Creation Form** - Custom task fields
5. **Task Editing Form** - Edit task fields
6. **User Profile Form** - Custom profile fields
7. **Training Configuration** - Training specific fields
8. **Marketplace Item Form** - Custom item fields

### Pages to Add Integration (5 pages)
1. **Agent Page** - Show custom fields
2. **Task Page** - Show custom fields
3. **Profile Page** - Show custom fields
4. **Settings Page** - Field management
5. **Admin Page** - System-wide field management

---

## 📁 **Files to Create/Update**

### Backend Files (15 files)
```
backend/api/custom_fields/
├── __init__.py
├── endpoints.py
├── models.py
├── schemas.py
└── services.py

backend/models/
├── custom_field.py
├── custom_field_group.py
├── custom_field_value.py
└── field_template.py

backend/services/
├── custom_field_service.py
├── field_builder_service.py
└── field_renderer_service.py

backend/migrations/
├── add_custom_fields_tables.py
└── seed_default_field_types.py
```

### Frontend Files (25 files)
```
frontend/src/components/CustomFields/
├── FieldBuilder.tsx
├── FieldRenderer.tsx
├── FieldPalette.tsx
├── FieldSettings.tsx
├── FieldPreview.tsx
├── FieldTypeComponents/
│   ├── TextFieldComponent.tsx
│   ├── SelectFieldComponent.tsx
│   ├── CheckboxFieldComponent.tsx
│   ├── DateFieldComponent.tsx
│   ├── FileFieldComponent.tsx
│   └── [15 more field components]
├── FieldGroupManager.tsx
├── TemplateManager.tsx
├── FieldValueManager.tsx
└── types/
    └── index.ts

frontend/src/pages/CustomFields/
├── CustomFieldsPage.tsx
├── FieldDesigner.tsx
├── TemplateLibrary.tsx
├── API_GUIDE.md
└── index.ts

frontend/src/services/
├── customFields.ts
└── fieldTemplates.ts
```

**Total: 40 files to create/update**

---

## 📊 **Implementation Timeline**

### Week 1: Foundation & Backend (5 days)
- **Day 1:** Database design and migration scripts
- **Day 2:** Backend models and schemas
- **Day 3:** API endpoints development
- **Day 4:** Field validation and services
- **Day 5:** Basic field types implementation

### Week 2: Frontend Core (5 days)
- **Day 1:** Field builder interface
- **Day 2:** Drag & drop functionality
- **Day 3:** Field renderer component
- **Day 4:** Field settings panel
- **Day 5:** Template system UI

### Week 3: Integration & Advanced (5 days)
- **Day 1:** Form integration (agents, tasks)
- **Day 2:** Advanced field types
- **Day 3:** Field templates and library
- **Day 4:** Testing and bug fixes
- **Day 5:** Documentation and deployment

---

## ✅ **Definition of Done**

### Functional Requirements
- [ ] User can create custom fields through UI
- [ ] 20 field types are fully implemented
- [ ] Fields render automatically in target forms
- [ ] Field values are saved and retrieved correctly
- [ ] Template system allows field reuse
- [ ] Field groups organize related fields
- [ ] Validation works for all field types
- [ ] Mobile responsive design

### Technical Requirements
- [ ] All 16 API endpoints working
- [ ] 4 database tables created
- [ ] 29 React components implemented
- [ ] Integration with 8 existing forms
- [ ] Performance tested with 50+ fields
- [ ] Error handling for all scenarios
- [ ] Complete API documentation
- [ ] Unit tests for critical functions

### Quality Requirements
- [ ] Code follows English-only policy
- [ ] TypeScript types for all components
- [ ] Proper error handling
- [ ] Loading states for async operations
- [ ] Accessibility compliance
- [ ] Cross-browser compatibility
- [ ] Documentation is complete

---

## 🎯 **Success Metrics**

### User Experience
- **Field Creation Time:** < 2 minutes per field
- **Form Loading Time:** < 3 seconds with 20 fields
- **User Adoption:** 80% of users create custom fields
- **Error Rate:** < 5% field creation failures

### Technical Performance
- **API Response Time:** < 500ms for field operations
- **Database Query Time:** < 100ms for field retrieval
- **Frontend Render Time:** < 1 second for 50 fields
- **Memory Usage:** < 50MB additional overhead

---

## 🚀 **Future Enhancements**

### Phase 2 Features
- **Conditional Logic:** Show/hide fields based on other values
- **Field Dependencies:** Cascade dropdown options
- **Advanced Validation:** Custom validation rules
- **Bulk Operations:** Mass field creation/editing
- **Field Analytics:** Usage tracking and insights

### Phase 3 Features
- **API Integration:** Connect fields to external APIs
- **Workflow Triggers:** Field changes trigger actions
- **Field Versioning:** Track field configuration history
- **Advanced Templates:** Logic-based templates
- **Multi-language Support:** Translate field labels

---

## ⚠️ **Risks & Mitigation**

### Technical Risks
1. **Performance with Many Fields**
   - Mitigation: Lazy loading, pagination
2. **Complex Validation Logic**
   - Mitigation: Modular validation system
3. **Integration Complexity**
   - Mitigation: Standardized integration interface

### User Experience Risks
1. **UI Complexity**
   - Mitigation: Progressive disclosure, tutorials
2. **Learning Curve**
   - Mitigation: Templates, examples, documentation

---

## 🔥 **PRIORITY: CRITICAL**

This feature is a **game-changer** that will differentiate DPRO AI Agent from competitors by providing:
- **Flexibility:** Adapt to any use case
- **Scalability:** Grow with user needs  
- **User Empowerment:** No-code customization
- **Competitive Advantage:** Unique value proposition

**Recommendation:** Start implementation immediately after completing remaining API guides.

---

**Created:** June 29, 2025  
**Updated:** June 29, 2025  
**Next Review:** June 30, 2025 