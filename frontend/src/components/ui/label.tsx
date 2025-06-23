import React from 'react';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  className?: string;
  children: React.ReactNode;
}

export const Label: React.FC<LabelProps> = ({ className = '', children, ...props }) => {
  const baseClasses = 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';
  
  return (
    <label 
      className={`${baseClasses} ${className}`}
      {...props}
    >
      {children}
    </label>
  );
}; 