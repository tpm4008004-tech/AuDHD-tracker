'use client';

import React, { useState } from 'react';

export interface MealWindow {
  id: string;
  name: string;
  timeWindow: string;
  logged: boolean;
}

export const INITIAL_MEAL_WINDOWS: MealWindow[] = [
  { id: 'breakfast', name: 'Breakfast', timeWindow: '08:00-10:00', logged: false },
  { id: 'lunch', name: 'Lunch', timeWindow: '13:00-15:00', logged: false },
  { id: 'snacks', name: 'Snacks', timeWindow: '18:00-19:00', logged: false },
  { id: 'dinner', name: 'Dinner', timeWindow: '20:00-22:30', logged: false },
];

export const MealTracker: React.FC = () => {
  const [meals, setMeals] = useState<MealWindow[]>(INITIAL_MEAL_WINDOWS);

  const toggleMealLogged = (id: string) => {
    setMeals((prev) =>
      prev.map((meal) => (meal.id === id ? { ...meal, logged: !meal.logged } : meal))
    );
  };

  const loggedCount = meals.filter((m) => m.logged).length;
  const totalCount = meals.length;

  return (
    <div className="p-6 rounded-xl bg-warm-slate border border-warm-slate-subtle shadow-md text-gray-100 space-y-4">
      {/* Header and Progress Counter */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-pastel-sage">Meal Tracker</h2>
          <p className="text-xs text-muted-lavender-subtle">
            Low-friction nutrition windows tracking
          </p>
        </div>

        <div className="px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm font-bold text-pastel-sage">
          Target: {loggedCount}/{totalCount} logged
        </div>
      </div>

      {/* Meal Windows Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        {meals.map((meal) => (
          <div
            key={meal.id}
            className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
              meal.logged
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                : 'bg-gray-900 border-gray-800 text-gray-200'
            }`}
          >
            <div>
              <h3 className="font-semibold text-base">{meal.name}</h3>
              <p className="text-xs text-muted-lavender-subtle">Window: {meal.timeWindow}</p>
            </div>

            {/* Toggle Button with min 48px touch target size */}
            <button
              type="button"
              onClick={() => toggleMealLogged(meal.id)}
              className={`touch-target px-4 py-2 rounded-lg font-bold transition-all min-h-[48px] min-w-[48px] ${
                meal.logged
                  ? 'bg-emerald-500 text-gray-950 hover:bg-emerald-400'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
              }`}
            >
              {meal.logged ? '✓ Logged' : 'Log Meal'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MealTracker;
