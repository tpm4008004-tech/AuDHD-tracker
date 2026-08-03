'use client';

import React, { useState } from 'react';

export interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExpense?: (amount: number, description: string) => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onAddExpense,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    if (!description.trim()) {
      setError('Please enter a description for the expense.');
      return;
    }

    if (onAddExpense) {
      onAddExpense(parsedAmount, description.trim());
    }

    setAmount('');
    setDescription('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md p-6 rounded-xl bg-warm-slate border border-warm-slate-subtle shadow-2xl space-y-6 text-gray-100 animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-700/50 pb-3">
          <div>
            <h2 className="text-xl font-bold text-pastel-sage">Quick Expense Entry</h2>
            <p className="text-xs text-muted-lavender-subtle">
              Log impulse/fun purchases under 5 minutes
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target text-gray-400 hover:text-white text-xl font-bold p-2 min-h-[48px] min-w-[48px]"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Amount Field */}
          <div className="space-y-2">
            <label htmlFor="expense-amount" className="block text-sm font-semibold text-gray-200">
              Amount (₹)
            </label>
            <input
              id="expense-amount"
              type="number"
              min="1"
              step="any"
              placeholder="e.g. 250"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="touch-target w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pastel-sage min-h-[48px] min-w-[48px]"
              required
            />
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <label htmlFor="expense-desc" className="block text-sm font-semibold text-gray-200">
              Description
            </label>
            <input
              id="expense-desc"
              type="text"
              placeholder="e.g. Lofi Vinyl / Iced Coffee"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="touch-target w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pastel-sage min-h-[48px] min-w-[48px]"
              required
            />
          </div>

          {error && <p className="text-xs text-red-400 font-semibold">{error}</p>}

          {/* Action Buttons (min-h/w 48px, touch-target) */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-700/50">
            <button
              type="button"
              onClick={onClose}
              className="touch-target px-5 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold border border-gray-700 min-h-[48px] min-w-[48px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="touch-target px-6 py-2.5 rounded-lg bg-pastel-sage text-gray-900 font-bold hover:bg-emerald-400 transition-colors shadow-md min-h-[48px] min-w-[48px]"
            >
              Save Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseModal;
