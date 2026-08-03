'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import DopamineFund from '../../components/DopamineFund';
import ExpenseModal from '../../components/ExpenseModal';

export interface ExpenseRecord {
  id: string;
  amount: number;
  description: string;
  date: string;
}

export default function FinancesPage() {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([
    { id: '1', amount: 450, description: 'Book: Deep Work', date: '2026-08-01' },
    { id: '2', amount: 750, description: 'Lofi Music Subscription', date: '2026-08-02' },
  ]);

  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const handleAddExpense = (amount: number, description: string) => {
    const newExpense: ExpenseRecord = {
      id: Date.now().toString(),
      amount,
      description,
      date: new Date().toISOString().split('T')[0],
    };
    setExpenses((prev) => [newExpense, ...prev]);
  };

  return (
    <main className="min-h-screen bg-audhd-dark-bg text-gray-100 p-4 sm:p-8 space-y-8 max-w-4xl mx-auto">
      {/* Top Header & Navigation */}
      <header className="space-y-4 border-b border-gray-800 pb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-pastel-sage tracking-tight">
              Finances &amp; Dopamine Fund
            </h1>
            <p className="text-sm text-muted-lavender-subtle mt-1 font-medium">
              Manage impulse spending with guilt-free boundaries &amp; 5-minute quick logs.
            </p>
          </div>

          <nav className="flex items-center gap-3" aria-label="Finances Navigation">
            <Link
              href="/"
              className="touch-target px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold border border-gray-700 min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              Dashboard
            </Link>
            <Link
              href="/assignments"
              className="touch-target px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold border border-gray-700 min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              Assignments
            </Link>
            <Link
              href="/finances"
              className="touch-target px-4 py-2 rounded-lg bg-pastel-sage text-gray-900 font-bold min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              Finances
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <section className="space-y-6" aria-label="Dopamine Fund Controls">
        <DopamineFund
          monthlyLimit={5000}
          currentSpent={totalSpent}
          onOpenExpenseModal={() => setIsModalOpen(true)}
        />

        {/* Expense Log List */}
        <div className="p-6 rounded-xl bg-warm-slate border border-warm-slate-subtle shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-muted-lavender">Recent Impulse Expenses</h2>
            <span className="text-xs text-gray-400 font-medium">
              Total Logged: {expenses.length}
            </span>
          </div>

          {expenses.length === 0 ? (
            <p className="text-sm text-gray-400">No expenses logged yet this month.</p>
          ) : (
            <div className="space-y-3">
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between p-3.5 rounded-lg bg-gray-900 border border-gray-800"
                >
                  <div>
                    <p className="font-semibold text-gray-200">{exp.description}</p>
                    <p className="text-xs text-gray-400">{exp.date}</p>
                  </div>
                  <span className="font-bold text-amber-400 text-base">
                    ₹{exp.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Expense Modal Component */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddExpense={handleAddExpense}
      />
    </main>
  );
}
