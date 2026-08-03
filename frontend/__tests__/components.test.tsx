import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '../app/page';
import AssignmentsPage from '../app/assignments/page';
import FinancesPage from '../app/finances/page';
import EventBlock from '../components/EventBlock';
import ChoreBlock from '../components/ChoreBlock';
import AssignmentDeconstructor from '../components/AssignmentDeconstructor';
import MealTracker from '../components/MealTracker';
import DopamineFund from '../components/DopamineFund';
import ExpenseModal from '../components/ExpenseModal';
import api from '../lib/api';

// Mock API functions for deterministic testing
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
    deconstructTask: jest.fn().mockResolvedValue({
      totalEstimatedHours: 4,
      chunks: [
        { stage: 'Context/Primary Research', durationMins: 30, completed: false },
        { stage: 'Context/Primary Research', durationMins: 30, completed: false },
        { stage: 'Secondary Requirements', durationMins: 30, completed: false },
        { stage: 'Secondary Requirements', durationMins: 30, completed: false },
        { stage: 'Execution', durationMins: 30, completed: false },
        { stage: 'Execution', durationMins: 30, completed: false },
        { stage: 'Polishing', durationMins: 30, completed: false },
        { stage: 'Polishing', durationMins: 30, completed: false },
      ],
    }),
    getEvents: jest.fn().mockResolvedValue([]),
    getChores: jest.fn().mockResolvedValue([]),
    getUser: jest.fn().mockResolvedValue({}),
  },
}));

