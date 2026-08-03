'use client';

import React, { useState, useEffect } from 'react';
import { useVoid } from './VoidContext';

export const VoidController: React.FC = () => {
  const { isVoidActive, voidEndTime, toggleVoid } = useVoid();
  const [remainingText, setRemainingText] = useState<string>('');

  // Countdown timer display
  useEffect(() => {
    if (!isVoidActive || !voidEndTime) {
      setRemainingText('');
      return;
    }

    const tick = () => {
      const diff = voidEndTime.getTime() - Date.now();
      if (diff <= 0) {
        setRemainingText('Exiting...');
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemainingText(`${mins}m ${secs}s remaining`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isVoidActive, voidEndTime]);

  return (
    <div
      className={`p-6 rounded-2xl border-2 transition-all duration-500 ${
        isVoidActive
          ? 'bg-purple-950/60 border-muted-lavender shadow-lg shadow-purple-900/30'
          : 'bg-warm-slate border-warm-slate-subtle'
      }`}
    >
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Status Header */}
        <div>
          <h2 className="text-lg font-bold text-muted-lavender">
            {isVoidActive ? '🌙 The Void is Active' : '🌀 Enter the Void'}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {isVoidActive
              ? 'Soft notifications muted. Hard deadlines & classes still pierce through.'
              : '2-hour chill quota. Mutes soft chore nudges. Classes still alert you.'}
          </p>
        </div>

        {/* Countdown */}
        {isVoidActive && remainingText && (
          <span className="text-sm font-mono text-muted-lavender-subtle">
            {remainingText}
          </span>
        )}

        {/* The Big Button */}
        <button
          type="button"
          onClick={toggleVoid}
          aria-label={isVoidActive ? 'Exit the Void' : 'Enter the Void'}
          className={`touch-target w-full max-w-xs px-8 py-4 rounded-xl text-lg font-bold transition-all duration-300 min-h-[48px] min-w-[48px] ${
            isVoidActive
              ? 'bg-muted-lavender text-gray-900 hover:bg-purple-300 ring-2 ring-purple-400 shadow-xl'
              : 'bg-gray-800 text-muted-lavender hover:bg-gray-700 border-2 border-muted-lavender/30 hover:border-muted-lavender/60'
          }`}
        >
          {isVoidActive ? 'Exit the Void' : 'Enter the Void'}
        </button>
      </div>
    </div>
  );
};

export default VoidController;
