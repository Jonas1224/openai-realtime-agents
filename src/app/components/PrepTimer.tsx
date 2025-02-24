"use client";

import React, { useEffect, useState } from 'react';

interface PrepTimerProps {
  isActive: boolean;
}

export default function PrepTimer({ isActive }: PrepTimerProps) {
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    if (!isActive) {
      setTimeLeft(60);
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="fixed bottom-20 right-4 bg-white rounded-lg shadow-lg p-4 z-50 min-w-[200px]">
      <div className="text-center mb-2 font-semibold text-gray-700">Preparation Time</div>
      <div className="text-3xl font-bold text-center text-blue-600">{timeLeft}s</div>
      <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
        <div 
          className="bg-blue-600 h-3 rounded-full transition-all duration-1000"
          style={{ width: `${(timeLeft / 60) * 100}%` }}
        />
      </div>
    </div>
  );
} 