import React from 'react';

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader = ({ title, subtitle, actions, className = 'mb-6' }: PageHeaderProps) => {
  return (
    <div className={`flex items-start justify-between gap-4 flex-wrap ${className}`}>
      <div>
        <h1 className="text-2xl font-bold text-base-content">{title}</h1>
        {subtitle && (
          <p className="text-sm text-base-content/60 mt-1">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 flex-wrap">{actions}</div>}
    </div>
  );
};
