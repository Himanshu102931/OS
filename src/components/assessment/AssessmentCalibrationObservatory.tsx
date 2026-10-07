import React from 'react';
import { Clock, Calendar, ArrowRight, Activity } from 'lucide-react';
import type { AssessmentAttempt, DomainAssessmentResult } from '../../types';
import type { WeeklyAssessmentReadout } from '../../engine/assessmentEngine';

interface AssessmentCalibrationObservatoryProps {
  pendingSundayObligation: boolean;
  isReassessmentRecommended?: boolean;
  readoutTab: 'baseline' | 'weekly';
  completedWeeklyAttempts: AssessmentAttempt[];
  activeWeeklyAttempt?: AssessmentAttempt;
  weeklyReadout?: WeeklyAssessmentReadout | null;
  onStartSunday: () => void;
  onStartFullReassessment: () => void;
  onSelectWeeklyAttempt: (id: string) => void;
  onContinueToToday: () => void;
}

export const AssessmentCalibrationObservatory: React.FC<AssessmentCalibrationObservatoryProps> = ({
  pendingSundayObligation,
  isReassessmentRecommended,
  readoutTab,
  completedWeeklyAttempts,
  activeWeeklyAttempt,
  weeklyReadout,
  onStartSunday,
  onStartFullReassessment,
  onSelectWeeklyAttempt,
  onContinueToToday,
}) => {
  return (
    <section aria-label="Weekly Sunday Mini-Test and Calibration Observatory" className="space-y-6">
      {/* 1. Sunday Mini Test Integration Card (§15, §18) */}
      <div
        data-testid="sunday-mini-test-card"
        className="diagnostic-sweep bg-[#14171D] border border-[#262D38] rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#EAB308] flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden="true" />
              <span>Sunday Mini-Test Engine &amp; Longitudinal Observatory</span>
            </span>
            {pendingSundayObligation ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Obligation Pending
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">
                Eligible (Baseline Completed)
              </span>
            )}
            <span className="text-[10px] font-mono text-[#5C6675]">
              90-Minute Adaptive Mini-Test Protocol
            </span>
          </div>
          <h3 className="text-sm font-bold text-[#F1F5F9]">
            Sunday Adaptive Mini Test (90 Minutes)
          </h3>
          <p className="text-xs text-[#8E98A8] max-w-2xl leading-relaxed">
            Targeted weekly calibration under a 90-minute hard wall-clock limit (&le; 78 min item budget + 12 min buffer). Composed of <strong>60% Open Weaknesses / 20% Spaced Repetition / 20% Unassessed</strong> across &ge; 6 domains.
          </p>
        </div>

        <button
          data-testid="start-sunday-test-btn"
          aria-label="Start Sunday Mini-Test"
          onClick={onStartSunday}
          className="px-5 py-2.5 rounded text-xs font-semibold bg-[#EAB308] text-[#0D0F12] hover:bg-[#CA8A04] transition-colors whitespace-nowrap shadow-sm shrink-0 cursor-pointer"
        >
          Start Sunday Mini-Test
        </button>
      </div>

      {/* 2. Phase F: Full Diagnostic Reassessment Card (§19) */}
      <div
        data-testid="full-reassessment-card"
        className="diagnostic-sweep bg-[#14171D] border border-[#262D38] rounded-md p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono uppercase tracking-wider text-[#38BDF8] font-bold flex items-center gap-1.5">
              <Activity className="size-3.5" aria-hidden="true" />
              <span>Authoritative Longitudinal Calibration</span>
            </span>
            {isReassessmentRecommended && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                Recommended (&ge; 6 Weeks Elapsed)
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-[#F1F5F9]">
            Full Diagnostic Reassessment (180 Minutes)
          </h3>
          <p className="text-xs text-[#8E98A8] max-w-2xl leading-relaxed">
            Full 10-module comprehensive assessment across 84 items. Evaluates longitudinal capability, confirms provisional levels (&ge; 2 consistent observations), and applies conservative regression gates (§17). Always manually initiated.
          </p>
        </div>

        <button
          data-testid="start-reassessment-btn"
          onClick={onStartFullReassessment}
          className="px-5 py-2.5 rounded text-xs font-semibold bg-[#1B2028] text-[#38BDF8] hover:bg-[#262D38] border border-[#38BDF8]/40 transition-colors whitespace-nowrap shadow-sm shrink-0 cursor-pointer"
        >
          Run Full Diagnostic Again
        </button>
      </div>

      {/* 3. Sunday Mini-Tests View (When Sunday Sub-Tab is Active or in Detail) */}
      {readoutTab === 'weekly' && (
        <div id="panel-weekly" role="tabpanel" aria-labelledby="tab-weekly" className="space-y-6 pt-2">
          {completedWeeklyAttempts.length > 0 && weeklyReadout ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[#F1F5F9] flex items-center gap-2">
                  <Calendar className="size-4 text-[#EAB308]" aria-hidden="true" />
                  <span>Weekly Calibration Report</span>
                </h3>

                <div className="flex items-center gap-3">
                  {completedWeeklyAttempts.length > 1 && (
                    <div className="flex items-center gap-2 text-xs">
                      <label htmlFor="weekly-test-select" className="text-[#8E98A8]">Test Date:</label>
                      <select
                        id="weekly-test-select"
                        value={activeWeeklyAttempt?.id}
                        onChange={(e) => onSelectWeeklyAttempt(e.target.value)}
                        className="bg-[#1B2028] border border-[#262D38] text-[#F1F5F9] rounded px-2.5 py-1 text-xs cursor-pointer"
                      >
                        {completedWeeklyAttempts.map((a, idx) => (
                          <option key={a.id} value={a.id}>
                            Sunday Test #{idx + 1} — {new Date(a.endedAt || a.startedAt).toLocaleDateString()}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button
                    data-testid="continue-to-today-btn"
                    onClick={onContinueToToday}
                    className="px-4 py-2 rounded text-xs font-semibold bg-[#EAB308] text-[#0D0F12] hover:bg-[#CA8A04] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Continue to Today&apos;s Session</span>
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Report Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
                  <div className="text-[#8E98A8] text-[11px]">Accuracy</div>
                  <div className="text-base font-bold text-[#10B981] mt-0.5">
                    {weeklyReadout.accuracyPct}%
                  </div>
                  <div className="text-[10px] text-[#5C6675]">
                    {weeklyReadout.correctCount} / {weeklyReadout.totalItems} items
                  </div>
                </div>

                <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
                  <div className="text-[#8E98A8] text-[11px]">Time Spent</div>
                  <div className="text-base font-bold text-[#F1F5F9] mt-0.5">
                    {weeklyReadout.totalTimeMinutes}m
                  </div>
                  <div className="text-[10px] text-[#5C6675]">90 min hard limit</div>
                </div>

                <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
                  <div className="text-[#8E98A8] text-[11px]">Weaknesses Targeted</div>
                  <div className="text-base font-bold text-amber-400 mt-0.5">
                    {weeklyReadout.weaknessesTargeted.length}
                  </div>
                  <div className="text-[10px] text-[#5C6675]">Signals evaluated</div>
                </div>

                <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
                  <div className="text-[#8E98A8] text-[11px]">Retention Checks</div>
                  <div className="text-base font-bold text-[#38BDF8] mt-0.5">
                    {weeklyReadout.retentionChecks.length}
                  </div>
                  <div className="text-[10px] text-[#5C6675]">Level &ge; 3 domains</div>
                </div>
              </div>

              {/* Weaknesses Targeted Detail */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8E98A8]">
                  Weakness Signals Targeted in this Calibration
                </h4>
                {weeklyReadout.weaknessesTargeted.length > 0 ? (
                  <div className="space-y-2.5">
                    {weeklyReadout.weaknessesTargeted.map((wt: WeeklyAssessmentReadout['weaknessesTargeted'][number], idx: number) => (
                      <div
                        key={`${wt.domainId}-${wt.competency}-${idx}`}
                        className="bg-[#14171D] border border-[#262D38] rounded-md p-3.5 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="font-semibold uppercase tracking-wider text-[#F1F5F9]">
                            {wt.domainId} &middot; {wt.competency}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                              wt.status === 'resolved'
                                ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40'
                                : wt.status === 'reinforced'
                                ? 'bg-[#E55353]/20 text-[#E55353] border-[#E55353]/40'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}
                          >
                            {wt.status === 'resolved'
                              ? 'Resolved (Level Advanced)'
                              : wt.status === 'reinforced'
                              ? 'Reinforced (Persists)'
                              : 'Open'}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#8E98A8]">
                          Remediation: {wt.remediationAction}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#14171D] border border-[#262D38] rounded-md p-4 text-xs text-[#8E98A8]">
                    No active weakness signals were targeted in this test.
                  </div>
                )}
              </div>

              {/* Domain Results Snapshot */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8E98A8]">
                  Domain Results Snapshot
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {weeklyReadout.domainResults.map((dr: DomainAssessmentResult) => (
                    <div key={dr.domainId} className="bg-[#14171D] border border-[#262D38] rounded-md p-3.5 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold uppercase text-[#F1F5F9]">{dr.domainId}</span>
                        <span className="font-mono text-[#E5A93C]">Level {dr.level} / 5</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#8E98A8]">
                        <span>Ability: {dr.abilityScore}/100</span>
                        <span>{dr.coverage.topicsCovered}/{dr.coverage.topicsTotal} topics</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#14171D] border border-[#262D38] rounded-lg p-8 text-center space-y-2">
              <Clock className="size-8 text-[#5C6675] mx-auto" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-[#F1F5F9]">No Weekly Calibration Mini-Tests Logged Yet</h3>
              <p className="text-xs text-[#8E98A8] max-w-md mx-auto leading-relaxed">
                Sunday calibration tests are 90-minute adaptive evaluations conducted weekly to track longitudinal diagnostic progression. Click &quot;Start Sunday Mini-Test&quot; above to initiate an evaluation.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
