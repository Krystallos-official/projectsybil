import React from 'react';
export function Card({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`bg-elevated border border-border rounded-lg p-4 ${className}`} {...props}>
      {children}
    </div>
  );
}
