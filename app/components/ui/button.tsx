import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost';
  size?: 'default' | 'icon';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'default', 
  size = 'default', 
  className = '', 
  ...props 
}) => {
  const baseClasses = 'font-medium focus:outline-none';
  const variantClasses = {
    default: 'bg-blue-500 text-white hover:bg-blue-600',
    ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700',
  };
  const sizeClasses = {
    default: 'px-4 py-2 text-sm',
    icon: 'p-2',
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
};