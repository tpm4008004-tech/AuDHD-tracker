import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EventBlock from '../components/EventBlock';
import api from '../lib/api';

jest.mock('../lib/api', () => ({
  __esModule: true,
  default: {
    updateEventAttendance: jest.fn().mockResolvedValue({ success: true }),
    calculateSafeBunks: jest.fn().mockResolvedValue({
      courseRef: 'MBA-STRAT-501',
      totalClasses: 20,
      attendedClasses: 16,
      currentAttendancePct: 80,
      targetAttendancePct: 75,
      safeBunks: 4,
      bunkDeficit: 0,
      statusMessage: 'You can safely miss 4 more class(es).',
    }),
  },
}));

describe('AttendanceUI 2-Tap Interaction & Safe Bunk Counter Test Suite', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('initially displays initial safe bunks count and disables confirm button', () => {
    render(
      <EventBlock
        eventId="evt-101"
        title="Financial Accounting"
        type="Lecture"
        startTime="09:00"
        endTime="10:30"
        courseRef="ACCT-501"
        safeBunks={2}
      />
    );

    expect(screen.getByText('Safe bunks remaining: 2')).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: /confirm/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('completes 2-tap workflow: selects Missed on tap 1, confirms on tap 2, and updates safe bunks', async () => {
    render(
      <EventBlock
        eventId="evt-101"
        title="Financial Accounting"
        type="Lecture"
        startTime="09:00"
        endTime="10:30"
        courseRef="ACCT-501"
        safeBunks={2}
        totalClasses={20}
        attendedClasses={15}
      />
    );

    const missedBtn = screen.getByRole('button', { name: /missed/i });
    const confirmBtn = screen.getByRole('button', { name: /confirm/i });

    // Tap 1: Select Missed
    fireEvent.click(missedBtn);
    expect(confirmBtn).not.toBeDisabled();

    // Tap 2: Confirm
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.updateEventAttendance).toHaveBeenCalledWith('evt-101', 'Missed');
      expect(api.calculateSafeBunks).toHaveBeenCalled();
    });

    // Updated safe bunks remaining is rendered
    expect(await screen.findByText('Safe bunks remaining: 4')).toBeInTheDocument();
  });

  it('verifies touch target accessibility on all attendance buttons', () => {
    render(
      <EventBlock
        eventId="evt-101"
        title="Financial Accounting"
        type="Lecture"
        startTime="09:00"
        endTime="10:30"
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).toHaveClass('touch-target');
    });
  });
});
