import React from 'react';

interface AlertProps {
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  className?: string;
  children: React.ReactNode;
}

interface AlertDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

interface AlertTitleProps {
  className?: string;
  children: React.ReactNode;
}

const alertVariants = {
  default: 'bg-gray-50 border-gray-200 text-gray-800',
  destructive: 'bg-red-50 border-red-200 text-red-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800'
};

export const Alert: React.FC<AlertProps> = ({ 
  variant = 'default', 
  className = '', 
  children 
}) => {
  const baseClasses = 'relative w-full rounded-lg border p-4';
  const variantClasses = alertVariants[variant];
  
  return (
    <div className={`${baseClasses} ${variantClasses} ${className}`}>
      {children}
    </div>
  );
};

export const AlertTitle: React.FC<AlertTitleProps> = ({ className = '', children }) => {
  return (
    <h5 className={`mb-1 font-medium leading-none tracking-tight ${className}`}>
      {children}
    </h5>
  );
};

export const AlertDescription: React.FC<AlertDescriptionProps> = ({ className = '', children }) => {
  return (
    <div className={`text-sm [&_p]:leading-relaxed ${className}`}>
      {children}
    </div>
  );
}; 