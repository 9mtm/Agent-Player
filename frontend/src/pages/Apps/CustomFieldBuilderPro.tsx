import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Field Types for the library
const FIELD_TYPES = [
  // Basic Fields
  { id: 'text', name: 'Text Field', icon: '📝', category: 'basic', description: 'Single line text input' },
  { id: 'textarea', name: 'Text Area', icon: '📄', category: 'basic', description: 'Multi-line text input' },
  { id: 'number', name: 'Number', icon: '🔢', category: 'basic', description: 'Numeric input with validation' },
  { id: 'email', name: 'Email', icon: '📧', category: 'basic', description: 'Email address validation' },
  { id: 'password', name: 'Password', icon: '🔒', category: 'basic', description: 'Secure password input' },
  { id: 'url', name: 'URL', icon: '🔗', category: 'basic', description: 'Web address validation' },
  { id: 'date', name: 'Date', icon: '📅', category: 'basic', description: 'Date picker' },
  { id: 'time', name: 'Time', icon: '⏰', category: 'basic', description: 'Time picker' },
  
  // Selection Fields
  { id: 'select', name: 'Select', icon: '📋', category: 'selection', description: 'Dropdown selection' },
  { id: 'radio', name: 'Radio', icon: '🔘', category: 'selection', description: 'Single choice radio buttons' },
  { id: 'checkbox', name: 'Checkbox', icon: '☑️', category: 'selection', description: 'Multiple choice checkboxes' },
  { id: 'toggle', name: 'Toggle', icon: '🔄', category: 'selection', description: 'Boolean toggle switch' },
  
  // Advanced Fields
  { id: 'code', name: 'Code Editor', icon: '💻', category: 'advanced', description: 'Python, JS, JSON code editor' },
  { id: 'rich_text', name: 'Rich Text', icon: '📝', category: 'advanced', description: 'WYSIWYG text editor' },
  { id: 'file', name: 'File Upload', icon: '📁', category: 'advanced', description: 'File upload with preview' },
  { id: 'image', name: 'Image Gallery', icon: '🖼️', category: 'advanced', description: 'Multiple image upload' },
  { id: 'color', name: 'Color Picker', icon: '🎨', category: 'advanced', description: 'Color selection tool' },
  { id: 'slider', name: 'Slider', icon: '📏', category: 'advanced', description: 'Range input slider' },
  
  // Smart Fields
  { id: 'api_connector', name: 'API Connector', icon: '🔌', category: 'smart', description: 'Connect to external APIs' },
  { id: 'database_query', name: 'Database Query', icon: '🗄️', category: 'smart', description: 'SQL query builder' },
  { id: 'python_executor', name: 'Python Executor', icon: '🐍', category: 'smart', description: 'Execute Python code' },
  { id: 'chart_builder', name: 'Chart Builder', icon: '📊', category: 'smart', description: 'Data visualization' },
  { id: 'map', name: 'Map Field', icon: '🗺️', category: 'smart', description: 'Interactive maps' },
  { id: 'json_editor', name: 'JSON Editor', icon: '{}', category: 'smart', description: 'JSON data editor' }
] as const;

type FieldType = typeof FIELD_TYPES[number];

interface CustomField {
  id: string;
  type: string;
  name: string;
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: Record<string, unknown>;
  options?: string[];
  defaultValue?: unknown;
  config?: Record<string, unknown>;
}

interface PageConfig {
  name: string;
  slug: string;
  icon: string;
  description: string;
  addToSidebar: boolean;
  layout: 'single' | 'two-column' | 'three-column';
  permissions: string[];
  fields: CustomField[];
}

interface SortableFieldProps {
  field: CustomField;
  selectedField: CustomField | null;
  setSelectedField: (field: CustomField) => void;
  removeField: (id: string) => void;
}

