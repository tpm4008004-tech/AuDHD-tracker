'use client';

import React from 'react';
import Link from 'next/link';
import AssignmentDeconstructor from '../../components/AssignmentDeconstructor';

export default function AssignmentsPage() {
  return (
    <main className="min-h-screen bg-audhd-dark-bg text-gray-100 p-4 sm:p-8 space-y-8 max-w-4xl mx-auto">
      {/* Top Header & Navigation */}
      <header className="space-y-4 border-b border-gray-800 pb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-pastel-sage tracking-tight">
              Assignments &amp; Task Focus
            </h1>
            <p className="text-sm text-muted-lavender-subtle mt-1 font-medium">
              Deconstruct heavy MBA assignments into 30-minute low-friction work units.
            </p>
          </div>

          <nav className="flex items-center gap-3" aria-label="Assignments Navigation">
            <Link
              href="/"
              className="touch-target px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold border border-gray-700 min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              Dashboard
            </Link>
            <Link
              href="/assignments"
              className="touch-target px-4 py-2 rounded-lg bg-pastel-sage text-gray-900 font-bold min-h-[48px] min-w-[48px] flex items-center justify-center"
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

      {/* Assignment Deconstructor Component */}
      <section aria-label="Assignment Deconstruction Tool">
        <AssignmentDeconstructor />
      </section>
    </main>
  );
}
