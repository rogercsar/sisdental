import React from 'react';

interface EmptyStateProps {
  icon?: string;
  message: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon = 'fas fa-inbox', message }) => {
  return (
    <div className="text-center text-muted py-4">
      <div className="mb-2">
        <i className={`${icon} fa-2x`}></i>
      </div>
      <p className="mb-0">{message}</p>
    </div>
  );
};

export default EmptyState;