import React, { useState } from 'react';
import { FormField, ChoiceOption } from '../types';

interface PropertiesPanelProps {
  field: FormField | null;
  onChange: (field: FormField) => void;
  onClose: () => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ field, onChange, onClose }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'options' | 'validation'>('general');

  if (!field) {
    return (
      <div style={{
        width: '320px',
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderLeft: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6B7280'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚙️</div>
          <div style={{ fontSize: '14px' }}>Select a field to edit its properties</div>
        </div>
      </div>
    );
  }

  const updateField = (updates: Partial<FormField>) => {
    onChange({ ...field, ...updates });
  };

  const updateProperties = (updates: any) => {
    updateField({ properties: { ...field.properties, ...updates } });
  };

  const addOption = () => {
    const options = field.properties.options || [];
    const newOption: ChoiceOption = {
      id: Date.now().toString(),
      label: `Option ${options.length + 1}`,
      value: `option${options.length + 1}`
    };
    updateProperties({ options: [...options, newOption] });
  };

  const updateOption = (optionId: string, updates: Partial<ChoiceOption>) => {
    const options = field.properties.options || [];
    const updatedOptions = options.map(option =>
      option.id === optionId ? { ...option, ...updates } : option
    );
    updateProperties({ options: updatedOptions });
  };

  const removeOption = (optionId: string) => {
    const options = field.properties.options || [];
    updateProperties({ options: options.filter(option => option.id !== optionId) });
  };

  return (
    <div style={{
      width: '320px',
      height: '100%',
      backgroundColor: '#FFFFFF',
      borderLeft: '1px solid #E5E7EB',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Properties</h3>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
      </div>

      {/* Content */}
      <div style={{ padding: '16px', flex: 1, overflow: 'auto' }}>
        {/* Title */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
            Title *
          </label>
          <input
            type="text"
            value={field.title}
            onChange={(e) => updateField({ title: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
            Description
          </label>
          <textarea
            value={field.description || ''}
            onChange={(e) => updateField({ description: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              minHeight: '60px',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Required */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => updateField({ required: e.target.checked })}
            />
            <span style={{ fontSize: '14px' }}>Required field</span>
          </label>
        </div>

        {/* Options for choice fields */}
        {['single_choice', 'multiple_choice', 'dropdown', 'yes_no'].includes(field.type) && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500' }}>Options</label>
              <button
                onClick={addOption}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#4F46E5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                + Add
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(field.properties.options || []).map((option, index) => (
                <div key={option.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', minWidth: '20px' }}>{index + 1}.</span>
                  <input
                    type="text"
                    value={option.label}
                    onChange={(e) => updateOption(option.id, { label: e.target.value })}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  />
                  <button
                    onClick={() => removeOption(option.id)}
                    style={{
                      padding: '2px',
                      border: 'none',
                      background: 'none',
                      color: '#EF4444',
                      cursor: 'pointer'
                    }}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Placeholder for text fields */}
        {['short_text', 'long_text', 'email', 'number', 'phone', 'url'].includes(field.type) && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
              Placeholder
            </label>
            <input
              type="text"
              value={field.properties.placeholder || ''}
              onChange={(e) => updateProperties({ placeholder: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        )}

        {/* Rating settings */}
        {['rating', 'scale'].includes(field.type) && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                Rating Type
              </label>
              <select
                value={field.properties.ratingType || 'stars'}
                onChange={(e) => updateProperties({ ratingType: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="stars">Stars</option>
                <option value="numbers">Numbers</option>
                <option value="hearts">Hearts</option>
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                Max Rating
              </label>
              <input
                type="number"
                min="3"
                max="10"
                value={field.properties.ratingMax || 5}
                onChange={(e) => updateProperties({ ratingMax: parseInt(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PropertiesPanel; 