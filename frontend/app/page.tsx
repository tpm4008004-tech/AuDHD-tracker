'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import EventBlock from '../components/EventBlock';
import ChoreBlock from '../components/ChoreBlock';
import MealTracker from '../components/MealTracker';
import DopamineFund from '../components/DopamineFund';
import ExpenseModal from '../components/ExpenseModal';
import VoidController from '../components/VoidController';
import AudioBufferPlayer from '../components/AudioBufferPlayer';
import { useVoid } from '../components/VoidContext';

export default function Home() {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [spentAmount, setSpentAmount] = useState<number>(1200);
  const [activeBufferId, setActiveBufferId] = useState<string | null>(null);
  const { isVoidActive } = useVoid();

  const handleAddExpense = (amount: number, _description: string) => {
    setSpentAmount((prev) => prev + amount);
  };

  const handleStartBuffer = (id?: string) => {
    if (id && activeBufferId === id) {
      setActiveBufferId(null); // Toggle off
    } else {
      setActiveBufferId(id || null);
    }
  };

  return (
    <main className="min-h-screen bg-audhd-dark-bg text-gray-100 p-4 sm:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Top Header & Navigation */}
      <header className="space-y-4 text-center sm:text-left border-b border-gray-800 pb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-pastel-sage tracking-tight">
              AuDHD MBA Life Tracker
            </h1>
            <p className="text-sm sm:text-base text-muted-lavender-subtle mt-1 font-medium">
              Executive Function &amp; Low-Friction Daily Dashboard
            </p>
          </div>

          <nav className="flex items-center gap-3" aria-label="Main Navigation">
            <Link
              href="/"
              className="touch-target px-4 py-2 rounded-lg bg-pastel-sage text-gray-900 font-bold min-h-[48px] min-w-[48px] flex items-center justify-center"
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
              className="touch-target px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold border border-gray-700 min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              Finances
            </Link>
          </nav>
        </div>
      </header>

      {/* The Void Controller — Prominent Position */}
      <VoidController />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Academic Events & Chores */}
        <section className="space-y-6" aria-labelledby="events-section">
          <h2 id="events-section" className="text-2xl font-bold text-muted-lavender">
            Academic Schedule &amp; Bunk Counter
          </h2>

          {/* piercesVoid events stay fully visible even during Void */}
          <EventBlock
            eventId="evt-mba-101"
            title="Strategic Management Lecture"
            type="Lecture"
            startTime="09:00"
            endTime="10:30"
            courseRef="MBA-STRAT-501"
            piercesVoid={true}
            safeBunks={3}
            totalClasses={20}
            attendedClasses={15}
            targetPct={0.75}
          />

          {/* Chores Section — Dimmed during Void */}
          <div
            className={`space-y-4 transition-opacity duration-500 ${
              isVoidActive ? 'opacity-40 pointer-events-none' : 'opacity-100'
            }`}
            data-testid="chore-section"
          >
            <h2 className="text-2xl font-bold text-muted-lavender pt-4">Daily Chores &amp; Buffer</h2>

            {/* Audio Buffer Player — Active when any chore buffer is running */}
            <AudioBufferPlayer isActive={activeBufferId !== null} />

            <ChoreBlock
              id="chore-1"
              title="Read Organisational Behaviour Case Study"
              category="Academic Prep"
              isDue={true}
              hasTransitionBuffer={true}
              onStartBuffer={() => handleStartBuffer('chore-1')}
            />

            <ChoreBlock
              id="chore-2"
              title="Reset Desk &amp; Restock Water"
              category="Self-Care"
              isDue={false}
              hasTransitionBuffer={true}
              onStartBuffer={() => handleStartBuffer('chore-2')}
            />
          </div>
        </section>

        {/* Right Column: Meal Tracker & Dopamine Fund */}
        <section className="space-y-6" aria-labelledby="lifestyle-section">
          <h2 id="lifestyle-section" className="text-2xl font-bold text-muted-lavender">
            Nutrition &amp; Dopamine Fund
          </h2>

          <MealTracker />

          <DopamineFund
            monthlyLimit={5000}
            currentSpent={spentAmount}
            onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
          />
        </section>
      </div>

      {/* Expense Modal Component */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onAddExpense={handleAddExpense}
      />
    </main>
  );
}
