'use client';

import React from 'react';

export interface DopamineFundProps {
  monthlyLimit?: number;
  currentSpent?: number;
  onOpenExpenseModal?: () => void;
}

export const DopamineFund: React.FC<DopamineFundProps> = ({
  monthlyLimit = 5000,
  currentSpent = 1200,
  onOpenExpenseModal,
}) => {
  const remaining = Math.max(0, monthlyLimit - currentSpent);
  const spentPct = Math.min(100, Math.max(0, (currentSpent / monthlyLimit) * 100));

  return (
    <div className="p-6 rounded-xl bg-warm-slate border border-warm-slate-subtle shadow-md text-gray-100 space-y-5">
      {/* Title & Action Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-pastel-sage">Dopamine Fund</h2>
          <p className="text-xs text-muted-lavender-subtle">
            Guilt-free impulse buffer &amp; monthly budget gauge
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenExpenseModal}
          className="touch-target px-5 py-2.5 rounded-lg bg-pastel-sage text-gray-900 font-bold hover:bg-emerald-400 transition-colors shadow-md min-h-[48px] min-w-[48px]"
        >
          + Add Expense
        </button>
      </div>

      {/* Numerical Stats */}
      <div className="grid grid-cols-3 gap-3 p-4 rounded-lg bg-gray-900 border border-gray-800 text-center">
        <div>
          <span className="block text-xs text-gray-400 uppercase">Monthly Limit</span>
          <span className="text-lg font-bold text-gray-100">₹{monthlyLimit.toLocaleString('en-IN')}</span>
        </div>
        <div>
          <span className="block text-xs text-gray-400 uppercase">Current Spent</span>
          <span className="text-lg font-bold text-amber-400">₹{currentSpent.toLocaleString('en-IN')}</span>
        </div>
        <div>
          <span className="block text-xs text-gray-400 uppercase">Remaining</span>
          <span className="text-lg font-bold text-emerald-400">₹{remaining.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Visual Gauge / Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-lavender font-medium">
          <span>Budget Utilized ({spentPct.toFixed(0)}%)</span>
          <span>₹{remaining.toLocaleString('en-IN')} left</span>
        </div>

        <div className="w-full h-4 rounded-full bg-gray-900 overflow-hidden border border-gray-800 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              spentPct > 90
                ? 'bg-red-500'
                : spentPct > 70
                ? 'bg-amber-400'
                : 'bg-pastel-sage'
            }`}
            style={{ width: `${spentPct}%` }}
            role="progressbar"
            aria-valuenow={currentSpent}
            aria-valuemin={0}
            aria-valuemax={monthlyLimit}
          />
        </div>
      </div>
    </div>
  );
};

export default DopamineFund;
