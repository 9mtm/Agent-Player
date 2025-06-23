import React, { useState, useCallback } from 'react';
import { useFormBuilder } from './hooks/useFormBuilder';
import { FieldType } from './types';
import FieldPalette from './components/FieldPalette';
import FormCanvas from './components/FormCanvas';
import PropertiesPanel from './components/PropertiesPanel';
import FormToolbar from './components/FormToolbar';

const FormBuilderPage: React.FC = () => {
  const {
    form,
    selectedFieldId,
    previewMode,
    isLoading,
    hasUnsavedChanges,
    addField,
    updateField,
    deleteField,
    duplicateField,
    moveField,
    selectField,
    updateFormSettings,
    togglePreview,
    saveForm,
    publishForm,
    exportForm,
    importForm
  } = useFormBuilder();

  const [draggedField, setDraggedField] = useState<FieldType | null>(null);

  // Handle field drag from palette
  const handleFieldDragStart = useCallback((fieldType: FieldType) => {
    setDraggedField(fieldType);
  }, []);

  const handleFieldDragEnd = useCallback(() => {
    setDraggedField(null);
  }, []);

  // Handle form title change
  const handleFormTitleChange = useCallback((title: string) => {
    updateFormSettings({ title });
  }, [updateFormSettings]);

  // Handle save
  const handleSave = useCallback(async () => {
    const result = await saveForm();
    if (result.success) {
      // Show success notification
      console.log('Form saved successfully');
    } else {
      // Show error notification
      console.error('Failed to save form:', result.error);
    }
  }, [saveForm]);

  // Handle publish
  const handlePublish = useCallback(async () => {
    const result = await publishForm();
    if (result.success) {
      // Show success notification
      console.log('Form published successfully');
    } else {
      // Show error notification
      console.error('Failed to publish form:', result.error);
    }
  }, [publishForm]);

  // Handle export
  const handleExport = useCallback(() => {
    exportForm('json');
  }, [exportForm]);

  // Handle import
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            const result = importForm(data);
            if (result.success) {
              console.log('Form imported successfully');
            } else {
              console.error('Failed to import form:', result.error);
            }
          } catch (error) {
            console.error('Invalid JSON file:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [importForm]);

  // Get selected field
  const selectedField = selectedFieldId 
    ? form.fields.find(field => field.id === selectedFieldId) || null
    : null;

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#F3F4F6',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflow: 'hidden'
    }}>
      {/* Toolbar */}
      <FormToolbar
        form={form}
        isPreview={previewMode}
        hasUnsavedChanges={hasUnsavedChanges}
        onPreviewToggle={togglePreview}
        onSave={handleSave}
        onPublish={handlePublish}
        onExport={handleExport}
        onImport={handleImport}
        onFormTitleChange={handleFormTitleChange}
      />

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden'
      }}>
        {/* Field Palette - Hidden in preview mode */}
        {!previewMode && (
          <FieldPalette
            onFieldDragStart={handleFieldDragStart}
            onFieldDragEnd={handleFieldDragEnd}
          />
        )}

        {/* Form Canvas */}
        <FormCanvas
          form={form}
          selectedFieldId={selectedFieldId}
          onFieldSelect={selectField}
          onFieldAdd={addField}
          onFieldUpdate={updateField}
          onFieldDelete={deleteField}
          onFieldDuplicate={duplicateField}
          onFieldMove={moveField}
          isPreview={previewMode}
        />

        {/* Properties Panel - Hidden in preview mode */}
        {!previewMode && (
          <PropertiesPanel
            field={selectedField}
            onChange={(updatedField) => updateField(updatedField.id, updatedField)}
            onClose={() => selectField(null)}
          />
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            padding: '24px',
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid #E5E7EB',
              borderTop: '2px solid #4F46E5',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <span style={{ fontSize: '14px', color: '#374151' }}>
              Saving form...
            </span>
          </div>
        </div>
      )}

      {/* Global Styles */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        * {
          box-sizing: border-box;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: #F3F4F6;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #D1D5DB;
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #9CA3AF;
        }
        
        /* Drag and drop visual feedback */
        .drag-over {
          background-color: #EEF2FF !important;
          border-color: #4F46E5 !important;
        }
        
        .dragging {
          opacity: 0.5;
        }
        
        /* Form field focus styles */
        input:focus,
        textarea:focus,
        select:focus {
          outline: none;
          border-color: #4F46E5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }
        
        /* Button hover effects */
        button:hover {
          transform: translateY(-1px);
        }
        
        button:active {
          transform: translateY(0);
        }
        
        /* Selection styles */
        .field-selected {
          border-color: #4F46E5 !important;
          background-color: #F8FAFF !important;
        }
        
        /* Transition animations */
        .fade-in {
          animation: fadeIn 0.2s ease-in;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        /* Responsive design */
        @media (max-width: 1024px) {
          .properties-panel {
            position: fixed;
            top: 60px;
            right: 0;
            bottom: 0;
            z-index: 100;
            box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
          }
        }
        
        @media (max-width: 768px) {
          .field-palette {
            width: 250px;
          }
          
          .properties-panel {  
            width: 280px;
          }
        }
      `}</style>
    </div>
  );
};

export default FormBuilderPage; 