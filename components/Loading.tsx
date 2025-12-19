import React from 'react';

export const Loading: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-transparent border-t-yellow-400 border-r-yellow-400 rounded-full animate-spin"></div>
          <div className="absolute inset-2 border-4 border-transparent border-b-blue-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>
        <p className="text-white text-lg font-semibold">Loading...</p>
      </div>
    </div>
  );
};

export default Loading;
