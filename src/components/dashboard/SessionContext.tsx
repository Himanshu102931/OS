import { createContext, useContext } from 'react';
import type { SessionState, SessionComposerMode } from '../../engine/sessionComposer';

export interface SessionContextValue {
  sessionState: SessionState | null;
  composeSession: (availableMinutes?: number, sessionMode?: SessionComposerMode) => void;
  advanceActivity: (outcome: 'completed' | 'skipped' | 'failed' | 'postponed') => void;
  recoverActivity: (availableMinutes: number) => void;
  clearSession: () => void;
  currentActivity: SessionState['plan']['activities'][0] | null;
  remainingTime: number;
  sessionProgress: { completed: number; total: number; percent: number };
  isSessionActive: boolean;
  selectedDuration: number;
  setSelectedDuration: (minutes: number) => void;
  sessionMode: SessionComposerMode;
  setSessionMode: (mode: SessionComposerMode) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export const useSession = (): SessionContextValue => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

export { SessionContext };