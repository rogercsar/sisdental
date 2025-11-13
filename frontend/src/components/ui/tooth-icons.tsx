import React from 'react';

interface ToothIconProps {
  className?: string;
  size?: number;
  color?: string;
}

export const ToothIcon: React.FC<ToothIconProps> = ({ 
  className = "", 
  size = 24, 
  color = "currentColor" 
}) => (
  <i 
    className={`lni lni-tooth ${className}`}
    style={{ 
      fontSize: size,
      color,
      display: 'inline-block',
      lineHeight: 1
    }}
  />
);

export const getToothIcon = (): React.FC<ToothIconProps> => {
  return ToothIcon;
};