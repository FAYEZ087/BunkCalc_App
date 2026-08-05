import React from 'react';

interface SkeletonLoaderProps {
  height?: string;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  height = 'h-32',
  className = ''
}) => {
  return (
    <div
      className={`w-full ${height} bg-slate-200 dark:bg-slate-800/60 rounded-3xl animate-pulse ${className}`}
    />
  );
};

export default SkeletonLoader;