// Sortable Field Component
function SortableField({ field, selectedField, setSelectedField, removeField }: SortableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setSelectedField(field)}
      className="sortable-field"
    >
      <div style={{
        background: selectedField?.id === field.id ? '#e3f2fd' : '#f8f9fa',
        border: selectedField?.id === field.id ? '2px solid #2196f3' : '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '12px',
        cursor: 'grab'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>
              {FIELD_TYPES.find(t => t.id === field.type)?.icon}
            </span>
            <div>
              <div style={{ fontWeight: '600', color: '#2c3e50' }}>{field.label}</div>
              <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                {field.type} • {field.required ? 'Required' : 'Optional'}
              </div>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeField(field.id);
            }}
            style={{
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

const CustomFieldBuilderPro: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'builder' | 'preview' | 'code' | 'settings'>('builder');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [fields, setFields] = useState<CustomField[]>([]);
  const [selectedField, setSelectedField] = useState<CustomField | null>(null);
  const [pageConfig, setPageConfig] = useState<PageConfig>({
    name: 'My Custom Page',
    slug: 'my-custom-page',
    icon: '📄',
    description: 'A custom page created with Field Builder Pro',
    addToSidebar: true,
    layout: 'single',
    permissions: ['user'],
    fields: []
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const categories = [
    { id: 'all', name: 'All Fields', icon: '🔧' },
    { id: 'basic', name: 'Basic', icon: '📝' },
    { id: 'selection', name: 'Selection', icon: '📋' },
    { id: 'advanced', name: 'Advanced', icon: '⚡' },
    { id: 'smart', name: 'Smart', icon: '🤖' }
  ];

  const filteredFields = selectedCategory === 'all' 
    ? FIELD_TYPES 
    : FIELD_TYPES.filter(field => field.category === selectedCategory);

  const addField = (fieldType: FieldType) => {
    const newField: CustomField = {
      id: `field_${Date.now()}`,
      type: fieldType.id,
      name: `${fieldType.name.toLowerCase().replace(/\s+/g, '_')}_${fields.length + 1}`,
      label: fieldType.name,
      placeholder: `Enter ${fieldType.name.toLowerCase()}...`,
      required: false,
      validation: {},
      config: {}
    };
    setFields([...fields, newField]);
  };

  const removeField = (fieldId: string) => {
    setFields(fields.filter(f => f.id !== fieldId));
    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }
  };

  const updateField = (fieldId: string, updates: Partial<CustomField>) => {
    setFields(fields.map(f => f.id === fieldId ? { ...f, ...updates } : f));
    if (selectedField?.id === fieldId) {
      setSelectedField({ ...selectedField, ...updates });
    }
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setFields((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  const generateCode = () => {
    return {
      frontend: `// Auto-generated React component
import React from 'react';

const ${pageConfig.name.replace(/\s+/g, '')}Page: React.FC = () => {
  return (
    <div className="custom-page">
      <h1>${pageConfig.name}</h1>
      ${fields.map(field => `
      <div className="field-group">
        <label>${field.label}</label>
        <input type="${field.type}" name="${field.name}" ${field.required ? 'required' : ''} />
      </div>`).join('')}
    </div>
  );
};`,
      backend: `# Auto-generated FastAPI endpoints
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter()

@router.post("/api/custom/${pageConfig.slug}")
async def create_${pageConfig.slug.replace('-', '_')}(data: dict):
    # Auto-generated CRUD operations
    pass

@router.get("/api/custom/${pageConfig.slug}")  
async def list_${pageConfig.slug.replace('-', '_')}():
    # Auto-generated list endpoint
    pass`,
      mcp: `# Auto-generated MCP Tool
@mcp_tool
async def ${pageConfig.slug.replace('-', '_')}_tool(${fields.map(f => `${f.name}: str`).join(', ')}):
    """
    ${pageConfig.description}
    AI agents can use this tool to interact with custom data.
    """
    # Execute custom logic
    return {"success": True, "data": processed_data}`
    };
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '30px',
          marginBottom: '20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '32px', color: '#2c3e50', marginBottom: '10px' }}>
                🔧 Custom Field Builder Pro
              </h1>
              <p style={{ color: '#7f8c8d', fontSize: '16px' }}>
                Create powerful custom pages with drag & drop field builder, Python code execution, and auto-generated APIs
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={{
                padding: '10px 20px',
                background: '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer'
              }}>
                💾 Save Page
              </button>
              <button style={{
                padding: '10px 20px',
                background: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer'
              }}>
                🚀 Deploy
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 350px', gap: '20px', height: 'calc(100vh - 200px)' }}>
          
          {/* Left Sidebar - Field Library */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            overflow: 'auto'
          }}>
            <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>📚 Field Library</h3>
            
            {/* Categories */}
            <div style={{ marginBottom: '20px' }}>
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    margin: '2px 0',
                    background: selectedCategory === category.id ? '#e3f2fd' : 'transparent',
                    border: selectedCategory === category.id ? '2px solid #2196f3' : '1px solid #e0e0e0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px'
                  }}
                >
                  {category.icon} {category.name}
                </button>
              ))}
            </div>

            {/* Field Types */}
            <div>
              {filteredFields.map(fieldType => (
                <div
                  key={fieldType.id}
                  onClick={() => addField(fieldType)}
                  style={{
                    padding: '12px',
                    margin: '8px 0',
                    background: '#f8f9fa',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e3f2fd';
                    e.currentTarget.style.borderColor = '#2196f3';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8f9fa';
                    e.currentTarget.style.borderColor = '#e0e0e0';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{fieldType.icon}</span>
                    <div>
                      <div style={{ fontWeight: '600', color: '#2c3e50' }}>{fieldType.name}</div>
                      <div style={{ fontSize: '12px', color: '#7f8c8d' }}>{fieldType.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Center - Form Builder */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            overflow: 'auto'
          }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              {[
                { id: 'builder', name: 'Form Builder', icon: '🔧' },
                { id: 'preview', name: 'Live Preview', icon: '👁️' },
                { id: 'code', name: 'Generated Code', icon: '💻' },
                { id: 'settings', name: 'Page Settings', icon: '⚙️' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'builder' | 'preview' | 'code' | 'settings')}
                  style={{
                    padding: '10px 16px',
                    background: activeTab === tab.id ? '#2196f3' : '#f8f9fa',
                    color: activeTab === tab.id ? 'white' : '#2c3e50',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {tab.icon} {tab.name}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'builder' && (
              <div>
                <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>
                  🎨 Form Builder - {pageConfig.name}
                </h3>
                
                {fields.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    background: '#f8f9fa',
                    borderRadius: '12px',
                    border: '2px dashed #e0e0e0'
                  }}>
                    <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔧</div>
                    <h3 style={{ color: '#2c3e50', marginBottom: '10px' }}>Start Building Your Form</h3>
                    <p style={{ color: '#7f8c8d' }}>
                      Drag field types from the left panel to build your custom form
                    </p>
                  </div>
                ) : (
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                      {fields.map((field) => (
                        <SortableField
                          key={field.id}
                          field={field}
                          selectedField={selectedField}
                          setSelectedField={setSelectedField}
                          removeField={removeField}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            )}

            {activeTab === 'preview' && (
              <div>
                <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>
                  👁️ Live Preview - {pageConfig.name}
                </h3>
                <div style={{
                  background: '#f8f9fa',
                  borderRadius: '12px',
                  padding: '30px',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{ marginBottom: '20px' }}>
                    <h2 style={{ color: '#2c3e50' }}>{pageConfig.name}</h2>
                    <p style={{ color: '#7f8c8d' }}>{pageConfig.description}</p>
                  </div>
                  
                  {fields.map(field => (
                    <div key={field.id} style={{ marginBottom: '20px' }}>
                      <label style={{ 
                        display: 'block',
                        fontWeight: '600',
                        color: '#2c3e50',
                        marginBottom: '8px'
                      }}>
                        {field.label} {field.required && <span style={{ color: '#e74c3c' }}>*</span>}
                      </label>
                      
                      {field.type === 'textarea' ? (
                        <textarea
                          placeholder={field.placeholder}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '2px solid #e0e0e0',
                            borderRadius: '8px',
                            fontSize: '14px',
                            minHeight: '100px'
                          }}
                        />
                      ) : field.type === 'select' ? (
                        <select style={{
                          width: '100%',
                          padding: '12px',
                          border: '2px solid #e0e0e0',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}>
                          <option>Select an option...</option>
                        </select>
                      ) : field.type === 'code' ? (
                        <div style={{
                          background: '#1e1e1e',
                          color: '#f8f8f2',
                          padding: '16px',
                          borderRadius: '8px',
                          fontFamily: 'Monaco, monospace',
                          fontSize: '14px',
                          minHeight: '120px'
                        }}>
                          <div style={{ color: '#6272a4' }}># Python Code Editor</div>
                          <div style={{ color: '#8be9fd' }}>def</div> <span style={{ color: '#50fa7b' }}>process_data</span>():
                          <div style={{ marginLeft: '20px', color: '#f8f8f2' }}>
                            <span style={{ color: '#ff79c6' }}>return</span> <span style={{ color: '#f1fa8c' }}>"Hello World!"</span>
                          </div>
                        </div>
                      ) : (
                        <input
                          type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                          placeholder={field.placeholder}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '2px solid #e0e0e0',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        />
                      )}
                    </div>
                  ))}
                  
                  <button style={{
                    background: '#27ae60',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}>
                    🚀 Submit Form
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'code' && (
              <div>
                <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>
                  💻 Generated Code
                </h3>
                
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  {(['frontend', 'backend', 'mcp'] as const).map((codeType) => (
                    <button
                      key={codeType}
                      style={{
                        padding: '8px 16px',
                        background: '#f8f9fa',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                      }}
                    >
                      {codeType === 'frontend' ? '⚛️ Frontend' : 
                       codeType === 'backend' ? '🐍 Backend' : '🤖 MCP Tools'}
                    </button>
                  ))}
                </div>

                <div style={{
                  background: '#1e1e1e',
                  color: '#f8f8f2',
                  padding: '20px',
                  borderRadius: '8px',
                  fontFamily: 'Monaco, monospace',
                  fontSize: '14px',
                  overflow: 'auto',
                  maxHeight: '400px'
                }}>
                  <pre>{generateCode().frontend}</pre>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>
                  ⚙️ Page Settings
                </h3>
                
                <div style={{ display: 'grid', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
                      Page Name
                    </label>
                    <input
                      type="text"
                      value={pageConfig.name}
                      onChange={(e) => setPageConfig({...pageConfig, name: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e0e0e0',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
                      URL Slug
                    </label>
                    <input
                      type="text"
                      value={pageConfig.slug}
                      onChange={(e) => setPageConfig({...pageConfig, slug: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e0e0e0',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
                      Page Icon
                    </label>
                    <input
                      type="text"
                      value={pageConfig.icon}
                      onChange={(e) => setPageConfig({...pageConfig, icon: e.target.value})}
                      placeholder="📄"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e0e0e0',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
                      Description
                    </label>
                    <textarea
                      value={pageConfig.description}
                      onChange={(e) => setPageConfig({...pageConfig, description: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e0e0e0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        minHeight: '80px'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={pageConfig.addToSidebar}
                        onChange={(e) => setPageConfig({...pageConfig, addToSidebar: e.target.checked})}
                      />
                      Add to sidebar navigation
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Field Properties */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            overflow: 'auto'
          }}>
            <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>🎛️ Field Properties</h3>
            
            {selectedField ? (
              <div style={{ display: 'grid', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
                    Field Label
                  </label>
                  <input
                    type="text"
                    value={selectedField.label}
                    onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
                    Field Name
                  </label>
                  <input
                    type="text"
                    value={selectedField.name}
                    onChange={(e) => updateField(selectedField.id, { name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
                    Placeholder
                  </label>
                  <input
                    type="text"
                    value={selectedField.placeholder || ''}
                    onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={selectedField.required}
                      onChange={(e) => updateField(selectedField.id, { required: e.target.checked })}
                    />
                    Required Field
                  </label>
                </div>
                
                <div style={{
                  background: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0'
                }}>
                  <h4 style={{ color: '#2c3e50', marginBottom: '10px' }}>Field Type</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>
                      {FIELD_TYPES.find(t => t.id === selectedField.type)?.icon}
                    </span>
                    <div>
                      <div style={{ fontWeight: '600' }}>
                        {FIELD_TYPES.find(t => t.id === selectedField.type)?.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                        {FIELD_TYPES.find(t => t.id === selectedField.type)?.description}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#7f8c8d'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>🎛️</div>
                <p>Select a field from the form builder to edit its properties</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomFieldBuilderPro; 