import React, { useState, useRef } from 'react';
import { FormField, FormConfiguration, FieldType } from '../types';
import { FIELD_TYPES } from '../utils/constants';
import FieldRenderer from './FieldRenderer';

interface FormCanvasProps {
  form: FormConfiguration;
  selectedFieldId: string | null;
  onFieldSelect: (fieldId: string | null) => void;
  onFieldAdd: (fieldType: FieldType, position?: number) => void;
  onFieldUpdate: (fieldId: string, updates: Partial<FormField>) => void;
  onFieldDelete: (fieldId: string) => void;
  onFieldDuplicate: (fieldId: string) => void;
  onFieldMove: (fieldId: string, newPosition: number) => void;
  isPreview?: boolean;
}

const FormCanvas: React.FC<FormCanvasProps> = ({
  form,
  selectedFieldId,
  onFieldSelect,
  onFieldAdd,
  onFieldUpdate,
  onFieldDelete,
  onFieldDuplicate,
  onFieldMove,
  isPreview = false
}) => {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    // Find the closest field position
    let closestIndex = form.fields.length;
    let minDistance = Infinity;
    
    form.fields.forEach((field, index) => {
      const fieldElement = document.getElementById(`field-${field.id}`);
      if (fieldElement) {
        const fieldRect = fieldElement.getBoundingClientRect();
        const fieldY = fieldRect.top - rect.top + fieldRect.height / 2;
        const distance = Math.abs(y - fieldY);
        
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = y < fieldY ? index : index + 1;
        }
      }
    });
    
    setDragOverIndex(closestIndex);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!canvasRef.current?.contains(e.relatedTarget as Node)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIndex(null);
    setIsDragging(false);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      
      if (data.isNew) {
        // Adding new field from palette
        const fieldType = FIELD_TYPES[data.type.toUpperCase()];
        if (fieldType) {
          onFieldAdd(fieldType, dragOverIndex ?? undefined);
        }
      } else {
        // Moving existing field
        const fieldId = data.fieldId;
        const newPosition = dragOverIndex ?? form.fields.length;
        onFieldMove(fieldId, newPosition);
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };

  const handleFieldDragStart = (e: React.DragEvent, field: FormField) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ 
      fieldId: field.id, 
      isNew: false 
    }));
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleFieldDragEnd = () => {
    setIsDragging(false);
    setDragOverIndex(null);
  };

  const renderDropZone = (index: number) => (
    <div
      key={`drop-zone-${index}`}
      style={{
        height: dragOverIndex === index ? '40px' : '8px',
        backgroundColor: dragOverIndex === index ? '#EEF2FF' : 'transparent',
        border: dragOverIndex === index ? '2px dashed #4F46E5' : 'none',
        borderRadius: '4px',
        margin: '4px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        opacity: isDragging ? 1 : 0
      }}
    >
      {dragOverIndex === index && (
        <span style={{
          fontSize: '12px',
          color: '#4F46E5',
          fontWeight: '500'
        }}>
          Drop field here
        </span>
      )}
    </div>
  );

  const renderFormHeader = () => (
    <div style={{
      marginBottom: '32px',
      textAlign: 'center',
      padding: '24px'
    }}>
      <h1 style={{
        fontSize: '28px',
        fontWeight: '600',
        color: form.theme.textColor,
        margin: 0,
        marginBottom: '8px'
      }}>
        {form.title}
      </h1>
      {form.description && (
        <p style={{
          fontSize: '16px',
          color: '#6B7280',
          margin: 0,
          lineHeight: '1.5'
        }}>
          {form.description}
        </p>
      )}
    </div>
  );

  const renderEmptyState = () => (
    <div style={{
      textAlign: 'center',
      padding: '80px 20px',
      color: '#6B7280'
    }}>
      <div style={{
        fontSize: '48px',
        marginBottom: '16px'
      }}>
        📝
      </div>
      <h3 style={{
        fontSize: '18px',
        fontWeight: '500',
        margin: 0,
        marginBottom: '8px'
      }}>
        Start building your form
      </h3>
      <p style={{
        fontSize: '14px',
        margin: 0,
        lineHeight: '1.5'
      }}>
        Drag fields from the sidebar to begin creating your form
      </p>
    </div>
  );

  return (
    <div
      ref={canvasRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !isPreview && onFieldSelect(null)}
      style={{
        flex: 1,
        padding: '24px',
        backgroundColor: form.theme.backgroundColor,
        minHeight: '100%',
        fontFamily: form.theme.fontFamily,
        fontSize: `${form.theme.fontSize}px`,
        color: form.theme.textColor,
        overflow: 'auto'
      }}
    >
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        backgroundColor: '#FFFFFF',
        borderRadius: `${form.theme.borderRadius}px`,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        padding: '32px',
        minHeight: '400px'
      }}>
        {renderFormHeader()}
        
        {form.fields.length === 0 ? (
          renderEmptyState()
        ) : (
          <div>
            {renderDropZone(0)}
            {form.fields.map((field, index) => (
              <React.Fragment key={field.id}>
                <div
                  id={`field-${field.id}`}
                  draggable={!isPreview}
                  onDragStart={(e) => handleFieldDragStart(e, field)}
                  onDragEnd={handleFieldDragEnd}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isPreview) {
                      onFieldSelect(field.id);
                    }
                  }}
                  style={{
                    position: 'relative',
                    margin: '16px 0',
                    padding: '16px',
                    borderRadius: '8px',
                    border: selectedFieldId === field.id ? '2px solid #4F46E5' : '2px solid transparent',
                    backgroundColor: selectedFieldId === field.id ? '#F8FAFF' : 'transparent',
                    cursor: isPreview ? 'default' : 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isPreview && selectedFieldId !== field.id) {
                      e.currentTarget.style.backgroundColor = '#F9FAFB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isPreview && selectedFieldId !== field.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {/* Field Actions */}
                  {!isPreview && selectedFieldId === field.id && (
                    <div style={{
                      position: 'absolute',
                      top: '-12px',
                      right: '8px',
                      display: 'flex',
                      gap: '4px',
                      backgroundColor: '#FFFFFF',
                      padding: '4px',
                      borderRadius: '6px',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                      border: '1px solid #E5E7EB'
                    }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFieldDuplicate(field.id);
                        }}
                        style={{
                          width: '24px',
                          height: '24px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px'
                        }}
                        title="Duplicate field"
                      >
                        📋
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFieldDelete(field.id);
                        }}
                        style={{
                          width: '24px',
                          height: '24px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          color: '#EF4444'
                        }}
                        title="Delete field"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                  
                  {/* Drag Handle */}
                  {!isPreview && selectedFieldId === field.id && (
                    <div style={{
                      position: 'absolute',
                      left: '-12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '20px',
                      height: '20px',
                      backgroundColor: '#4F46E5',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'grab',
                      color: '#FFFFFF',
                      fontSize: '12px'
                    }}>
                      ⋮⋮
                    </div>
                  )}
                  
                  <FieldRenderer
                    field={field}
                    isPreview={isPreview}
                    isSelected={selectedFieldId === field.id}
                    onChange={(updates) => onFieldUpdate(field.id, updates)}
                  />
                </div>
                {renderDropZone(index + 1)}
              </React.Fragment>
            ))}
          </div>
        )}
        
        {/* Submit Button */}
        {(isPreview || form.fields.length > 0) && (
          <div style={{
            textAlign: 'center',
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid #E5E7EB'
          }}>
            <button
              type="submit"
              disabled={!isPreview}
              style={{
                padding: '12px 32px',
                backgroundColor: form.theme.primaryColor,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: `${form.theme.borderRadius}px`,
                fontSize: '16px',
                fontWeight: '500',
                cursor: isPreview ? 'pointer' : 'default',
                opacity: isPreview ? 1 : 0.6,
                transition: 'all 0.2s ease'
              }}
            >
              {form.settings.submitButtonText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormCanvas; 