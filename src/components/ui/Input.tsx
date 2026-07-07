import React from 'react';

export const Input = ({ label, className = '', ...props }: any) => {
  return (
    <div className="form-control w-full" suppressHydrationWarning>
      {label && (
        <label className="label">
          <span className="label-text font-medium">{label}</span>
        </label>
      )}
      <input
        className={`input input-bordered w-full ${className}`}
        suppressHydrationWarning
        {...props}
      />
    </div>
  );
};