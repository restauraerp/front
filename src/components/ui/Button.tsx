import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'warning' | 'success';

const variantMap: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-neutral btn-outline',
  danger: 'btn-error',
  ghost: 'btn-ghost',
  warning: 'btn-warning',
  success: 'btn-success',
};

export const Button = ({ children, variant = 'primary', className = '', ...props }: any) => {
  const variantClass = variantMap[variant as ButtonVariant] ?? 'btn-primary';
  return (
    <button className={`btn btn-sm ${variantClass} ${className}`} {...props}>
      {children}
    </button>
  );
};