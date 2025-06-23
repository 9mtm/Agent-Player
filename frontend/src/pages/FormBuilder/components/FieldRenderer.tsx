import React from 'react';
import { FormField } from '../types';

interface FieldRendererProps {
  field: FormField;
  isPreview?: boolean;
  isSelected?: boolean;
  value?: any;
  onChange?: (updates: Partial<FormField>) => void;
  onValueChange?: (value: any) => void;
}

const FieldRenderer: React.FC<FieldRendererProps> = ({
  field,
  isPreview = false,
  isSelected = false,
  value,
  onChange,
  onValueChange
}) => {

  const renderFieldLabel = () => (
    <div style={{ marginBottom: '8px' }}>
      <label style={{
        fontSize: '14px',
        fontWeight: '500',
        color: '#374151',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        {isSelected && !isPreview ? (
          <input
            type="text"
            value={field.title}
            onChange={(e) => onChange?.({ title: e.target.value })}
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              width: '100%'
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          field.title
        )}
        {field.required && <span style={{ color: '#EF4444' }}>*</span>}
      </label>
      {field.description && (
        <p style={{
          fontSize: '12px',
          color: '#6B7280',
          margin: '4px 0 0 0',
          lineHeight: '1.4'
        }}>
          {isSelected && !isPreview ? (
            <input
              type="text"
              value={field.description}
              onChange={(e) => onChange?.({ description: e.target.value })}
              placeholder="Add field description..."
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '12px',
                color: '#6B7280',
                width: '100%'
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            field.description
          )}
        </p>
      )}
    </div>
  );

  const renderTextField = () => {
    const isLongText = field.type === 'long_text';
    const InputComponent = isLongText ? 'textarea' : 'input';
    
    return (
      <InputComponent
        type={field.properties.inputType || 'text'}
        placeholder={field.properties.placeholder}
        value={value || ''}
        onChange={(e) => onValueChange?.(e.target.value)}
        disabled={!isPreview}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #D1D5DB',
          borderRadius: '6px',
          fontSize: '14px',
          outline: 'none',
          transition: 'border-color 0.2s',
          resize: isLongText ? 'vertical' : 'none',
          minHeight: isLongText ? '80px' : 'auto',
          backgroundColor: isPreview ? '#FFFFFF' : '#F9FAFB',
          cursor: isPreview ? 'text' : 'default'
        }}
        onFocus={(e) => {
          if (isPreview) {
            e.target.style.borderColor = '#4F46E5';
            e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
          }
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#D1D5DB';
          e.target.style.boxShadow = 'none';
        }}
      />
    );
  };

  const renderChoiceField = () => {
    const options = field.properties.options || [];
    const isMultiple = field.type === 'multiple_choice';
    const isDropdown = field.type === 'dropdown';
    const inputType = isMultiple ? 'checkbox' : 'radio';

    if (isDropdown) {
      return (
        <select
          value={value || ''}
          onChange={(e) => onValueChange?.(e.target.value)}
          disabled={!isPreview}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: isPreview ? '#FFFFFF' : '#F9FAFB',
            cursor: isPreview ? 'pointer' : 'default'
          }}
        >
          <option value="">Select an option...</option>
          {options.map(option => (
            <option key={option.id} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {options.map(option => (
          <label
            key={option.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: isPreview ? 'pointer' : 'default',
              padding: '8px',
              borderRadius: '4px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              if (isPreview) {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <input
              type={inputType}
              name={field.id}
              value={option.value}
              checked={isMultiple 
                ? Array.isArray(value) && value.includes(option.value)
                : value === option.value
              }
              onChange={(e) => {
                if (!isPreview) return;
                
                if (isMultiple) {
                  const currentValues = Array.isArray(value) ? value : [];
                  if (e.target.checked) {
                    onValueChange?.([...currentValues, option.value]);
                  } else {
                    onValueChange?.(currentValues.filter(v => v !== option.value));
                  }
                } else {
                  onValueChange?.(option.value);
                }
              }}
              disabled={!isPreview}
              style={{
                width: '16px',
                height: '16px',
                cursor: isPreview ? 'pointer' : 'default'
              }}
            />
            <span style={{
              fontSize: '14px',
              color: '#374151'
            }}>
              {option.label}
            </span>
          </label>
        ))}
      </div>
    );
  };

  const renderRatingField = () => {
    const ratingMax = field.properties.ratingMax || 5;
    const ratingType = field.properties.ratingType || 'stars';
    const currentRating = value || 0;

    const getIcon = (index: number) => {
      const isActive = index <= currentRating;
      switch (ratingType) {
        case 'hearts':
          return isActive ? '❤️' : '🤍';
        case 'thumbs':
          return isActive ? '👍' : '👎';
        case 'numbers':
          return (index + 1).toString();
        default:
          return isActive ? '⭐' : '☆';
      }
    };

    return (
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {Array.from({ length: ratingMax }, (_, index) => (
          <button
            key={index}
            onClick={() => isPreview && onValueChange?.(index + 1)}
            disabled={!isPreview}
            style={{
              background: 'none',
              border: 'none',
              fontSize: ratingType === 'numbers' ? '14px' : '20px',
              cursor: isPreview ? 'pointer' : 'default',
              padding: '4px',
              borderRadius: '4px',
              transition: 'transform 0.1s',
              opacity: isPreview ? 1 : 0.6
            }}
            onMouseEnter={(e) => {
              if (isPreview) {
                e.currentTarget.style.transform = 'scale(1.1)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {getIcon(index)}
          </button>
        ))}
        {field.properties.ratingLabels && (
          <div style={{
            marginLeft: '12px',
            fontSize: '12px',
            color: '#6B7280'
          }}>
            {field.properties.ratingLabels[currentRating > 0 ? 1 : 0]}
          </div>
        )}
      </div>
    );
  };

  const renderDateField = () => (
    <input
      type="date"
      value={value || ''}
      onChange={(e) => onValueChange?.(e.target.value)}
      disabled={!isPreview}
      style={{
        width: '100%',
        padding: '10px 12px',
        border: '1px solid #D1D5DB',
        borderRadius: '6px',
        fontSize: '14px',
        outline: 'none',
        backgroundColor: isPreview ? '#FFFFFF' : '#F9FAFB',
        cursor: isPreview ? 'pointer' : 'default'
      }}
    />
  );

  const renderFileUpload = () => (
    <div style={{
      border: '2px dashed #D1D5DB',
      borderRadius: '6px',
      padding: '24px',
      textAlign: 'center',
      backgroundColor: isPreview ? '#FAFAFA' : '#F9FAFB',
      cursor: isPreview ? 'pointer' : 'default',
      transition: 'all 0.2s'
    }}
    onMouseEnter={(e) => {
      if (isPreview) {
        e.currentTarget.style.borderColor = '#4F46E5';
        e.currentTarget.style.backgroundColor = '#F8FAFF';
      }
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = '#D1D5DB';
      e.currentTarget.style.backgroundColor = isPreview ? '#FAFAFA' : '#F9FAFB';
    }}
    >
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>📁</div>
      <div style={{ fontSize: '14px', color: '#374151', marginBottom: '4px' }}>
        Click to upload or drag and drop
      </div>
      <div style={{ fontSize: '12px', color: '#6B7280' }}>
        {field.properties.acceptedTypes?.join(', ') || 'All file types'} 
        {field.properties.maxFileSize && ` (Max ${field.properties.maxFileSize}MB)`}
      </div>
      <input
        type="file"
        multiple={field.properties.maxFiles !== 1}
        accept={field.properties.acceptedTypes?.join(',')}
        disabled={!isPreview}
        style={{ display: 'none' }}
      />
    </div>
  );

  const renderSectionBreak = () => (
    <div style={{
      borderTop: '2px solid #E5E7EB',
      margin: '24px 0',
      position: 'relative'
    }}>
      {field.title && (
        <div style={{
          position: 'absolute',
          top: '-12px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#FFFFFF',
          padding: '0 16px',
          fontSize: '14px',
          fontWeight: '500',
          color: '#6B7280'
        }}>
          {field.title}
        </div>
      )}
    </div>
  );

  const renderStatement = () => (
    <div style={{
      padding: '16px',
      backgroundColor: '#F9FAFB',
      borderRadius: '6px',
      border: '1px solid #E5E7EB'
    }}>
      <div style={{
        fontSize: '14px',
        color: '#374151',
        lineHeight: '1.5'
      }}>
        {field.title}
      </div>
    </div>
  );

  const renderField = () => {
    switch (field.type) {
      case 'short_text':
      case 'email':
      case 'number':
      case 'phone':
      case 'url':
        return renderTextField();
      case 'long_text':
        return renderTextField();
      case 'single_choice':
      case 'multiple_choice':
      case 'dropdown':
      case 'yes_no':
        return renderChoiceField();
      case 'rating':
      case 'scale':
        return renderRatingField();
      case 'date':
      case 'time':
      case 'datetime':
        return renderDateField();
      case 'file_upload':
        return renderFileUpload();
      case 'section_break':
        return renderSectionBreak();
      case 'statement':
        return renderStatement();
      default:
        return (
          <div style={{
            padding: '20px',
            backgroundColor: '#F3F4F6',
            borderRadius: '6px',
            border: '1px dashed #D1D5DB',
            textAlign: 'center',
            color: '#6B7280'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🚧</div>
            <div style={{ fontSize: '14px' }}>
              Field type "{field.type}" is not implemented yet
            </div>
          </div>
        );
    }
  };

  // Don't render label for section breaks and statements
  const showLabel = !['section_break', 'statement'].includes(field.type);

  return (
    <div style={{ width: '100%' }}>
      {showLabel && renderFieldLabel()}
      {renderField()}
      {field.properties.helpText && (
        <div style={{
          fontSize: '12px',
          color: '#6B7280',
          marginTop: '4px',
          lineHeight: '1.4'
        }}>
          {field.properties.helpText}
        </div>
      )}
    </div>
  );
};

export default FieldRenderer; 