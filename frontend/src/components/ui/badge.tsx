import React from 'react';

interface BadgeProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  children: React.ReactNode;
}

const badgeVariants = {
  default: 'bg-blue-100 text-blue-800 border-blue-200',
  secondary: 'bg-gray-100 text-gray-800 border-gray-200',
  destructive: 'bg-red-100 text-red-800 border-red-200',
  outline: 'bg-transparent text-gray-700 border-gray-300',
  success: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200'
};

const badgeSizes = {
  default: 'px-2.5 py-0.5 text-xs',
  sm: 'px-2 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm'
};

export const Badge: React.FC<BadgeProps> = ({ 
  variant = 'default', 
  size = 'default', 
  className = '', 
  children 
}) => {
  const baseClasses = 'inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';
  
  const variantClasses = badgeVariants[variant];
  const sizeClasses = badgeSizes[size];
  
  return (
    <span className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}>
      {children}
    </span>
  );
}; 