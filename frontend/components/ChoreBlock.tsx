'use client';

import React, { useState } from 'react';

export interface ChoreBlockProps {
  id?: string;
  title: string;
  category: string;
  isDue: boolean;
  hasTransitionBuffer?: boolean;
  completed?: boolean;
  onToggleComplete?: (id?: string) => void;
  onStartBuffer?: (id?: string) => void;
}

export const ChoreBlock: React.FC<ChoreBlockProps> = ({
  id,
  title,
  category,
  isDue,
  hasTransitionBuffer = true,
  completed: initialCompleted = false,
  onToggleComplete,
  onStartBuffer,
}) => {
  const [completed, setCompleted] = useState<boolean>(initialCompleted);
  const [bufferActive, setBufferActive] = useState<boolean>(false);

  const handleToggle = () => {
    const nextState = !completed;
    setCompleted(nextState);
    if (onToggleComplete) {
      onToggleComplete(id);
    }
  };

  const handleBuffer = () => {
    setBufferActive(!bufferActive);
    if (onStartBuffer) {
      onStartBuffer(id);
    }
  };

  return (
    <div
      className={`p-5 rounded-xl bg-warm-slate border transition-all ${
        completed ? 'border-emerald-800/40 opacity-75' : 'border-warm-slate-subtle'
      } space-y-4 text-gray-100 shadow-md`}
    >
      {/* Chore Title, Category, and Status */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-lavender">
            {category}
          </span>
          <h3
            className={`text-lg font-bold ${
              completed ? 'line-through text-gray-400' : 'text-gray-100'
            }`}
          >
            {title}
          </h3>
        </div>

        <div className="flex flex-col items-end gap-2">
          {/* Due Status Badge */}
          {isDue && !completed ? (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-900/50 border border-amber-500 text-amber-300">
              Due Now
            </span>
          ) : (
            <span
              className={`px-3 py-1 text-xs font-semibold rounded-full ${
                completed
                  ? 'bg-emerald-900/40 border border-emerald-500 text-emerald-300'
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
            >
              {completed ? 'Completed' : 'Upcoming'}
            </span>
          )}

          {/* 15-Minute Transition Buffer Visual Badge */}
          {hasTransitionBuffer && (
            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-purple-900/40 border border-purple-400 text-purple-200">
              ⏱ 15m Transition Buffer
            </span>
          )}
        </div>
      </div>

      {/* Interactive Action Buttons (min-height/width 48px, touch-target class) */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-700/50">
        <button
          type="button"
          onClick={handleToggle}
          className={`touch-target px-5 py-2 rounded-lg font-semibold transition-all ${
            completed
              ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
              : 'bg-pastel-sage text-gray-900 hover:bg-emerald-400 font-bold'
          }`}
        >
          {completed ? 'Mark Incomplete' : 'Complete Chore'}
        </button>

        {hasTransitionBuffer && (
          <button
            type="button"
            onClick={handleBuffer}
            className={`touch-target px-4 py-2 rounded-lg font-medium transition-all ${
              bufferActive
                ? 'bg-purple-600 text-white font-bold ring-2 ring-purple-300'
                : 'bg-gray-800 hover:bg-gray-700 text-purple-300 border border-purple-500/30'
            }`}
          >
            {bufferActive ? 'Buffer Active (15m)' : 'Start 15m Buffer'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ChoreBlock;