describe('AuDHD MBA Life Tracker - Component & View Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. EventBlock Component & 2-Tap Attendance', () => {
    it('renders event details, badges, safe bunks, and piercesVoid', () => {
      render(
        <EventBlock
          eventId="evt-1"
          title="Macroeconomics"
          type="Lecture"
          startTime="11:00"
          endTime="12:30"
          courseRef="ECON-101"
          piercesVoid={true}
          safeBunks={3}
        />
      );

      expect(screen.getByText('Macroeconomics')).toBeInTheDocument();
      expect(screen.getByText('Lecture')).toBeInTheDocument();
      expect(screen.getByText('Course: ECON-101')).toBeInTheDocument();
      expect(screen.getByText('Pierces Void')).toBeInTheDocument();
      expect(screen.getByText('Safe bunks remaining: 3')).toBeInTheDocument();
      expect(screen.getByText('Time: 11:00 - 12:30')).toBeInTheDocument();
    });

    it('implements 2-tap attendance: Tap 1 selects, Tap 2 confirms & updates safe bunks', async () => {
      render(
        <EventBlock
          eventId="evt-1"
          title="Macroeconomics"
          type="Lecture"
          startTime="11:00"
          endTime="12:30"
          courseRef="ECON-101"
          safeBunks={3}
          totalClasses={20}
          attendedClasses={15}
        />
      );

      const attendedBtn = screen.getByRole('button', { name: /attended/i });
      const confirmBtn = screen.getByRole('button', { name: /confirm/i });

      // Confirm button is initially disabled
      expect(confirmBtn).toBeDisabled();

      // Tap 1: Select Attended
      fireEvent.click(attendedBtn);
      expect(confirmBtn).not.toBeDisabled();

      // Tap 2: Confirm
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(api.updateEventAttendance).toHaveBeenCalledWith('evt-1', 'Attended');
        expect(api.calculateSafeBunks).toHaveBeenCalled();
      });

      // Updated safe bunks returned from mock is 4
      expect(await screen.findByText('Safe bunks remaining: 4')).toBeInTheDocument();
    });

    it('ensures interactive buttons have touch-target class or >= 48px target size', () => {
      render(
        <EventBlock
          eventId="evt-1"
          title="Macroeconomics"
          type="Lecture"
          startTime="11:00"
          endTime="12:30"
        />
      );

      const attendedBtn = screen.getByRole('button', { name: /attended/i });
      const missedBtn = screen.getByRole('button', { name: /missed/i });
      const confirmBtn = screen.getByRole('button', { name: /confirm/i });

      expect(attendedBtn).toHaveClass('touch-target');
      expect(missedBtn).toHaveClass('touch-target');
      expect(confirmBtn).toHaveClass('touch-target');
    });
  });

  describe('2. ChoreBlock Component', () => {
    it('displays chore title, category, isDue status, and 15-min transition buffer badge', () => {
      render(
        <ChoreBlock
          id="chore-1"
          title="Do Laundry"
          category="Household"
          isDue={true}
          hasTransitionBuffer={true}
        />
      );

      expect(screen.getByText('Do Laundry')).toBeInTheDocument();
      expect(screen.getByText('Household')).toBeInTheDocument();
      expect(screen.getByText('Due Now')).toBeInTheDocument();
      expect(screen.getByText(/15m Transition Buffer/i)).toBeInTheDocument();
    });

    it('toggles completion and transition buffer with 48px touch target buttons', () => {
      const onToggle = jest.fn();
      render(
        <ChoreBlock
          id="chore-1"
          title="Do Laundry"
          category="Household"
          isDue={true}
          onToggleComplete={onToggle}
        />
      );

      const toggleBtn = screen.getByRole('button', { name: /complete chore/i });
      expect(toggleBtn).toHaveClass('touch-target');

      fireEvent.click(toggleBtn);
      expect(onToggle).toHaveBeenCalledWith('chore-1');
      expect(screen.getByText('Mark Incomplete')).toBeInTheDocument();
    });
  });

  describe('3. AssignmentDeconstructor Component', () => {
    it('renders input form defaulting to 4 hours with Deconstruct Assignment button', () => {
      render(<AssignmentDeconstructor />);

      const input = screen.getByLabelText(/total estimated hours/i) as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.value).toBe('4');

      const submitBtn = screen.getByRole('button', { name: /deconstruct assignment/i });
      expect(submitBtn).toBeInTheDocument();
      expect(submitBtn).toHaveClass('touch-target');
      expect(input).toHaveClass('touch-target');
    });

    it('calls api.deconstructTask and renders 30-min chunk cards across 4 stages', async () => {
      render(<AssignmentDeconstructor />);

      const submitBtn = screen.getByRole('button', { name: /deconstruct assignment/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(api.deconstructTask).toHaveBeenCalledWith(4);
      });

      expect(await screen.findByText('Context/Primary Research')).toBeInTheDocument();
      expect(screen.getByText('Secondary Requirements')).toBeInTheDocument();
      expect(screen.getByText('Execution')).toBeInTheDocument();
      expect(screen.getByText('Polishing')).toBeInTheDocument();
    });
  });

  describe('4. MealTracker Component', () => {
    it('renders 4 meal windows and progress counter (Target: 0/4 logged initially)', () => {
      render(<MealTracker />);

      expect(screen.getByText('Breakfast')).toBeInTheDocument();
      expect(screen.getByText('Lunch')).toBeInTheDocument();
      expect(screen.getByText('Snacks')).toBeInTheDocument();
      expect(screen.getByText('Dinner')).toBeInTheDocument();
      expect(screen.getByText('Target: 0/4 logged')).toBeInTheDocument();
    });

    it('toggles meal windows and updates progress counter to Target: 1/4 logged', () => {
      render(<MealTracker />);

      const logBreakfastBtn = screen.getAllByRole('button', { name: /log meal/i })[0];
      expect(logBreakfastBtn).toHaveClass('touch-target');

      fireEvent.click(logBreakfastBtn);

      expect(screen.getByText('Target: 1/4 logged')).toBeInTheDocument();
      expect(screen.getByText('✓ Logged')).toBeInTheDocument();
    });
  });

  describe('5. DopamineFund Component', () => {
    it('displays monthly limit ₹5,000, spent, remaining budget, and progress gauge', () => {
      render(
        <DopamineFund monthlyLimit={5000} currentSpent={1500} />
      );

      expect(screen.getByText('₹5,000')).toBeInTheDocument();
      expect(screen.getByText('₹1,500')).toBeInTheDocument();
      expect(screen.getByText('₹3,500')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders action button with touch-target class that triggers expense modal callback', () => {
      const onOpen = jest.fn();
      render(<DopamineFund onOpenExpenseModal={onOpen} />);

      const addBtn = screen.getByRole('button', { name: /\+ add expense/i });
      expect(addBtn).toHaveClass('touch-target');

      fireEvent.click(addBtn);
      expect(onOpen).toHaveBeenCalled();
    });
  });

  describe('6. ExpenseModal Component', () => {
    it('renders modal form with 48px touch targets when open', () => {
      const onClose = jest.fn();
      render(<ExpenseModal isOpen={true} onClose={onClose} />);

      expect(screen.getByText('Quick Expense Entry')).toBeInTheDocument();

      const amountInput = screen.getByLabelText(/amount/i);
      const descInput = screen.getByLabelText(/description/i);
      const saveBtn = screen.getByRole('button', { name: /save expense/i });
      const cancelBtn = screen.getByRole('button', { name: /cancel/i });

      expect(amountInput).toHaveClass('touch-target');
      expect(descInput).toHaveClass('touch-target');
      expect(saveBtn).toHaveClass('touch-target');
      expect(cancelBtn).toHaveClass('touch-target');
    });

    it('submits quick expense entry and triggers callback', () => {
      const onAdd = jest.fn();
      const onClose = jest.fn();
      render(<ExpenseModal isOpen={true} onClose={onClose} onAddExpense={onAdd} />);

      const amountInput = screen.getByLabelText(/amount/i);
      const descInput = screen.getByLabelText(/description/i);
      const saveBtn = screen.getByRole('button', { name: /save expense/i });

      fireEvent.change(amountInput, { target: { value: '350' } });
      fireEvent.change(descInput, { target: { value: 'Coffee & Snack' } });

      fireEvent.click(saveBtn);

      expect(onAdd).toHaveBeenCalledWith(350, 'Coffee & Snack');
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('7. App Router Views Rendering', () => {
    it('renders Home view (app/page.tsx)', () => {
      render(<Home />);
      expect(screen.getByText('AuDHD MBA Life Tracker')).toBeInTheDocument();
      expect(screen.getByText('Executive Function & Low-Friction Daily Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Strategic Management Lecture')).toBeInTheDocument();
      expect(screen.getByText('Meal Tracker')).toBeInTheDocument();
      expect(screen.getByText('Dopamine Fund')).toBeInTheDocument();
    });

    it('renders Assignments view (app/assignments/page.tsx)', () => {
      render(<AssignmentsPage />);
      expect(screen.getByText('Assignments & Task Focus')).toBeInTheDocument();
      expect(screen.getByText('Assignment Deconstructor')).toBeInTheDocument();
    });

    it('renders Finances view (app/finances/page.tsx)', () => {
      render(<FinancesPage />);
      expect(screen.getByText('Finances & Dopamine Fund')).toBeInTheDocument();
      expect(screen.getByText('Recent Impulse Expenses')).toBeInTheDocument();
    });
  });
});
