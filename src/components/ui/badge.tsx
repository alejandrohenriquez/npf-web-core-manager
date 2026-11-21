import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'warning' | 'success';
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'default', children, ...props }) => {
  const variantStyles = {
    default: 'bg-indigo-600 text-white',
    secondary: 'bg-slate-100 text-slate-800',
    outline: 'border border-slate-300 text-slate-700',
    destructive: 'bg-red-500 text-white',
    warning: 'bg-amber-100 text-amber-800 border border-amber-300',
    success: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
  }[variant];

  return (
    <div
      className={twMerge(
        clsx(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
          variantStyles,
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
