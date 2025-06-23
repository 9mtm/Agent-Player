import React from 'react';

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

interface CardTitleProps {
  className?: string;
  children: React.ReactNode;
}

interface CardDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

interface CardContentProps {
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ className = '', children }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md border ${className}`}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardHeaderProps> = ({ className = '', children }) => {
  return (
    <div className={`p-6 pb-4 ${className}`}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<CardTitleProps> = ({ className = '', children }) => {
  return (
    <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<CardDescriptionProps> = ({ className = '', children }) => {
  return (
    <p className={`text-sm text-gray-600 mt-1.5 ${className}`}>
      {children}
    </p>
  );
};

export const CardContent: React.FC<CardContentProps> = ({ className = '', children }) => {
  return (
    <div className={`p-6 pt-0 ${className}`}>
      {children}
    </div>
  );
}; 