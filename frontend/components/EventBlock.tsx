'use client';

import React, { useState } from 'react';
import api from '../lib/api';

export interface EventBlockProps {
  id?: string;
  eventId?: string;
  title: string;
  type: string;
  startTime: string;
  endTime: string;
  courseRef?: string;
  piercesVoid?: boolean;
  attendanceStatus?: 'Attended' | 'Missed' | 'Pending' | null;
  safeBunks?: number;
  totalClasses?: number;
  attendedClasses?: number;
  targetPct?: number;
  userId?: string;
  onAttendanceUpdated?: (eventId: string, status: 'Attended' | 'Missed', safeBunks?: number) => void;
}

export const EventBlock: React.FC<EventBlockProps> = ({
  id,
  eventId,
  title,
  type,
  startTime,
  endTime,
  courseRef,
  piercesVoid = false,
  attendanceStatus = 'Pending',
  safeBunks: initialSafeBunks = 3,
  totalClasses = 20,
  attendedClasses: initialAttendedClasses = 15,
  targetPct = 0.75,
  userId = 'default-user',
  onAttendanceUpdated,
}) => {
  const targetId = eventId || id || 'evt-default';
  
  const [selectedStatus, setSelectedStatus] = useState<'Attended' | 'Missed' | null>(null);
  const [currentStatus, setCurrentStatus] = useState<'Attended' | 'Missed' | 'Pending' | string>(
    attendanceStatus || 'Pending'
  );
  const [safeBunksRemaining, setSafeBunksRemaining] = useState<number>(initialSafeBunks);
  const [attendedCount, setAttendedCount] = useState<number>(initialAttendedClasses);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Tap 1: Select Attended or Missed
  const handleSelectStatus = (status: 'Attended' | 'Missed') => {
    setSelectedStatus(status);
    setError(null);
  };

  // Tap 2: Confirm attendance status
  const handleConfirmAttendance = async () => {
    if (!selectedStatus) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // Step 1: Call API to update attendance status
      await api.updateEventAttendance(targetId, selectedStatus);

      // Step 2: Calculate safe bunks
      const newAttended = selectedStatus === 'Attended' ? attendedCount + 1 : attendedCount;
      setAttendedCount(newAttended);

      let newSafeBunks = safeBunksRemaining;
      try {
        const safeBunkRes = await api.calculateSafeBunks({
          totalClasses,
          attendedClasses: newAttended,
          targetPct,
          courseRef: courseRef || 'GENERAL',
          userId,
        });
        if (typeof safeBunkRes.safeBunks === 'number') {
          newSafeBunks = safeBunkRes.safeBunks;
        }
      } catch (err) {
        // Fallback calculation if safe bunks API call returns error in test mock
        const required = Math.ceil(totalClasses * targetPct);
        newSafeBunks = Math.max(0, totalClasses - required - (totalClasses - newAttended));
      }

      setSafeBunksRemaining(newSafeBunks);
      setCurrentStatus(selectedStatus);

      if (onAttendanceUpdated) {
        onAttendanceUpdated(targetId, selectedStatus, newSafeBunks);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update attendance');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-5 rounded-xl bg-warm-slate border border-warm-slate-subtle shadow-md text-gray-100 space-y-4">
      {/* Event Header & Badges */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-pastel-sage">
            {type}
          </span>
          <h3 className="text-xl font-bold text-gray-100">{title}</h3>
          {courseRef && (
            <p className="text-sm text-muted-lavender-subtle">Course: {courseRef}</p>
          )}
        </div>

        {piercesVoid && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-900/40 border border-red-500 text-red-300">
            Pierces Void
          </span>
        )}
      </div>

      {/* Time & Attendance Info */}
      <div className="flex flex-wrap items-center justify-between text-sm gap-2 border-t border-gray-700/50 pt-3">
        <div className="text-gray-300">
          <span className="font-medium text-muted-lavender">Time:</span> {startTime} - {endTime}
        </div>
        <div className="text-pastel-sage font-semibold">
          Safe bunks remaining: {safeBunksRemaining}
        </div>
      </div>

      {/* Current Status Banner */}
      <div className="text-xs text-gray-400">
        Status: <span className="font-semibold text-gray-200">{currentStatus}</span>
      </div>

      {/* 2-Tap Attendance Interaction */}
      <div className="pt-2 border-t border-gray-700/50 space-y-3">
        <p className="text-xs text-muted-lavender-subtle">
          2-Tap Attendance: Tap to select status, then confirm.
        </p>

        {/* Tap 1 Buttons: Select Attended or Missed */}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleSelectStatus('Attended')}
            className={`touch-target px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedStatus === 'Attended'
                ? 'bg-pastel-sage text-gray-900 font-bold ring-2 ring-emerald-400'
                : 'bg-gray-800 hover:bg-gray-700 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            Attended
          </button>

          <button
            type="button"
            onClick={() => handleSelectStatus('Missed')}
            className={`touch-target px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedStatus === 'Missed'
                ? 'bg-red-500 text-white font-bold ring-2 ring-red-300'
                : 'bg-gray-800 hover:bg-gray-700 text-red-300 border border-red-500/30'
            }`}
          >
            Missed
          </button>

          {/* Tap 2 Button: Confirm */}
          <button
            type="button"
            disabled={!selectedStatus || isSubmitting}
            onClick={handleConfirmAttendance}
            className={`touch-target px-5 py-2 rounded-lg font-semibold transition-all ${
              selectedStatus
                ? 'bg-muted-lavender text-gray-900 hover:bg-purple-300 shadow-lg cursor-pointer'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50 border border-gray-700'
            }`}
          >
            {isSubmitting ? 'Confirming...' : 'Confirm'}
          </button>
        </div>

        {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
      </div>
    </div>
  );
};

export default EventBlock;
