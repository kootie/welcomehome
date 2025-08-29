import React from 'react';
import { CardProps } from '../../types';

const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  className = '',
  onClick,
  hoverable = false,
}) => {
  const baseClasses = 'bg-white rounded-xl shadow-soft border border-secondary-200 overflow-hidden';
  const hoverClasses = hoverable ? 'hover:shadow-medium hover:scale-[1.02] transition-all duration-200 cursor-pointer' : '';
  const classes = `${baseClasses} ${hoverClasses} ${className}`;

  return (
    <div className={classes} onClick={onClick}>
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-secondary-200">
          {title && (
            <h3 className="text-lg font-semibold text-secondary-900">{title}</h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-secondary-600">{subtitle}</p>
          )}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default Card;
