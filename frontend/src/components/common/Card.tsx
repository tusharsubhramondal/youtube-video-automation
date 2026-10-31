import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  onClick,
  hoverable = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm transition-all',
        hoverable && 'hover:border-slate-700 hover:shadow-md cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
};

