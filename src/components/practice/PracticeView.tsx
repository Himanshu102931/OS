import React, { useState, useMemo } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { useSession } from '../dashboard/SessionContext';
import { PRACTICE_SESSIONS } from '../../data/practiceDataset';
import { getRecommendedPracticeSession, getPracticeCategoryStats } from '../../engine/practiceEngine';
import { PracticeHeader } from './PracticeHeader';
import { PracticeProvingStrip } from './PracticeProvingStrip';
import { RecommendedDrillHero } from './RecommendedDrillHero';
import { PracticeRemediationQueue } from './PracticeRemediationQueue';
import { PracticeCategoryTabs, type PracticeTabCategory } from './PracticeCategoryTabs';
import { PracticeSessionGrid } from './PracticeSessionGrid';
import { PracticeRunnerModal } from './PracticeRunnerModal';
import type { PracticeSessionDefinition } from '../../types';
import type { RoutePath } from '../../context/PlacementContext';

function useSafeSession() {
  try {
    return useSession();
  } catch {
    return null;
  }
}

export const PracticeView: React.FC = () => {
  const {
    practiceAttempts,
    skillStates,
    companyOverlays,
    todayDate,
    recordPracticeAttempt,
    routeState,
    setRoute,
  } = usePlacement();
  const session = useSafeSession();

  const [dismissedTargetId, setDismissedTargetId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<PracticeTabCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timedOnly, setTimedOnly] = useState(false);
  const [activeSession, setActiveSession] = useState<PracticeSessionDefinition | null>(null);

  // Derive deep-linked session directly from canonical route state
  const isDeepLinked =
    routeState.route === 'practice' &&
    Boolean(routeState.targetId) &&
    routeState.targetId !== dismissedTargetId;

  const deepLinkedSession = isDeepLinked
    ? PRACTICE_SESSIONS.find((s) => s.id === routeState.targetId) ?? null
    : null;

  const effectiveSession = activeSession ?? deepLinkedSession;

  // Recommendation engine call
  const recommendation = useMemo(() => {
    return getRecommendedPracticeSession(
      PRACTICE_SESSIONS,
      practiceAttempts,
      skillStates,
      companyOverlays
    );
  }, [practiceAttempts, skillStates, companyOverlays]);

  // Macro metrics for proving strip
  const totalAttempts = practiceAttempts.length;
  const averageAccuracy =
    totalAttempts > 0
      ? Math.round(
          practiceAttempts.reduce((sum, a) => sum + (a.accuracyPct ?? 0), 0) / totalAttempts
        )
      : 0;

  const categoryStats = useMemo(() => getPracticeCategoryStats(practiceAttempts), [practiceAttempts]);
  const readyDomainsCount = useMemo(() => {
    return Object.values(categoryStats).filter((c) => c.avgScorePct >= 70).length;
  }, [categoryStats]);

  const remediationCount = useMemo(() => {
    // Count sessions whose latest attempt failed or has < 60% accuracy
    const latestBySession = new Map<string, typeof practiceAttempts[0]>();
    practiceAttempts.forEach((a) => {
      const existing = latestBySession.get(a.sessionId);
      if (!existing || new Date(a.completedAt || a.date).getTime() > new Date(existing.completedAt || existing.date).getTime()) {
        latestBySession.set(a.sessionId, a);
      }
    });
    let count = 0;
    latestBySession.forEach((a) => {
      if (!a.passed || (a.accuracyPct ?? 0) < 60) {
        count++;
      }
    });
    return count;
  }, [practiceAttempts]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return PRACTICE_SESSIONS.filter((s) => {
      // Category filter
      if (activeCategory !== 'all' && s.category !== activeCategory) return false;

      // Timed only filter
      if (timedOnly && !s.id.includes('timed')) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = s.title.toLowerCase().includes(query);
        const matchesDesc = s.description.toLowerCase().includes(query);
        const matchesCategory = s.category.toLowerCase().includes(query);
        const matchesTopic = s.topicId ? s.topicId.toLowerCase().includes(query) : false;
        const matchesQuestion = s.questions.some(
          (q) =>
            q.prompt.toLowerCase().includes(query) ||
            (q.categoryTag && q.categoryTag.toLowerCase().includes(query))
        );
        if (!matchesTitle && !matchesDesc && !matchesCategory && !matchesTopic && !matchesQuestion) {
          return false;
        }
      }

      return true;
    });
  }, [activeCategory, timedOnly, searchQuery]);

  return (
    <div
      data-testid="practice-view"
      className="practice-view-container space-y-6 max-w-7xl xl:max-w-[1400px] mx-auto font-sans"
    >
      {/* Zone 1: Header */}
      <PracticeHeader totalAttempts={totalAttempts} />

      {/* Zone 1: Proving Ground Strip */}
      <PracticeProvingStrip
        totalAttempts={totalAttempts}
        averageAccuracy={averageAccuracy}
        readyDomainsCount={readyDomainsCount}
        totalDomainsCount={6}
        remediationCount={remediationCount}
      />

      {/* Zone 2: Recommended Drill Hero */}
      {recommendation && (
        <RecommendedDrillHero
          recommendation={recommendation}
          onStartSession={(s) => setActiveSession(s)}
        />
      )}

      {/* Zone 3: Persistent Remediation & Review Queue */}
      <PracticeRemediationQueue
        attempts={practiceAttempts}
        allSessions={PRACTICE_SESSIONS}
        onStartSession={(s) => setActiveSession(s)}
        onNavigate={(route, targetId) => setRoute(route, targetId)}
      />

      {/* Zone 4: Category Tabs, Search & Filters */}
      <div className="space-y-4">
        <PracticeCategoryTabs
          activeCategory={activeCategory}
          onSelectCategory={(cat) => setActiveCategory(cat)}
          searchQuery={searchQuery}
          onSearchChange={(q) => setSearchQuery(q)}
          timedOnly={timedOnly}
          onToggleTimedOnly={() => setTimedOnly((prev) => !prev)}
        />

        {/* Zone 4: Session Grid */}
        <PracticeSessionGrid
          sessions={filteredSessions}
          attempts={practiceAttempts}
          activeCategory={activeCategory}
          onStartSession={(s) => setActiveSession(s)}
          onClearFilters={() => {
            setActiveCategory('all');
            setSearchQuery('');
            setTimedOnly(false);
          }}
        />
      </div>

      {/* Zone 5: Practice Runner Modal */}
      <PracticeRunnerModal
        session={effectiveSession}
        isOpen={!!effectiveSession}
        todayISO={todayDate}
        onClose={() => {
          setActiveSession(null);
          if (deepLinkedSession) {
            setDismissedTargetId(routeState.targetId ?? null);
            setRoute('dashboard');
          }
        }}
        onCompleteSession={(attempt, evidenceLog) => {
          recordPracticeAttempt(attempt, evidenceLog);
          if (deepLinkedSession) {
            setDismissedTargetId(routeState.targetId ?? null);
            session?.advanceActivity('completed');
            setRoute('dashboard');
          }
        }}
        onContinuationAction={({ route, targetId }: { route: RoutePath; targetId: string }) => {
          setActiveSession(null);
          if (deepLinkedSession) {
            setDismissedTargetId(routeState.targetId ?? null);
          }
          setRoute(route, targetId);
        }}
      />
    </div>
  );
};
