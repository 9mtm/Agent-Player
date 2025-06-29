import React from 'react';
import { CustomField } from '../types';

interface FieldBuilderProps {
  fields: CustomField[];
  onFieldCreate: (field: Partial<CustomField>) => void;
}

export const FieldBuilder: React.FC<FieldBuilderProps> = ({ fields, onFieldCreate }) => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
           Field Builder Interface
        </h3>
        <p className="text-gray-600 mb-6">
          Drag & drop interface coming soon...
        </p>
        <div className="text-sm text-gray-500">
          Will support 20+ field types with real-time preview
        </div>
      </div>
    </div>
  );
};
