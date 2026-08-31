import React from 'react';

// `tour` is the guided walkthrough's anchor. Optional and inert everywhere else:
// a card the tour never points at renders exactly as it did before.
export const Card = ({ children, title, className = '', style, tour }: any) => {
  return (
    <div data-tour={tour} className={`card bg-base-100 shadow-sm border border-base-200 ${className}`} style={style}>
      {title && (
        <div className="card-title px-6 pt-5 pb-0 text-base font-semibold text-base-content">
          {title}
        </div>
      )}
      <div className="card-body pt-4">
        {children}
      </div>
    </div>
  );
};