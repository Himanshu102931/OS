import React, { useState, useEffect, useRef } from 'react';
import { Target, Clock, Calendar, Compass, ArrowRight, ShieldCheck, Sparkles, X } from 'lucide-react';

export interface OnboardingSubmitPayload {
  targetPlacementGoal: string;
  dailyStudyMinutes: number;
  placementHorizonDate: string;
}

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (payload: OnboardingSubmitPayload) => void;
  onExploreFirst: () => void;
}

const COMMON_GOALS = [
  'Software Engineer (SDE-1)',
  'Backend Engineer',
  'Full Stack Developer',
  'Data / ML Engineer',
  'Systems / Embedded Engineer',
];

const TIME_OPTIONS = [
  { label: '60 min (1h)', value: 60 },
  { label: '120 min (2h)', value: 120 },
  { label: '180 min (3h)', value: 180 },
  { label: '240 min (4h)', value: 240 },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
  onExploreFirst,
}) => {
  const [goal, setGoal] = useState('');
  const [studyMinutes, setStudyMinutes] = useState<number>(120);
  const [horizonDate, setHorizonDate] = useState('');
  const [isUnknownDeadline, setIsUnknownDeadline] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  // Keyboard accessibility: Escape to explore first
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExploreFirst();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onExploreFirst]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({
      targetPlacementGoal: goal.trim(),
      dailyStudyMinutes: Math.min(480, Math.max(30, studyMinutes || 120)),
      placementHorizonDate: isUnknownDeadline ? '' : horizonDate.trim(),
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      data-testid="onboarding-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border border-border-default bg-surface-panel p-6 sm:p-8 shadow-2xl space-y-6 font-sans text-text-primary"
      >
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-accent/10 border border-accent/30 text-accent font-mono text-[11px] font-semibold uppercase tracking-wider">
                <Sparkles className="size-3" aria-hidden="true" />
                First-Run Personalization
              </span>
            </div>
            <button
              type="button"
              onClick={onExploreFirst}
              aria-label="Explore first without saving"
              className="text-text-tertiary hover:text-text-primary p-1 rounded-md transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          <h2
            id="onboarding-title"
            className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary pt-1"
          >
            Welcome to PlacementOS
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            PlacementOS is your evidence-driven, local-first placement control system. All your progress,
            diagnostic scores, and study plans stay strictly on this device.
          </p>

          <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[10px] text-text-secondary">
            <div className="flex items-center gap-1.5 p-2 rounded bg-surface-canvas border border-border-default">
              <ShieldCheck className="size-3 text-status-success shrink-0" />
              <span>100% Local-First</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded bg-surface-canvas border border-border-default">
              <Clock className="size-3 text-status-warning shrink-0" />
              <span>Spaced Practice</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded bg-surface-canvas border border-border-default">
              <Target className="size-3 text-accent shrink-0" />
              <span>Objective Proof</span>
            </div>
          </div>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* 1. Target Role / Career Goal */}
          <div className="space-y-2">
            <label
              htmlFor="onboarding-goal-input"
              className="block text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5"
            >
              <Target className="size-3.5 text-accent" />
              1. What is your career or placement goal?
            </label>
            <input
              id="onboarding-goal-input"
              data-testid="onboarding-goal-input"
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Software Engineer (SDE-1), Backend Developer"
              className="w-full px-3.5 py-2 text-sm rounded-lg bg-surface-canvas border border-border-default text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {COMMON_GOALS.map((cg) => (
                <button
                  key={cg}
                  type="button"
                  onClick={() => setGoal(cg)}
                  className={`text-[11px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    goal === cg
                      ? 'bg-accent/15 border-accent text-accent font-medium'
                      : 'bg-surface-subtle/40 border-border-default text-text-tertiary hover:text-text-primary hover:border-border-active'
                  }`}
                >
                  {cg}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Realistic Daily Study Time */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Clock className="size-3.5 text-status-warning" />
              2. Realistic daily study availability
            </label>
            <p className="text-[11px] text-text-tertiary">
              How much focused time can you realistically invest every day?
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStudyMinutes(opt.value)}
                  data-testid={`onboarding-time-${opt.value}`}
                  className={`py-2 px-3 rounded-lg text-xs font-mono font-medium border text-center transition-all cursor-pointer ${
                    studyMinutes === opt.value
                      ? 'bg-accent/15 border-accent text-accent ring-1 ring-accent'
                      : 'bg-surface-canvas border-border-default text-text-secondary hover:text-text-primary hover:bg-surface-subtle'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Target Placement Deadline */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="onboarding-deadline-input"
                className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5"
              >
                <Calendar className="size-3.5 text-accent" />
                3. Target placement deadline (optional)
              </label>
            </div>

            <div className="space-y-2">
              <input
                id="onboarding-deadline-input"
                data-testid="onboarding-deadline-input"
                type="date"
                value={horizonDate}
                disabled={isUnknownDeadline}
                onChange={(e) => setHorizonDate(e.target.value)}
                className={`w-full px-3.5 py-2 text-sm rounded-lg bg-surface-canvas border border-border-default text-text-primary font-mono focus:outline-none focus:ring-1 focus:ring-accent ${
                  isUnknownDeadline ? 'opacity-40 cursor-not-allowed bg-surface-subtle' : ''
                }`}
              />

              <label
                className="flex items-center gap-2 p-2 rounded-md bg-surface-canvas border border-border-default hover:bg-surface-subtle transition-colors cursor-pointer select-none"
                data-testid="onboarding-unknown-deadline-label"
              >
                <input
                  type="checkbox"
                  id="onboarding-unknown-deadline"
                  data-testid="onboarding-unknown-deadline"
                  checked={isUnknownDeadline}
                  onChange={(e) => setIsUnknownDeadline(e.target.checked)}
                  className="size-4 rounded border-border-default text-accent focus:ring-accent cursor-pointer accent-accent"
                />
                <span className="text-xs text-text-secondary">
                  I don&apos;t have a fixed placement date yet (keep pacing generic)
                </span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-border-default flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={onExploreFirst}
              data-testid="onboarding-explore-btn"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary bg-surface-canvas hover:bg-surface-subtle border border-border-default transition-colors cursor-pointer"
            >
              <Compass className="size-3.5" aria-hidden="true" />
              Explore First (Use Generic Defaults)
            </button>

            <button
              type="submit"
              data-testid="onboarding-submit-btn"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-accent hover:bg-accent/90 transition-colors shadow-sm cursor-pointer"
            >
              <span>Save &amp; Get Started</span>
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
