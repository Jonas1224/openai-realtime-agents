import React, { useState, useEffect } from 'react';

interface TimerProps {
  isSessionActive: boolean;
}

export default function Timer({ isSessionActive }: TimerProps) {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (isSessionActive && !isRunning) {
      setIsRunning(true);
    } else if (!isSessionActive) {
      setIsRunning(false);
      setTime(0);
    }
  }, [isSessionActive]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isRunning) {
      intervalId = setInterval(() => {
        setTime((prevTime) => prevTime + 1);
      }, 1000);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRunning]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg shadow-sm border border-gray-200">
      <span className="text-base font-medium text-gray-700">{formatTime(time)}</span>
      <button
        onClick={toggleTimer}
        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        disabled={!isSessionActive}
      >
        {isRunning ? (
          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <rect x="6" y="4" width="4" height="16" fill="currentColor" />
            <rect x="14" y="4" width="4" height="16" fill="currentColor" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          </svg>
        )}
      </button>
    </div>
  );
} 