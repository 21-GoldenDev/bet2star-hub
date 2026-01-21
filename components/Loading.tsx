import React from 'react';

export const Loading: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen dark:bg-gray-900 bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-transparent dark:border-t-yellow-400 dark:border-r-yellow-400 border-t-blue-400 border-r-blue-400 rounded-full animate-spin"></div>
          <div className="absolute inset-2 border-4 border-transparent dark:border-b-blue-400 border-b-yellow-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>
        <p className="text-black dark:text-white text-lg font-semibold">Loading...</p>
      </div>
    </div>
  );
};

export default Loading;
