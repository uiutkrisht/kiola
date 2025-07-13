'use client';

import { useEffect, useRef } from 'react';

type LoadingSpinnerProps = {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  label?: string;
};

export default function LoadingSpinner({ 
  size = 'md', 
  fullScreen = true,
  label = 'Loading...' 
}: LoadingSpinnerProps) {
  const spinnerRef = useRef<HTMLDivElement>(null);

  // Focus the spinner for screen readers when mounted
  useEffect(() => {
    if (spinnerRef.current) {
      spinnerRef.current.focus();
    }
  }, []);

  const sizeClasses = {
    sm: 'h-6 w-6 border-t-2 border-b-2',
    md: 'h-12 w-12 border-t-3 border-b-3',
    lg: 'h-16 w-16 border-t-4 border-b-4',
  };

  const containerClasses = fullScreen 
    ? 'fixed inset-0 flex flex-col items-center justify-center bg-white bg-opacity-90 z-50 p-4' 
    : 'flex flex-col items-center justify-center p-4';

  return (
    <div 
      className={containerClasses}
      role="status"
      aria-live="polite"
      aria-busy="true"
      tabIndex={-1}
      ref={spinnerRef}
    >
      <div 
        className={`animate-spin rounded-full border-blue-500 ${sizeClasses[size]}`}
        aria-hidden="true"
      >
        <span className="sr-only">{label}</span>
      </div>
      {label && (
        <p className="mt-4 text-sm text-gray-600 font-medium">
          {label}
        </p>
      )}
    </div>
  );
}
