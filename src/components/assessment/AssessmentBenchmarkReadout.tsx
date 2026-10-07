import React, { useState, useMemo } from 'react';
import type {
  AssessmentAttempt,
  AssessmentState,
  CompanyOverlay,
  CompanyAssessmentOverlayResult,
} from '../../types';
import type {
  AssessmentProfileReadout,
  WeeklyAssessmentReadout,
} from '../../engine/assessmentEngine';
import type { AssessmentLearningTarget } from '../../engine/assessmentIntegration';
import { AssessmentBenchmarkHeader } from './AssessmentBenchmarkHeader';
import { AssessmentCapabilityMatrix } from './AssessmentCapabilityMatrix';
import { AssessmentLearningTargets } from './AssessmentLearningTargets';
import { AssessmentWeaknessOverlay } from './AssessmentWeaknessOverlay';
import { AssessmentCalibrationObservatory } from './AssessmentCalibrationObservatory';

interface AssessmentBenchmarkReadoutProps {
  latestCompletedAttempt?: AssessmentAttempt;
  completedWeeklyAttempts: AssessmentAttempt[];
  profileReadout: AssessmentProfileReadout;
  assessmentState?: AssessmentState;
  weeklyReadout?: WeeklyAssessmentReadout | null;
  pendingSundayObligation: boolean;
  companyOverlays?: CompanyOverlay[];
  selectedCompanyOverlayId: string | null;
  companyAssessmentOverlayResult?: CompanyAssessmentOverlayResult;
  assessmentTargets: {
    targets: AssessmentLearningTarget[];
    summary: string;
  };
  primaryAssessmentActionReason?: string;
  primaryActionDeepLink?: {
    route: string;
    targetId?: string;
  } | null;
  onSelectCompanyOverlay: (id: string | null) => void;
  onNavigateTarget: (route: string, targetId?: string) => void;
  onStartSunday: () => void;
  onStartFullReassessment: () => void;
  onOpenProjectLab: () => void;
  onContinueToToday: () => void;
}

export const AssessmentBenchmarkReadout: React.FC<AssessmentBenchmarkReadoutProps> = ({
  latestCompletedAttempt,
  completedWeeklyAttempts,
  profileReadout,
  assessmentState,
  weeklyReadout,
  pendingSundayObligation,
  companyOverlays,
  selectedCompanyOverlayId,
  companyAssessmentOverlayResult,
  assessmentTargets,
  primaryAssessmentActionReason,
  primaryActionDeepLink,
  onSelectCompanyOverlay,
  onNavigateTarget,
  onStartSunday,
  onStartFullReassessment,
  onOpenProjectLab,
  onContinueToToday,
}) => {
  const [readoutTab, setReadoutTab] = useState<'baseline' | 'weekly'>('baseline');
  const [selectedWeeklyAttemptId, setSelectedWeeklyAttemptId] = useState<string | null>(null);

  const latestWeeklyAttempt = completedWeeklyAttempts[completedWeeklyAttempts.length - 1];
  const activeWeeklyAttempt = useMemo(() => {
    if (selectedWeeklyAttemptId) {
      return (
        completedWeeklyAttempts.find((a) => a.id === selectedWeeklyAttemptId) ||
        latestWeeklyAttempt
      );
    }
    return latestWeeklyAttempt;
  }, [completedWeeklyAttempts, selectedWeeklyAttemptId, latestWeeklyAttempt]);

  return (
    <main
      data-subsystem="assessment"
      data-testid="assessment-benchmark-readout"
      aria-label="Diagnostic Benchmark Readout Workspace"
      className="max-w-[1280px] mx-auto space-y-8 pb-16 animate-fade-in"
    >
      {/* Zone 1: Capability Benchmark Header & Sub-Tab Switcher */}
      <AssessmentBenchmarkHeader
        latestCompletedAttempt={latestCompletedAttempt}
        profileReadout={profileReadout}
        readoutTab={readoutTab}
        onTabChange={setReadoutTab}
        completedWeeklyCount={completedWeeklyAttempts.length}
        pendingSundayObligation={pendingSundayObligation}
        onContinueToToday={onContinueToToday}
      />

      {readoutTab === 'baseline' ? (
        <div id="panel-baseline" role="tabpanel" aria-labelledby="tab-baseline" className="space-y-8">
          {/* Zone 3: Prescriptive Learning Targets & Hero Handoff Action */}
          <AssessmentLearningTargets
            targets={assessmentTargets.targets}
            summary={assessmentTargets.summary}
            primaryActionReason={primaryAssessmentActionReason}
            primaryActionDeepLink={primaryActionDeepLink}
            onNavigateTarget={onNavigateTarget}
          />

          {/* Zone 5 Launchers: Weekly Calibration & Longitudinal Reassessment Banners */}
          <AssessmentCalibrationObservatory
            pendingSundayObligation={pendingSundayObligation}
            isReassessmentRecommended={profileReadout.isReassessmentRecommended}
            readoutTab="baseline"
            completedWeeklyAttempts={completedWeeklyAttempts}
            onStartSunday={onStartSunday}
            onStartFullReassessment={onStartFullReassessment}
            onSelectWeeklyAttempt={setSelectedWeeklyAttemptId}
            onContinueToToday={onContinueToToday}
          />

          {/* Zone 2: 11-Domain Capability Matrix */}
          <AssessmentCapabilityMatrix
            domainProfiles={profileReadout.domainProfiles}
            companyAssessmentOverlayResult={companyAssessmentOverlayResult}
            onOpenProjectLab={onOpenProjectLab}
          />

          {/* Zone 4: Root-Cause Weakness Taxonomy & Company Role Overlay Lab */}
          <AssessmentWeaknessOverlay
            weaknesses={profileReadout.weaknesses}
            strengths={profileReadout.strengths}
            planInputs={profileReadout.planInputs}
            companyOverlays={companyOverlays}
            selectedCompanyOverlayId={selectedCompanyOverlayId}
            companyAssessmentOverlayResult={companyAssessmentOverlayResult}
            assessmentState={assessmentState}
            onSelectCompanyOverlay={onSelectCompanyOverlay}
            onNavigateRoute={(route) => onNavigateTarget(route)}
          />
        </div>
      ) : (
        /* Zone 5 Detail: Weekly Sunday Mini-Test Observatory */
        <AssessmentCalibrationObservatory
          pendingSundayObligation={pendingSundayObligation}
          isReassessmentRecommended={profileReadout.isReassessmentRecommended}
          readoutTab="weekly"
          completedWeeklyAttempts={completedWeeklyAttempts}
          activeWeeklyAttempt={activeWeeklyAttempt}
          weeklyReadout={weeklyReadout}
          onStartSunday={onStartSunday}
          onStartFullReassessment={onStartFullReassessment}
          onSelectWeeklyAttempt={setSelectedWeeklyAttemptId}
          onContinueToToday={onContinueToToday}
        />
      )}
    </main>
  );
};
