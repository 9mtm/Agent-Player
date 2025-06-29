import React from 'react';
import { FieldType } from '../types';

interface FieldLibraryProps {
  onFieldSelect: (fieldType: FieldType) => void;
}

export const FieldLibrary: React.FC<FieldLibraryProps> = ({ onFieldSelect }) => {
  const fieldTypes = [
    { type: 'text', icon: '', name: 'Text Input' },
    { type: 'textarea', icon: '', name: 'Textarea' },
    { type: 'select', icon: '', name: 'Select Dropdown' },
    { type: 'checkbox', icon: '', name: 'Checkbox' },
    { type: 'file', icon: '', name: 'File Upload' },
    { type: 'date', icon: '', name: 'Date Picker' },
    { type: 'color', icon: '', name: 'Color Picker' },
    { type: 'rating', icon: '', name: 'Rating' }
  ];

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
         Field Library - 20+ Types Available
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {fieldTypes.map((field) => (
          <div 
            key={field.type}
            className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-400 cursor-pointer transition-all"
            onClick={() => onFieldSelect(field.type as FieldType)}
          >
            <div className="text-2xl mb-2">{field.icon}</div>
            <div className="font-medium text-sm">{field.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
