'use client';

import React, { useState } from 'react';
import api from '../lib/api';

export interface ChunkItem {
  stage: string;
  durationMins: number;
  completed: boolean;
}

export const STAGES = [
  'Context/Primary Research',
  'Secondary Requirements',
  'Execution',
  'Polishing',
] as const;

export const AssignmentDeconstructor: React.FC = () => {
  const [estimatedHours, setEstimatedHours] = useState<number>(4);
  const [chunks, setChunks] = useState<ChunkItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fallback chunk generator if API call is offline or mock returns custom format
  const generateFallbackChunks = (hours: number): ChunkItem[] => {
    const total30MinChunks = Math.max(1, Math.round(hours * 2));
    const generated: ChunkItem[] = [];
    
    for (let i = 0; i < total30MinChunks; i++) {
      const stageIndex = Math.min(
        STAGES.length - 1,
        Math.floor((i / total30MinChunks) * STAGES.length)
      );
      generated.push({
        stage: STAGES[stageIndex],
        durationMins: 30,
        completed: false,
      });
    }
    return generated;
  };

  const handleDeconstruct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const hoursToProcess = Math.max(0.5, Number(estimatedHours) || 4);

    try {
      const response = await api.deconstructTask(hoursToProcess);
      if (response && Array.isArray(response.chunks) && response.chunks.length > 0) {
        setChunks(response.chunks);
      } else {
        setChunks(generateFallbackChunks(hoursToProcess));
      }
    } catch (err: any) {
      // Offline / test fallback behavior
      setChunks(generateFallbackChunks(hoursToProcess));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChunkComplete = (index: number) => {
    setChunks((prev) =>
      prev.map((chunk, i) => (i === index ? { ...chunk, completed: !chunk.completed } : chunk))
    );
  };

  return (
    <div className="p-6 rounded-xl bg-warm-slate border border-warm-slate-subtle shadow-lg text-gray-100 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-pastel-sage">Assignment Deconstructor</h2>
        <p className="text-sm text-muted-lavender-subtle mt-1">
          Break large assignments into low-friction 30-minute focus chunks across 4 key stages.
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleDeconstruct} className="flex flex-col sm:flex-row items-end gap-4">
        <div className="flex-1 w-full space-y-2">
          <label htmlFor="hours-input" className="block text-sm font-semibold text-gray-200">
            Total Estimated Hours:
          </label>
          <input
            id="hours-input"
            type="number"
            min="0.5"
            max="100"
            step="0.5"
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(parseFloat(e.target.value) || 0)}
            className="touch-target w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-pastel-sage min-h-[48px] min-w-[48px]"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="touch-target w-full sm:w-auto px-6 py-3 rounded-lg bg-pastel-sage text-gray-900 font-bold hover:bg-emerald-400 transition-colors shadow-md min-h-[48px] min-w-[48px] flex items-center justify-center"
        >
          {isLoading ? 'Deconstructing...' : 'Deconstruct Assignment'}
        </button>
      </form>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Rendered 30-Min Chunks Across 4 Stages */}
      {chunks.length > 0 && (
        <div className="space-y-6 pt-4 border-t border-gray-700/50">
          <h3 className="text-lg font-bold text-muted-lavender">
            Generated 30-Min Focus Chunks ({chunks.length} total)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {STAGES.map((stageName) => {
              const stageChunks = chunks.filter((c) => c.stage === stageName);
              if (stageChunks.length === 0) return null;

              return (
                <div
                  key={stageName}
                  className="p-4 rounded-lg bg-gray-900/60 border border-gray-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-pastel-sage">{stageName}</h4>
                    <span className="text-xs bg-gray-800 text-muted-lavender px-2 py-0.5 rounded">
                      {stageChunks.length} x 30m
                    </span>
                  </div>

                  <div className="space-y-2">
                    {chunks.map((chunk, idx) => {
                      if (chunk.stage !== stageName) return null;
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-3 rounded border transition-colors ${
                            chunk.completed
                              ? 'bg-emerald-950/30 border-emerald-800/40 text-gray-400'
                              : 'bg-warm-slate/80 border-gray-700 text-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => toggleChunkComplete(idx)}
                              className="touch-target w-7 h-7 rounded border border-pastel-sage flex items-center justify-center text-xs font-bold min-h-[48px] min-w-[48px]"
                              aria-label={`Toggle chunk ${idx + 1}`}
                            >
                              {chunk.completed ? '✓' : ''}
                            </button>
                            <span
                              className={`text-sm ${
                                chunk.completed ? 'line-through text-gray-500' : ''
                              }`}
                            >
                              Chunk #{idx + 1} ({chunk.durationMins} mins)
                            </span>
                          </div>

                          <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-300">
                            {chunk.completed ? 'Done' : '30 min'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentDeconstructor;
