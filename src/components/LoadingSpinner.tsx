import React from 'react';

interface Props {
  text?: string;
}

export default function LoadingSpinner({ text = 'טוען נתונים...' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-12 min-h-[50vh] animate-fade-in">
      <div className="relative mb-8">
        {/* Outer spinning ring */}
        <div className="absolute -inset-4 border-[3px] border-slate-200 rounded-full"></div>
        <div className="absolute -inset-4 border-[3px] border-sky-500 border-t-transparent border-l-transparent rounded-full animate-spin" style={{ animationDuration: '1.5s' }}></div>
        
        {/* Inner pulsing logo */}
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center p-3 shadow-lg z-10 relative">
          <img 
            src="/tikshuv.png" 
            alt="טוען..." 
            className="w-full h-full object-contain animate-pulse-soft"
          />
        </div>
      </div>
      
      <span className="font-bold text-lg tracking-wide text-slate-600 bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent animate-pulse-soft">
        {text}
      </span>
    </div>
  );
}
