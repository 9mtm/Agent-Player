import React, { useState } from 'react';
import { FIELD_TYPES, FIELD_CATEGORIES } from '../utils/constants';
import { FieldType } from '../types';

interface FieldPaletteProps {
  onFieldDragStart: (fieldType: FieldType) => void;
  onFieldDragEnd: () => void;
}

const FieldPalette: React.FC<FieldPaletteProps> = ({ onFieldDragStart, onFieldDragEnd }) => {
  const [activeCategory, setActiveCategory] = useState<string>('text');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    { id: 'text', name: 'Text Fields', icon: '📝' },
    { id: 'choice', name: 'Choice Fields', icon: '☑️' },
    { id: 'media', name: 'Media Fields', icon: '🖼️' },
    { id: 'advanced', name: 'Advanced Fields', icon: '⚙️' }
  ];

  const filteredFields = Object.values(FIELD_TYPES).filter(field => {
    const matchesCategory = field.category === activeCategory;
    const matchesSearch = field.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleDragStart = (e: React.DragEvent, fieldType: FieldType) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: fieldType.id, isNew: true }));
    e.dataTransfer.effectAllowed = 'copy';
    onFieldDragStart(fieldType);
  };

  const handleDragEnd = () => {
    onFieldDragEnd();
  };

  return (
    <div style={{ 
      width: '280px', 
      height: '100%', 
      backgroundColor: '#FFFFFF',
      borderRight: '1px solid #E5E7EB',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '16px', 
        borderBottom: '1px solid #E5E7EB',
        backgroundColor: '#F9FAFB'
      }}>
        <h3 style={{ 
          margin: 0,
          fontSize: '16px',
          fontWeight: '600',
          color: '#1F2937'
        }}>
          Field Library
        </h3>
        <p style={{ 
          margin: '4px 0 0 0',
          fontSize: '12px',
          color: '#6B7280'
        }}>
          Drag fields to your form
        </p>
      </div>

      {/* Search */}
      <div style={{ padding: '16px' }}>
        <input
          type="text"
          placeholder="Search fields..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Categories */}
      <div style={{ 
        padding: '0 16px 16px 16px',
        borderBottom: '1px solid #E5E7EB'
      }}>
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px'
        }}>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              style={{
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                backgroundColor: activeCategory === category.id ? '#4F46E5' : '#FFFFFF',
                color: activeCategory === category.id ? '#FFFFFF' : '#374151',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>{category.icon}</span>
              <span style={{ fontSize: '11px' }}>{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Fields List */}
      <div style={{ 
        flex: 1,
        padding: '16px',
        overflowY: 'auto'
      }}>
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {filteredFields.map(fieldType => (
            <div
              key={fieldType.id}
              draggable
              onDragStart={(e) => handleDragStart(e, fieldType)}
              onDragEnd={handleDragEnd}
              style={{
                padding: '12px',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                cursor: 'grab',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
                e.currentTarget.style.borderColor = '#4F46E5';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.cursor = 'grabbing';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.cursor = 'grab';
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#F3F4F6',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px'
              }}>
                {fieldType.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#1F2937',
                  marginBottom: '2px'
                }}>
                  {fieldType.name}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  lineHeight: '1.3'
                }}>
                  {fieldType.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        padding: '16px',
        borderTop: '1px solid #E5E7EB',
        backgroundColor: '#F9FAFB'
      }}>
        <div style={{
          fontSize: '12px',
          color: '#6B7280',
          textAlign: 'center'
        }}>
          {filteredFields.length} fields available
        </div>
      </div>
    </div>
  );
};

export default FieldPalette; 