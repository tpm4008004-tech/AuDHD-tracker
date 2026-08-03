'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type View = 'dashboard' | 'assignments' | 'finances';
type AttendanceTap = null | 'Attended' | 'Missed';

interface EventData {
  id: string;
  title: string;
  time: string;
  courseRef: string;
  piercesVoid: boolean;
  safeBunks: number;
}

interface ChoreData {
  id: string;
  title: string;
  category: string;
}

interface Transaction {
  id: string;
  label: string;
  amount: number;
  date: string;
}

interface Chunk {
  id: string;
  stage: string;
  label: string;
  done: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// VOID CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

interface VoidCtx {
  isVoidMode: boolean;
  voidTimeLeft: number;
  activateVoid: () => void;
  deactivateVoid: () => void;
}

const VoidContext = createContext<VoidCtx>({
  isVoidMode: false,
  voidTimeLeft: 7200,
  activateVoid: () => {},
  deactivateVoid: () => {},
});

function VoidProvider({ children }: { children: React.ReactNode }) {
  const [isVoidMode, setIsVoidMode] = useState(false);
  const [voidTimeLeft, setVoidTimeLeft] = useState(7200);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activateVoid = useCallback(() => {
    setVoidTimeLeft(7200);
    setIsVoidMode(true);
  }, []);

  const deactivateVoid = useCallback(() => {
    setIsVoidMode(false);
    setVoidTimeLeft(7200);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (isVoidMode) {
      timerRef.current = setInterval(() => {
        setVoidTimeLeft((t) => {
          if (t <= 1) {
            setIsVoidMode(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return 7200;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isVoidMode]);

  return (
    <VoidContext.Provider value={{ isVoidMode, voidTimeLeft, activateVoid, deactivateVoid }}>
      {children}
    </VoidContext.Provider>
  );
}

function useVoid() {
  return useContext(VoidContext);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// VOID CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────

function VoidController() {
  const { isVoidMode, voidTimeLeft, activateVoid, deactivateVoid } = useVoid();

  return (
    <div
      className={`rounded-2xl p-5 transition-all duration-500 ${
        isVoidMode
          ? 'bg-indigo-950/70 border-2 border-indigo-400 shadow-[0_0_24px_rgba(99,102,241,0.45)]'
          : 'bg-slate-900 border border-slate-700'
      }`}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-slate-100">
            {isVoidMode ? '🌙 Void Mode Active' : '🌀 The Void'}
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {isVoidMode
              ? `Chores muted · Hard deadlines still pierce through`
              : '2-hour deep focus lock · soft tasks dim out'}
          </p>
          {isVoidMode && (
            <p className="text-2xl font-mono font-bold text-indigo-300 mt-2">
              {formatTime(voidTimeLeft)}
            </p>
          )}
        </div>
        <button
          onClick={isVoidMode ? deactivateVoid : activateVoid}
          className={`min-h-[48px] min-w-[48px] px-5 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
            isVoidMode
              ? 'bg-indigo-500 hover:bg-indigo-400 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-100'
          }`}
        >
          {isVoidMode ? 'Exit Void' : 'Enter Void'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT BLOCK
// ─────────────────────────────────────────────────────────────────────────────

function EventBlock({ event }: { event: EventData }) {
  const [pendingTap, setPendingTap] = useState<AttendanceTap>(null);
  const [logged, setLogged] = useState<'Attended' | 'Missed' | null>(null);
  const [safeBunks, setSafeBunks] = useState(event.safeBunks);

  function handleFirstTap(status: 'Attended' | 'Missed') {
    setPendingTap(status);
  }

  function handleConfirm() {
    if (!pendingTap) return;
    if (pendingTap === 'Missed') {
      setSafeBunks((b) => Math.max(0, b - 1));
    }
    setLogged(pendingTap);
    setPendingTap(null);
  }

  function handleCancel() {
    setPendingTap(null);
  }

  const borderClass = event.piercesVoid
    ? 'border-2 border-amber-400/70'
    : 'border border-slate-700';

  return (
    <div className={`rounded-2xl bg-slate-900 p-4 space-y-3 ${borderClass}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-slate-100 truncate">{event.title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{event.time} · {event.courseRef}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {event.piercesVoid && (
            <span className="text-xs bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full font-medium">
              Pierces Void
            </span>
          )}
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold ${
            safeBunks > 2
              ? 'bg-emerald-900/60 text-emerald-300'
              : safeBunks > 0
              ? 'bg-yellow-900/60 text-yellow-300'
              : 'bg-red-900/60 text-red-400'
          }`}>
            {safeBunks} bunks safe
          </span>
        </div>
      </div>

      {/* Attendance buttons */}
      {logged ? (
        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
          logged === 'Attended' ? 'bg-emerald-900/40' : 'bg-red-900/40'
        }`}>
          <span className="text-sm font-semibold text-slate-200">
            {logged === 'Attended' ? '✅ Attended' : '❌ Missed'}
          </span>
          <button
            onClick={() => { setLogged(null); setPendingTap(null); }}
            className="ml-auto text-xs text-slate-400 hover:text-slate-200 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg"
          >
            Undo
          </button>
        </div>
      ) : pendingTap ? (
        <div className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 ${
          pendingTap === 'Attended' ? 'bg-emerald-900/40 border border-emerald-500/40' : 'bg-red-900/40 border border-red-500/40'
        }`}>
          <p className="text-sm text-slate-300">
            Confirm <strong className={pendingTap === 'Attended' ? 'text-emerald-300' : 'text-red-400'}>{pendingTap}</strong>?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="min-h-[48px] min-w-[48px] px-3 rounded-lg text-sm text-slate-400 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className={`min-h-[48px] min-w-[48px] px-4 rounded-lg text-sm font-bold transition-colors ${
                pendingTap === 'Attended'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
            >
              Confirm
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => handleFirstTap('Attended')}
            className="min-h-[48px] flex-1 rounded-xl bg-emerald-900/50 hover:bg-emerald-800/70 text-emerald-300 font-semibold text-sm border border-emerald-700/50 transition-colors"
          >
            Attended
          </button>
          <button
            onClick={() => handleFirstTap('Missed')}
            className="min-h-[48px] flex-1 rounded-xl bg-red-900/40 hover:bg-red-800/60 text-red-400 font-semibold text-sm border border-red-800/50 transition-colors"
          >
            Missed
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHORE BLOCK
// ─────────────────────────────────────────────────────────────────────────────

function ChoreBlock({ chore }: { chore: ChoreData }) {
  const { isVoidMode } = useVoid();
  const [done, setDone] = useState(false);

  return (
    <div
      className={`rounded-2xl bg-slate-900 border border-slate-700 p-4 flex items-center gap-4 transition-all duration-500 ${
        isVoidMode ? 'opacity-40 pointer-events-none' : 'opacity-100'
      }`}
    >
      <button
        onClick={() => setDone((d) => !d)}
        aria-label={done ? `Mark ${chore.title} incomplete` : `Complete ${chore.title}`}
        className={`min-h-[48px] min-w-[48px] rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
          done
            ? 'bg-emerald-500 border-emerald-400'
            : 'bg-transparent border-slate-600 hover:border-slate-400'
        }`}
      >
        {done && (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <div className="min-w-0">
        <p className={`font-medium text-sm transition-all ${done ? 'line-through text-slate-500' : 'text-slate-200'}`}>
          {chore.title}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">{chore.category}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD VIEW
// ─────────────────────────────────────────────────────────────────────────────

const DUMMY_EVENTS: EventData[] = [
  { id: 'e1', title: 'Strategic Management', time: '09:00–10:30', courseRef: 'MBA-STRAT-501', piercesVoid: true, safeBunks: 3 },
  { id: 'e2', title: 'Organisational Behaviour', time: '11:00–12:30', courseRef: 'MBA-OB-502', piercesVoid: true, safeBunks: 1 },
  { id: 'e3', title: 'Finance Lab', time: '14:00–15:30', courseRef: 'MBA-FIN-503', piercesVoid: false, safeBunks: 5 },
];

const DUMMY_CHORES: ChoreData[] = [
  { id: 'c1', title: 'Reset desk & restock water', category: 'Self-Care' },
  { id: 'c2', title: 'Read OB case study (30 min)', category: 'Academic Prep' },
  { id: 'c3', title: 'Evening walk / stretch', category: 'Health' },
];

function DashboardView() {
  return (
    <div className="space-y-6">
      <VoidController />

      <section>
        <h2 className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-3 px-1">
          Today's Schedule
        </h2>
        <div className="space-y-3">
          {DUMMY_EVENTS.map((ev) => (
            <EventBlock key={ev.id} event={ev} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-3 px-1">
          Daily Chores
        </h2>
        <div className="space-y-2">
          {DUMMY_CHORES.map((ch) => (
            <ChoreBlock key={ch.id} chore={ch} />
          ))}
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENT DECONSTRUCTOR VIEW
// ─────────────────────────────────────────────────────────────────────────────

const STAGES = [
  'Context / Primary Research',
  'Secondary Requirements',
  'Execution / First Draft',
  'Polishing & Submission',
];

function AssignmentDeconstructorView() {
  const [taskName, setTaskName] = useState('');
  const [hours, setHours] = useState('4');
  const [chunks, setChunks] = useState<Chunk[]>([]);

  function handleDeconstruct(e: React.FormEvent) {
    e.preventDefault();
    const totalMins = parseFloat(hours) * 60;
    if (!taskName.trim() || isNaN(totalMins) || totalMins <= 0) return;
    const numChunks = Math.ceil(totalMins / 30);
    const generated: Chunk[] = Array.from({ length: numChunks }, (_, i) => ({
      id: `chunk-${i}`,
      stage: STAGES[Math.floor((i / numChunks) * STAGES.length)],
      label: `${taskName} — Block ${i + 1} (30 min)`,
      done: false,
    }));
    setChunks(generated);
  }

  function toggleChunk(id: string) {
    setChunks((prev) => prev.map((c) => c.id === id ? { ...c, done: !c.done } : c));
  }

  const doneCount = chunks.filter((c) => c.done).length;
  const pct = chunks.length > 0 ? Math.round((doneCount / chunks.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Assignment Deconstructor</h2>
        <p className="text-sm text-slate-400 mt-1">Break any massive task into 30-min cognitive chunks across 4 stages.</p>
      </div>

      <form onSubmit={handleDeconstruct} className="bg-slate-900 rounded-2xl border border-slate-700 p-5 space-y-4">
        <div>
          <label htmlFor="task-name" className="block text-sm font-medium text-slate-300 mb-1.5">
            Task Name
          </label>
          <input
            id="task-name"
            type="text"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="e.g. Strategy Case Analysis"
            className="w-full min-h-[48px] bg-slate-800 border border-slate-600 rounded-xl px-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>
        <div>
          <label htmlFor="est-hours" className="block text-sm font-medium text-slate-300 mb-1.5">
            Estimated Hours
          </label>
          <input
            id="est-hours"
            type="number"
            min="0.5"
            step="0.5"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="w-full min-h-[48px] bg-slate-800 border border-slate-600 rounded-xl px-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>
        <button
          type="submit"
          className="w-full min-h-[48px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors text-sm"
        >
          Deconstruct Assignment
        </button>
      </form>

      {chunks.length > 0 && (
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300 font-medium">{doneCount} / {chunks.length} blocks done</span>
              <span className="text-indigo-400 font-bold">{pct}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Chunks grouped by stage */}
          {STAGES.map((stage) => {
            const stageChunks = chunks.filter((c) => c.stage === stage);
            if (stageChunks.length === 0) return null;
            return (
              <div key={stage} className="space-y-2">
                <h3 className="text-xs font-semibold tracking-widest text-slate-500 uppercase px-1">
                  {stage}
                </h3>
                {stageChunks.map((chunk) => (
                  <button
                    key={chunk.id}
                    onClick={() => toggleChunk(chunk.id)}
                    className={`w-full min-h-[48px] flex items-center gap-3 px-4 rounded-xl border text-left transition-all duration-200 ${
                      chunk.done
                        ? 'bg-slate-900/50 border-slate-700 opacity-50'
                        : 'bg-slate-900 border-slate-700 hover:border-indigo-500/50'
                    }`}
                  >
                    <div className={`w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                      chunk.done ? 'bg-indigo-500 border-indigo-400' : 'border-slate-500'
                    }`}>
                      {chunk.done && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm ${chunk.done ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {chunk.label}
                    </span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FINANCES VIEW
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 't1', label: 'Coffee & snack', amount: 280, date: 'Today' },
  { id: 't2', label: 'Grab cab to campus', amount: 190, date: 'Today' },
  { id: 't3', label: 'Amazon impulse buy', amount: 599, date: 'Yesterday' },
  { id: 't4', label: 'Bubble tea', amount: 180, date: 'Yesterday' },
];

const MONTHLY_LIMIT = 5000;

function FinancesView() {
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [showForm, setShowForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
  const remaining = MONTHLY_LIMIT - totalSpent;
  const pct = Math.min(100, Math.round((totalSpent / MONTHLY_LIMIT) * 100));

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(newAmount);
    if (!newLabel.trim() || isNaN(amt) || amt <= 0) return;
    setTransactions((prev) => [
      { id: `t${Date.now()}`, label: newLabel.trim(), amount: amt, date: 'Just now' },
      ...prev,
    ]);
    setNewLabel('');
    setNewAmount('');
    setShowForm(false);
  }

  const gaugeColor =
    pct < 60 ? 'bg-emerald-500' : pct < 85 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Dopamine Fund</h2>
        <p className="text-sm text-slate-400 mt-1">₹5,000 / month · guilt-free impulse budget</p>
      </div>

      {/* Balance card */}
      <div className="bg-slate-900 rounded-2xl border border-slate-700 p-5 space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Safe to Spend</p>
            <p className={`text-4xl font-extrabold tabular-nums ${remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              ₹{Math.max(0, remaining).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Spent</p>
            <p className="text-lg font-bold text-slate-300">₹{totalSpent.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Gauge */}
        <div className="space-y-1.5">
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${gaugeColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>₹0</span>
            <span>{pct}% used</span>
            <span>₹5,000</span>
          </div>
        </div>

        <button
          onClick={() => setShowForm((s) => !s)}
          className="w-full min-h-[48px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Expense'}
        </button>

        {/* Inline add form */}
        {showForm && (
          <form onSubmit={handleAdd} className="space-y-3 pt-1">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="What did you buy?"
              className="w-full min-h-[48px] bg-slate-800 border border-slate-600 rounded-xl px-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            <div className="flex gap-3">
              <input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="Amount (₹)"
                min="1"
                className="flex-1 min-h-[48px] bg-slate-800 border border-slate-600 rounded-xl px-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <button
                type="submit"
                className="min-h-[48px] min-w-[48px] px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-colors"
              >
                Log
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Transaction list */}
      <section>
        <h3 className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-3 px-1">
          Recent Transactions
        </h3>
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-200">{tx.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{tx.date}</p>
              </div>
              <p className="text-sm font-bold text-red-400">−₹{tx.amount}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOTTOM NAV ICONS
// ─────────────────────────────────────────────────────────────────────────────

function IconDashboard({ active }: { active: boolean }) {
  return (
    <svg className={`w-6 h-6 transition-colors ${active ? 'text-indigo-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function IconAssignments({ active }: { active: boolean }) {
  return (
    <svg className={`w-6 h-6 transition-colors ${active ? 'text-indigo-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function IconFinances({ active }: { active: boolean }) {
  return (
    <svg className={`w-6 h-6 transition-colors ${active ? 'text-indigo-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT PAGE — DEFAULT EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  const [activeView, setActiveView] = useState<View>('dashboard');

  const navItems: { view: View; label: string; Icon: React.FC<{ active: boolean }> }[] = [
    { view: 'dashboard', label: 'Dashboard', Icon: IconDashboard },
    { view: 'assignments', label: 'Assignments', Icon: IconAssignments },
    { view: 'finances', label: 'Finances', Icon: IconFinances },
  ];

  return (
    <VoidProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-lg mx-auto">
        {/* ── Sticky Header ── */}
        <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-5 py-4">
          <h1 className="text-base font-bold text-slate-100 tracking-tight">
            AuDHD MBA Life Tracker
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 capitalize">
            {activeView === 'dashboard' && 'Daily Dashboard'}
            {activeView === 'assignments' && 'Assignment Deconstructor'}
            {activeView === 'finances' && 'Dopamine Fund'}
          </p>
        </header>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-y-auto px-4 pt-5 pb-32">
          {activeView === 'dashboard' && <DashboardView />}
          {activeView === 'assignments' && <AssignmentDeconstructorView />}
          {activeView === 'finances' && <FinancesView />}
        </main>

        {/* ── Fixed Bottom Navigation ── */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800">
          <div className="max-w-lg mx-auto flex items-stretch">
            {navItems.map(({ view, label, Icon }) => {
              const active = activeView === view;
              return (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  aria-label={label}
                  aria-current={active ? 'page' : undefined}
                  className={`flex-1 min-h-[64px] flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                    active ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon active={active} />
                  <span className={`text-[10px] font-semibold tracking-wide transition-colors ${
                    active ? 'text-indigo-400' : 'text-slate-500'
                  }`}>
                    {label}
                  </span>
                  {active && (
                    <span className="absolute bottom-0 h-0.5 w-10 bg-indigo-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </VoidProvider>
  );
}
