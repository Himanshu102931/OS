import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { PRACTICE_SESSIONS } from '../../data/practiceDataset';
import { getRecommendedPracticeSession, getPracticeCategoryStats } from '../../engine/practiceEngine';
import { PracticeRunnerModal } from './PracticeRunnerModal';
import type { PracticeSessionDefinition, PracticeCategory } from '../../types';
import {
  Sparkles,
  Award,
  Clock,
  CheckCircle2,
  Play,
  Zap,
  Target,
  FileCode,
  BookOpen,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../ui/button';

export const PracticeView: React.FC = () => {
  const {
    practiceAttempts,
    skillStates,
    companyOverlays,
    todayDate,
    recordPracticeAttempt,
  } = usePlacement();

  const [activeCategory, setActiveCategory] = useState<PracticeCategory | 'all'>('all');
  const [activeSession, setActiveSession] = useState<PracticeSessionDefinition | null>(null);

  // Recommendation engine call
  const recommendation = getRecommendedPracticeSession(
    PRACTICE_SESSIONS,
    practiceAttempts,
    skillStates,
    companyOverlays
  );

  const categoryStats = getPracticeCategoryStats(practiceAttempts);

  const categories: { id: PracticeCategory | 'all'; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'all', label: 'All Sessions', icon: Sparkles },
    { id: 'aptitude', label: 'Aptitude', icon: Target },
    { id: 'verbal', label: 'Verbal', icon: MessageSquare },
    { id: 'sql', label: 'SQL', icon: FileCode },
    { id: 'core_cs', label: 'Core CS', icon: BookOpen },
    { id: 'project_defense', label: 'Project Defense', icon: ShieldCheck },
    { id: 'mock_interview', label: 'Mock Interview', icon: Award },
  ];

  const filteredSessions = PRACTICE_SESSIONS.filter((s) => {
    if (activeCategory !== 'all' && s.category !== activeCategory) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl xl:max-w-[1400px] mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262D38]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F1F5F9]">
            Placement Assessment & Practice Hub
          </h1>
          <p className="text-xs text-[#8E98A8] mt-1">
            Targeted drills for Aptitude, Verbal, SQL scenarios, Core CS, Project Defense, and Mock Interviews.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#8E98A8]">
          <span className="px-3 py-1.5 rounded-lg bg-[#14171D] border border-[#262D38]">
            Attempts Completed: <strong className="text-[#FFC665]">{practiceAttempts.length}</strong>
          </span>
        </div>
      </div>

      {/* Recommended Practice Hero Card */}
      {recommendation && (
        <div className="bg-gradient-to-br from-[#1B2028] to-[#14171D] p-6 border border-[#E5A93C]/40 rounded-xl space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E5A93C]/15 text-xs font-bold text-[#FFC665]">
              <Zap className="size-3.5 text-[#E5A93C]" /> RECOMMENDED DRILL
            </span>
            <span className="text-xs text-[#8E98A8] font-mono">
              ~{recommendation.session.estimatedMinutes} mins
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#F1F5F9]">{recommendation.session.title}</h2>
            <p className="text-xs text-[#8E98A8] leading-relaxed">{recommendation.session.description}</p>
          </div>

          <div className="pt-3 border-t border-[#262D38] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#8E98A8]">
              <span className="font-semibold text-[#FFC665]">Why this?</span>
              <span>{recommendation.reason}</span>
            </div>

            <Button
              size="sm"
              onClick={() => setActiveSession(recommendation.session)}
              className="h-9 px-5 font-bold text-xs bg-[#E5A93C] hover:bg-[#FFC665] text-[#432C00] rounded-md shadow-sm shrink-0"
            >
              <Play className="size-3.5 mr-1.5" /> Start Drill Now
            </Button>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 border flex items-center gap-2 ${
                isSelected
                  ? 'bg-[#1B2028] border-[#E5A93C]/50 text-[#F1F5F9] shadow-sm'
                  : 'bg-[#14171D] border-[#262D38] text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028]/60'
              }`}
            >
              <Icon className={`size-3.5 ${isSelected ? 'text-[#E5A93C]' : 'text-[#5C6675]'}`} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Practice Session Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredSessions.map((session) => {
          const attemptCount = practiceAttempts.filter((a) => a.sessionId === session.id).length;
          const stats = categoryStats[session.category];

          return (
            <div
              key={session.id}
              className="bg-[#14171D] border border-[#262D38] rounded-xl p-5 space-y-4 hover:border-[#3B4556] transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#FFC665] bg-[#1B2028] px-2.5 py-0.5 rounded border border-[#262D38]">
                    {session.category.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-[#8E98A8] font-mono flex items-center gap-1">
                    <Clock className="size-3 text-[#E5A93C]" /> {session.estimatedMinutes} mins
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#F1F5F9]">{session.title}</h3>
                <p className="text-xs text-[#8E98A8] leading-relaxed line-clamp-2">{session.description}</p>
              </div>

              <div className="pt-3 border-t border-[#262D38] flex items-center justify-between text-xs text-[#8E98A8]">
                <span>{session.questions.length} Questions</span>

                <div className="flex items-center gap-3">
                  {attemptCount > 0 && stats && (
                    <span className="text-[#10B981] font-semibold text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> {Math.round(stats.avgScorePct)}% Avg
                    </span>
                  )}
                  <Button
                    size="xs"
                    onClick={() => setActiveSession(session)}
                    className="h-8 text-xs font-bold bg-[#1B2028] hover:bg-[#222833] text-[#FFC665] border border-[#E5A93C]/40 rounded-md px-3"
                  >
                    Start Session
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Runner Modal */}
      <PracticeRunnerModal
        session={activeSession}
        isOpen={!!activeSession}
        todayISO={todayDate}
        onClose={() => setActiveSession(null)}
        onCompleteSession={(attempt, evidenceLog) => {
          recordPracticeAttempt(attempt, evidenceLog);
        }}
      />
    </div>
  );
};
