import React from 'react';
import { FormConfiguration } from '../types';

interface FormToolbarProps {
  form: FormConfiguration;
  isPreview: boolean;
  hasUnsavedChanges: boolean;
  onPreviewToggle: () => void;
  onSave: () => void;
  onPublish: () => void;
  onExport: () => void;
  onImport: () => void;
  onFormTitleChange: (title: string) => void;
}

const FormToolbar: React.FC<FormToolbarProps> = ({
  form,
  isPreview,
  hasUnsavedChanges,
  onPreviewToggle,
  onSave,
  onPublish,
  onExport,
  onImport,
  onFormTitleChange
}) => {
  return (
    <div style={{
      height: '60px',
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid #E5E7EB',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      gap: '16px'
    }}>
      {/* Left Section - Form Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
        <div style={{ fontSize: '18px', fontWeight: '600', color: '#4F46E5' }}>
          📝 Form Builder
        </div>
        <div style={{ height: '24px', width: '1px', backgroundColor: '#E5E7EB' }} />
        <input
          type="text"
          value={form.title}
          onChange={(e) => onFormTitleChange(e.target.value)}
          placeholder="Untitled Form"
          style={{
            border: 'none',
            outline: 'none',
            fontSize: '16px',
            fontWeight: '500',
            color: '#1F2937',
            backgroundColor: 'transparent',
            minWidth: '200px',
            maxWidth: '400px'
          }}
        />
        {hasUnsavedChanges && (
          <span style={{
            fontSize: '12px',
            color: '#F59E0B',
            backgroundColor: '#FEF3C7',
            padding: '2px 8px',
            borderRadius: '12px'
          }}>
            Unsaved
          </span>
        )}
      </div>

      {/* Center Section - Form Stats */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        fontSize: '12px',
        color: '#6B7280'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>📊</span>
          <span>{form.fields.length} fields</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>👁️</span>
          <span>0 views</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>📝</span>
          <span>0 responses</span>
        </div>
      </div>

      {/* Right Section - Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Preview Toggle */}
        <button
          onClick={onPreviewToggle}
          style={{
            padding: '8px 16px',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            backgroundColor: isPreview ? '#4F46E5' : '#FFFFFF',
            color: isPreview ? '#FFFFFF' : '#374151',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
        >
          <span>{isPreview ? '✏️' : '👁️'}</span>
          <span>{isPreview ? 'Edit' : 'Preview'}</span>
        </button>

        {/* Save Button */}
        <button
          onClick={onSave}
          disabled={!hasUnsavedChanges}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: hasUnsavedChanges ? '#10B981' : '#E5E7EB',
            color: hasUnsavedChanges ? '#FFFFFF' : '#9CA3AF',
            fontSize: '14px',
            fontWeight: '500',
            cursor: hasUnsavedChanges ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
        >
          <span>💾</span>
          <span>Save</span>
        </button>

        {/* More Actions Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            style={{
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            ⋮
          </button>
        </div>

        {/* Publish Button */}
        <button
          onClick={onPublish}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: '#4F46E5',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#4338CA';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#4F46E5';
          }}
        >
          <span>🚀</span>
          <span>Publish</span>
        </button>
      </div>
    </div>
  );
};

export default FormToolbar; 