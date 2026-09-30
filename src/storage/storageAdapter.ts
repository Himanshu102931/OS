import type {
  TaskProgress,
  DSAProgress,
  TopicSkillState,
  CompanyOverlay,
  DailyCheckIn,
  DailyTaskAssignment,
  PlacementMode,
  UserSettings,
  PracticeAttempt,
  PreparationTopicProgress,
  DSAAttempt,
  EvidenceLog,
  TaskDefinition,
  AssessmentState,
  AssessmentResponse,
  AssessmentItemExposure,
  AssessmentProfile,
} from '../types';
import {
  TASK_PROGRESS,
  INITIAL_DSA_PROGRESS,
  INITIAL_SKILL_STATES,
} from '../data/seedData';

const STORAGE_KEY = 'placementos_v1_state';
// Recovery copy of a payload that failed hydration, written before the
// primary key is overwritten. Never read by the app — it exists so that
// persisted user progress is preserved rather than silently discarded.
const QUARANTINE_KEY = 'placementos_v1_state_quarantine';
const CURRENT_SCHEMA_VERSION = '1.0.0';
const CURRENT_APP_VERSION = '1.0.0';

/**
 * Copies an unreadable payload to a separate key before the primary key is
 * rewritten with defaults, so existing user progress stays recoverable.
 * Best effort: a failure here must never block recovery to a usable state.
 */
function quarantineUnreadableState(raw: string, reason: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(
      QUARANTINE_KEY,
      JSON.stringify({ quarantinedAt: new Date().toISOString(), reason, payload: raw }),
    );
  } catch {
    /* quota or serialization failure — ignore */
  }
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  placementHorizonDate: '2027-05-31',
  targetPlacementGoal: 'Software Engineer (SDE-1)',
  targetPhaseId: 'phase-1',
  dailyStudyMinutes: 120,
  dsaDailyCap: 5,
  placementMode: 'normal',
  theme: 'dark',
  densityMode: 'compact',
  showExplanationTooltips: true,
  dailyCheckInReminder: false,
  reminderTime: '20:00',
};

export interface AppStorageState {
  schemaVersion: string;
  appVersion: string;
  lastSavedAt: string;
  currentMode: PlacementMode;
  userSettings: UserSettings;
  taskProgress: Record<string, TaskProgress>;
  dsaProgress: Record<string, DSAProgress>;
  skillStates: Record<string, TopicSkillState>;
  companyOverlays: CompanyOverlay[];
  dailyCheckIns: DailyCheckIn[];
  dailyTaskAssignments: DailyTaskAssignment[];
  practiceAttempts?: PracticeAttempt[];
  preparationTopicProgress: Record<string, PreparationTopicProgress>;
  assessmentState?: AssessmentState;
}

/** Extended state with additional runtime fields */
export interface AppExtendedStorageState extends AppStorageState {
  customTaskDefinitions?: TaskDefinition[];
  dsaAttempts?: DSAAttempt[];
  evidenceLogs?: EvidenceLog[];
  // assessmentState is already optional in AppStorageState
}

/**
 * Creates default seed state object when no local storage state exists.
 *
 * CLEAN FIRST-RUN BASELINE (intentional):
 *   - taskProgress        -> every task `not_started`, zero activity
 *   - dsaProgress         -> every problem Box 1, zero attempts
 *   - skillStates         -> every skill `untested`, evidenceStrength 0
 *   - companyOverlays     -> [] (no demo companies)
 *   - evidence/collections-> empty
 * Curriculum metadata (phases, modules, topics, DSA problems, preparation
 * content) is NOT held in storage — it lives in `src/data` and is therefore
 * never affected by this baseline.
 *
 * SCHEMA-COMPATIBILITY DECISION (AGENTS.md "Extend storage schema"):
 * `CURRENT_SCHEMA_VERSION` is deliberately left at '1.0.0'. This change alters
 * only the DEFAULT VALUES used for a fresh install, not the shape of
 * `AppStorageState` — no field was added, removed or renamed — so it is not a
 * breaking schema change. Existing stored state still hydrates, and
 * `loadState()` merges it with the user's values taking precedence, so no
 * persisted progress is discarded. Bumping the version here would be the
 * breaking move instead: `validateImportState()` requires an exact version
 * match and would reject every backup exported before this change.
 */
export function getDefaultStorageState(): AppStorageState {
  // Clean task progress: all tasks start as not_started with zero activity
  const taskProgressMap: Record<string, TaskProgress> = {};
  TASK_PROGRESS.forEach((tp) => {
    taskProgressMap[tp.taskId] = {
      taskId: tp.taskId,
      state: 'not_started',
      postponeCount: 0,
      skipCount: 0,
      timeSpentMinutes: 0,
      updatedAt: new Date().toISOString(),
    };
  });

  // Clean DSA progress: all problems start at Box 1 with zero attempts
  const dsaProgressMap: Record<string, DSAProgress> = {};
  INITIAL_DSA_PROGRESS.forEach((dp) => {
    dsaProgressMap[dp.problemId] = {
      problemId: dp.problemId,
      currentBox: 1,
      attemptCount: 0,
      passedIndependently: false,
      consecutiveAssistedPasses: 0,
      assistedProvisional: false,
      consecutiveFailures: 0,
      remediationRequired: false,
      patternLessonViewed: false,
      patternLessonCompleted: false,
      remediationSelfCheckPassed: false,
      evidenceStrength: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  // Clean skill states: all topics start as untested with zero evidence
  const skillStateMap: Record<string, TopicSkillState> = {};
  INITIAL_SKILL_STATES.forEach((sk) => {
    skillStateMap[sk.topicId] = {
      topicId: sk.topicId,
      domainId: sk.domainId,
      freshness: 'untested',
      evidenceStrength: 0,
      lastPracticedAt: undefined,
    };
  });

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    appVersion: CURRENT_APP_VERSION,
    lastSavedAt: new Date().toISOString(),
    currentMode: 'normal',
    userSettings: DEFAULT_USER_SETTINGS,
    taskProgress: taskProgressMap,
    dsaProgress: dsaProgressMap,
    skillStates: skillStateMap,
    companyOverlays: [],
    dailyCheckIns: [],
    dailyTaskAssignments: [],
    practiceAttempts: [],
    preparationTopicProgress: {},
    assessmentState: undefined,
  };
}

/**
 * Lenient validation for loadState - allows missing optional fields,
 * only checks bare minimum required for safe merging with defaults.
 */
export function validateStorageState(data: unknown): data is Partial<AppExtendedStorageState> {
  if (!data || typeof data !== 'object') return false;
  const state = data as Partial<AppExtendedStorageState>;

  // Required top-level fields for safe merging
  if (typeof state.schemaVersion !== 'string') return false;
  // Hydration is intentionally version-lenient: whatever build wrote the
  // stored payload must still be readable, so no version gate is applied
  // here. Version ENFORCEMENT lives in validateImportState() (strict,
  // exact match) — that is the path that replaces user state from an
  // external file, where an unsupported version must be rejected.

  if (!state.taskProgress || typeof state.taskProgress !== 'object') return false;
  if (!state.dsaProgress || typeof state.dsaProgress !== 'object') return false;
  if (!state.skillStates || typeof state.skillStates !== 'object') return false;
  if (!Array.isArray(state.companyOverlays)) return false;

  // Optional arrays/objects - if present, must be correct type
  if (state.dailyCheckIns !== undefined && !Array.isArray(state.dailyCheckIns)) return false;
  if (state.dailyTaskAssignments !== undefined && !Array.isArray(state.dailyTaskAssignments)) return false;
  if (state.preparationTopicProgress !== undefined && typeof state.preparationTopicProgress !== 'object') return false;
  if (state.practiceAttempts !== undefined && !Array.isArray(state.practiceAttempts)) return false;
  if (state.dsaAttempts !== undefined && !Array.isArray(state.dsaAttempts)) return false;
  if (state.evidenceLogs !== undefined && !Array.isArray(state.evidenceLogs)) return false;
  if (state.customTaskDefinitions !== undefined && !Array.isArray(state.customTaskDefinitions)) return false;
  if (state.assessmentState !== undefined && !validateAssessmentState(state.assessmentState)) return false;

  // userSettings is optional for lenient validation - will be merged with defaults
  if (state.userSettings !== undefined && typeof state.userSettings !== 'object') return false;

  // appVersion, lastSavedAt, currentMode - if present, must be string
  if (state.appVersion !== undefined && typeof state.appVersion !== 'string') return false;
  if (state.lastSavedAt !== undefined && typeof state.lastSavedAt !== 'string') return false;
  if (state.currentMode !== undefined && typeof state.currentMode !== 'string') return false;

  return true;
}

/**
 * Strict validation for imports - requires all AppStorageState fields,
 * validates nested structures and field types thoroughly.
 */
export function validateImportState(data: unknown): data is AppExtendedStorageState {
  if (!data || typeof data !== 'object') return false;
  const state = data as Partial<AppExtendedStorageState>;

  // Required top-level fields
  if (typeof state.schemaVersion !== 'string') return false;
  if (state.schemaVersion !== CURRENT_SCHEMA_VERSION) return false; // Only accept current version

  if (!state.userSettings || typeof state.userSettings !== 'object') return false;
  if (!validateUserSettings(state.userSettings)) return false;

  if (!state.taskProgress || typeof state.taskProgress !== 'object') return false;
  if (!validateTaskProgress(state.taskProgress)) return false;

  if (!state.dsaProgress || typeof state.dsaProgress !== 'object') return false;
  if (!validateDSAProgress(state.dsaProgress)) return false;

  if (!state.skillStates || typeof state.skillStates !== 'object') return false;
  if (!validateSkillStates(state.skillStates)) return false;

  if (!Array.isArray(state.companyOverlays)) return false;
  if (!validateCompanyOverlays(state.companyOverlays)) return false;

  if (!Array.isArray(state.dailyCheckIns)) return false;
  if (!validateDailyCheckIns(state.dailyCheckIns)) return false;

  if (!Array.isArray(state.dailyTaskAssignments)) return false;
  if (!validateDailyTaskAssignments(state.dailyTaskAssignments)) return false;

  if (state.preparationTopicProgress !== undefined) {
    if (typeof state.preparationTopicProgress !== 'object') return false;
    if (!validatePreparationTopicProgress(state.preparationTopicProgress)) return false;
  }

  if (state.practiceAttempts !== undefined) {
    if (!Array.isArray(state.practiceAttempts)) return false;
    for (const attempt of state.practiceAttempts) {
      if (!attempt || typeof attempt !== 'object') return false;
      if (typeof attempt.id !== 'string') return false;
      if (typeof attempt.sessionId !== 'string') return false;
      if (typeof attempt.date !== 'string') return false;
      if (typeof attempt.completedAt !== 'string') return false;
    }
  }

  if (state.dsaAttempts !== undefined) {
    if (!Array.isArray(state.dsaAttempts)) return false;
    for (const attempt of state.dsaAttempts) {
      if (!attempt || typeof attempt !== 'object') return false;
      if (typeof attempt.id !== 'string') return false;
      if (typeof attempt.problemId !== 'string') return false;
      if (typeof attempt.date !== 'string') return false;
      if (typeof attempt.result !== 'string') return false;
      if (typeof attempt.assistanceLevel !== 'string') return false;
      if (typeof attempt.timeTakenMinutes !== 'number') return false;
    }
  }

  if (state.evidenceLogs !== undefined) {
    if (!Array.isArray(state.evidenceLogs)) return false;
    for (const log of state.evidenceLogs) {
      if (!log || typeof log !== 'object') return false;
      if (typeof log.id !== 'string') return false;
      if (typeof log.topicId !== 'string') return false;
      if (typeof log.domainId !== 'string') return false;
      if (typeof log.score !== 'number') return false;
      if (typeof log.confidence !== 'number') return false;
      if (typeof log.timestamp !== 'string') return false;
      if (typeof log.sourceType !== 'string') return false;
      if (typeof log.sourceId !== 'string') return false;
    }
  }

  if (state.customTaskDefinitions !== undefined) {
    if (!Array.isArray(state.customTaskDefinitions)) return false;
    for (const task of state.customTaskDefinitions) {
      if (!task || typeof task !== 'object') return false;
      if (typeof task.id !== 'string') return false;
      if (typeof task.title !== 'string') return false;
      if (typeof task.domainId !== 'string') return false;
      if (typeof task.topicId !== 'string') return false;
      if (typeof task.phaseId !== 'string') return false;
      if (typeof task.estimatedMinutes !== 'number') return false;
      if (typeof task.importance !== 'number') return false;
      if (typeof task.taskType !== 'string') return false;
      if (typeof task.createdAt !== 'string') return false;
    }
  }

  if (state.assessmentState !== undefined) {
    if (!validateAssessmentState(state.assessmentState)) return false;
  }

  // appVersion and lastSavedAt are validated as strings if present
  if (state.appVersion !== undefined && typeof state.appVersion !== 'string') return false;
  if (state.lastSavedAt !== undefined && typeof state.lastSavedAt !== 'string') return false;
  if (state.currentMode !== undefined && typeof state.currentMode !== 'string') return false;

  return true;
}

function validateUserSettings(settings: unknown): settings is UserSettings {
  if (!settings || typeof settings !== 'object') return false;
  const s = settings as Partial<UserSettings>;
  return (
    typeof s.placementHorizonDate === 'string' &&
    typeof s.targetPlacementGoal === 'string' &&
    typeof s.targetPhaseId === 'string' &&
    typeof s.dailyStudyMinutes === 'number' &&
    typeof s.dsaDailyCap === 'number' &&
    typeof s.placementMode === 'string' &&
    typeof s.theme === 'string' &&
    typeof s.densityMode === 'string' &&
    typeof s.showExplanationTooltips === 'boolean' &&
    typeof s.dailyCheckInReminder === 'boolean' &&
    typeof s.reminderTime === 'string'
  );
}

function validateTaskProgress(progress: Record<string, unknown>): boolean {
  for (const [, value] of Object.entries(progress)) {
    if (!value || typeof value !== 'object') return false;
    const tp = value as Partial<TaskProgress>;
    if (typeof tp.taskId !== 'string') return false;
    if (typeof tp.state !== 'string') return false;
    if (!['not_started', 'in_progress', 'completed', 'archived'].includes(tp.state)) return false;
    if (typeof tp.postponeCount !== 'number') return false;
    if (typeof tp.skipCount !== 'number') return false;
    if (typeof tp.timeSpentMinutes !== 'number') return false;
    if (typeof tp.updatedAt !== 'string') return false;
    if (tp.postponedUntil !== undefined && typeof tp.postponedUntil !== 'string') return false;
    if (tp.lastCompletedAt !== undefined && typeof tp.lastCompletedAt !== 'string') return false;
  }
  return true;
}

function validateDSAProgress(progress: Record<string, unknown>): boolean {
  for (const [, value] of Object.entries(progress)) {
    if (!value || typeof value !== 'object') return false;
    const dp = value as Partial<DSAProgress>;
    if (typeof dp.problemId !== 'string') return false;
    if (typeof dp.currentBox !== 'number') return false;
    if (dp.currentBox < 1 || dp.currentBox > 4) return false;
    if (typeof dp.attemptCount !== 'number') return false;
    if (typeof dp.createdAt !== 'string') return false;
    if (typeof dp.updatedAt !== 'string') return false;
    // Optional fields - just check types if present
    if (dp.nextReviewAt !== undefined && typeof dp.nextReviewAt !== 'string') return false;
    if (dp.lastAttemptAt !== undefined && typeof dp.lastAttemptAt !== 'string') return false;
    if (dp.totalAttempts !== undefined && typeof dp.totalAttempts !== 'number') return false;
    if (dp.successfulAttempts !== undefined && typeof dp.successfulAttempts !== 'number') return false;
    if (dp.passedIndependently !== undefined && typeof dp.passedIndependently !== 'boolean') return false;
    if (dp.consecutiveAssistedPasses !== undefined && typeof dp.consecutiveAssistedPasses !== 'number') return false;
    if (dp.assistedProvisional !== undefined && typeof dp.assistedProvisional !== 'boolean') return false;
    if (dp.consecutiveFailures !== undefined && typeof dp.consecutiveFailures !== 'number') return false;
    if (dp.remediationRequired !== undefined && typeof dp.remediationRequired !== 'boolean') return false;
    if (dp.patternLessonViewed !== undefined && typeof dp.patternLessonViewed !== 'boolean') return false;
    if (dp.patternLessonCompleted !== undefined && typeof dp.patternLessonCompleted !== 'boolean') return false;
    if (dp.remediationSelfCheckPassed !== undefined && typeof dp.remediationSelfCheckPassed !== 'boolean') return false;
    if (dp.evidenceStrength !== undefined && typeof dp.evidenceStrength !== 'number') return false;
    if (dp.notes !== undefined && typeof dp.notes !== 'string') return false;
  }
  return true;
}

function validateSkillStates(states: Record<string, unknown>): boolean {
  for (const [, value] of Object.entries(states)) {
    if (!value || typeof value !== 'object') return false;
    const ss = value as Partial<TopicSkillState>;
    if (typeof ss.topicId !== 'string') return false;
    if (typeof ss.domainId !== 'string') return false;
    if (typeof ss.freshness !== 'string') return false;
    if (!['untested', 'fresh', 'aging', 'stale'].includes(ss.freshness)) return false;
    if (typeof ss.evidenceStrength !== 'number') return false;
    if (ss.lastPracticedAt !== undefined && typeof ss.lastPracticedAt !== 'string') return false;
  }
  return true;
}

function validateCompanyOverlays(overlays: unknown[]): boolean {
  for (const overlay of overlays) {
    if (!overlay || typeof overlay !== 'object') return false;
    const co = overlay as Partial<CompanyOverlay>;
    if (typeof co.id !== 'string') return false;
    if (typeof co.companyName !== 'string') return false;
    if (typeof co.targetRole !== 'string') return false;
    if (typeof co.applicationStatus !== 'string') return false;
    if (!['target', 'applied', 'oa_scheduled', 'interview_scheduled', 'rejected', 'offered', 'archived'].includes(co.applicationStatus)) return false;
    if (!Array.isArray(co.requiredDomains)) return false;
    if (!Array.isArray(co.requiredTopics)) return false;
    if (!Array.isArray(co.requiredLanguages)) return false;
    if (co.eventDate !== undefined && typeof co.eventDate !== 'string') return false;
  }
  return true;
}

function validateDailyCheckIns(checkIns: unknown[]): boolean {
  for (const ci of checkIns) {
    if (!ci || typeof ci !== 'object') return false;
    const dci = ci as Partial<DailyCheckIn>;
    if (typeof dci.id !== 'string') return false;
    if (typeof dci.date !== 'string') return false;
    if (typeof dci.mode !== 'string') return false;
    if (typeof dci.availableMinutes !== 'number') return false;
    if (typeof dci.energyLevel !== 'string') return false;
    if (!['low', 'medium', 'high'].includes(dci.energyLevel)) return false;
    if (!Array.isArray(dci.assignmentIds)) return false;
    if (typeof dci.totalActualMinutes !== 'number') return false;
    if (typeof dci.isSealed !== 'boolean') return false;
    if (typeof dci.createdAt !== 'string') return false;
    if (typeof dci.updatedAt !== 'string') return false;
    if (dci.notes !== undefined && typeof dci.notes !== 'string') return false;
    if (dci.sealedAt !== undefined && typeof dci.sealedAt !== 'string') return false;
  }
  return true;
}

function validateDailyTaskAssignments(assignments: unknown[]): boolean {
  for (const a of assignments) {
    if (!a || typeof a !== 'object') return false;
    const dta = a as Partial<DailyTaskAssignment>;
    if (typeof dta.id !== 'string') return false;
    if (typeof dta.date !== 'string') return false;
    if (typeof dta.taskType !== 'string') return false;
    if (!['catalog_task', 'dsa_review', 'dsa_new'].includes(dta.taskType)) return false;
    if (typeof dta.referenceId !== 'string') return false;
    if (typeof dta.allocatedMinutes !== 'number') return false;
    if (typeof dta.completed !== 'boolean') return false;
    if (dta.actualMinutes !== undefined && typeof dta.actualMinutes !== 'number') return false;
  }
  return true;
}

function validatePreparationTopicProgress(progress: Record<string, unknown>): boolean {
  for (const [, value] of Object.entries(progress)) {
    if (!value || typeof value !== 'object') return false;
    const ptp = value as Partial<PreparationTopicProgress>;
    if (typeof ptp.topicId !== 'string') return false;
    if (typeof ptp.sectionId !== 'string') return false;
    if (typeof ptp.domainId !== 'string') return false;
    if (typeof ptp.currentStage !== 'string') return false;
    if (!Array.isArray(ptp.completedStages)) return false;
    if (typeof ptp.stageProgress !== 'object') return false;
    if (typeof ptp.lastAccessedAt !== 'string') return false;
    if (typeof ptp.totalTimeSpentMinutes !== 'number') return false;
    if (typeof ptp.evidenceStrength !== 'number') return false;
    if (typeof ptp.freshness !== 'string') return false;
    if (typeof ptp.createdAt !== 'string') return false;
    if (typeof ptp.updatedAt !== 'string') return false;
  }
  return true;
}

function validateAssessmentState(state: unknown): state is AssessmentState {
  if (!state || typeof state !== 'object') return false;
  const s = state as Partial<AssessmentState>;

  if (s.attempts !== undefined) {
    if (!Array.isArray(s.attempts)) return false;
    for (const attempt of s.attempts) {
      if (!attempt || typeof attempt !== 'object') return false;
      if (typeof attempt.id !== 'string') return false;
      if (typeof attempt.definitionId !== 'string') return false;
      if (typeof attempt.definitionVersion !== 'number') return false;
      if (typeof attempt.kind !== 'string') return false;
      if (!['diagnostic_assessment', 'weekly_assessment', 'full_reassessment'].includes(attempt.kind)) return false;
      if (typeof attempt.status !== 'string') return false;
      if (!['in_progress', 'submitted', 'auto_submitted', 'abandoned'].includes(attempt.status)) return false;
      if (typeof attempt.startedAt !== 'string') return false;
      if (typeof attempt.timeLimitSeconds !== 'number') return false;
      if (typeof attempt.seed !== 'string') return false;
      if (!Array.isArray(attempt.selectedItemIds)) return false;
    }
  }

  if (s.responses !== undefined) {
    if (!Array.isArray(s.responses)) return false;
    for (const response of s.responses) {
      if (!response || typeof response !== 'object') return false;
      if (typeof response.id !== 'string') return false;
      if (typeof response.attemptId !== 'string') return false;
      if (typeof response.itemId !== 'string') return false;
      if (typeof response.response !== 'number' && typeof response.response !== 'string') return false;
      if (typeof response.result !== 'string') return false;
      if (!['correct', 'incorrect', 'dont_know', 'unanswered'].includes(response.result)) return false;
      if (typeof response.timeSpentSeconds !== 'number') return false;
      if (!Array.isArray(response.errorCategories)) return false;
      if (typeof response.scoredCredit !== 'number') return false;
      if (typeof response.weightApplied !== 'number') return false;
    }
  }

  if (s.exposures !== undefined) {
    if (typeof s.exposures !== 'object') return false;
    for (const [, exposure] of Object.entries(s.exposures)) {
      if (!exposure || typeof exposure !== 'object') return false;
      const exp = exposure as Partial<AssessmentItemExposure>;
      if (typeof exp.itemId !== 'string') return false;
      if (typeof exp.exposureCount !== 'number') return false;
      if (typeof exp.lastSeenAt !== 'string') return false;
      if (typeof exp.lastAttemptId !== 'string') return false;
      if (typeof exp.lastResult !== 'string') return false;
      if (!Array.isArray(exp.previousAssessmentUsage)) return false;
      if (typeof exp.estimationUses !== 'number') return false;
      if (typeof exp.eligibleForFutureEstimation !== 'boolean') return false;
      if (typeof exp.releasedToPractice !== 'boolean') return false;
    }
  }

  if (s.domainResults !== undefined) {
    if (!Array.isArray(s.domainResults)) return false;
    for (const result of s.domainResults) {
      if (!result || typeof result !== 'object') return false;
      if (typeof result.domainId !== 'string') return false;
      if (typeof result.abilityScore !== 'number') return false;
      if (typeof result.level !== 'number') return false;
      if (![0, 1, 2, 3, 4, 5].includes(result.level)) return false;
      if (typeof result.confidence !== 'string') return false;
      if (!['none', 'low', 'medium', 'high'].includes(result.confidence)) return false;
      if (typeof result.status !== 'string') return false;
      if (!['assessed', 'partially_assessed', 'unassessed'].includes(result.status)) return false;
      if (typeof result.assessmentDate !== 'string') return false;
      if (typeof result.provisional !== 'boolean') return false;
      if (typeof result.attemptId !== 'string') return false;
      if (typeof result.kind !== 'string') return false;
      if (!['diagnostic_assessment', 'weekly_assessment', 'full_reassessment'].includes(result.kind)) return false;
    }
  }

  if (s.snapshots !== undefined) {
    if (!Array.isArray(s.snapshots)) return false;
    for (const snapshot of s.snapshots) {
      if (!snapshot || typeof snapshot !== 'object') return false;
      if (typeof snapshot.id !== 'string') return false;
      if (typeof snapshot.takenAt !== 'string') return false;
      if (typeof snapshot.kind !== 'string') return false;
      if (!['diagnostic_assessment', 'weekly_assessment', 'full_reassessment'].includes(snapshot.kind)) return false;
      if (typeof snapshot.trigger !== 'string') return false;
      if (!['scheduled', 'manual', 'post_baseline'].includes(snapshot.trigger)) return false;
      if (!Array.isArray(snapshot.domainResults)) return false;
    }
  }

  if (s.weaknessSignals !== undefined) {
    if (!Array.isArray(s.weaknessSignals)) return false;
    for (const signal of s.weaknessSignals) {
      if (!signal || typeof signal !== 'object') return false;
      if (typeof signal.id !== 'string') return false;
      if (typeof signal.domainId !== 'string') return false;
      if (typeof signal.strength !== 'number') return false;
      if (![1, 2, 3].includes(signal.strength)) return false;
      if (typeof signal.status !== 'string') return false;
      if (!['open', 'reinforced', 'resolved'].includes(signal.status)) return false;
      if (typeof signal.firstSeenAt !== 'string') return false;
      if (typeof signal.lastSeenAt !== 'string') return false;
      if (typeof signal.occurrences !== 'number') return false;
      if (!Array.isArray(signal.sourceAttemptIds)) return false;
    }
  }

  if (s.profile !== undefined) {
    if (typeof s.profile !== 'object') return false;
    const p = s.profile as Partial<AssessmentProfile>;
    if (p.baselineCompletedAt !== undefined && typeof p.baselineCompletedAt !== 'string') return false;
    if (p.lastSundayAt !== undefined && typeof p.lastSundayAt !== 'string') return false;
    if (typeof p.pendingSunday !== 'boolean') return false;
    if (p.nextReassessmentSuggestedAt !== undefined && typeof p.nextReassessmentSuggestedAt !== 'string') return false;
  }

  return true;
}

/**
 * Prunes assessment raw responses per retention policy:
 * - Keeps full responses for the most recent 12 attempts
 * - Older attempts collapse to DomainAssessmentResult + snapshot summary
 * - Raw responses older than 90 days are dropped
 * - Snapshots are never pruned
 */
export function pruneAssessmentResponses(state: AssessmentState): AssessmentState {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Group responses by attemptId
  const responsesByAttempt = new Map<string, AssessmentResponse[]>();
  for (const response of state.responses) {
    const list = responsesByAttempt.get(response.attemptId) || [];
    list.push(response);
    responsesByAttempt.set(response.attemptId, list);
  }

  // Sort attempts by start time (newest first)
  const attemptsSorted = [...state.attempts].sort((a, b) =>
    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  const keepFullAttemptIds = new Set(attemptsSorted.slice(0, 12).map((a) => a.id));
  const prunedResponses: AssessmentResponse[] = [];

  for (const [attemptId, responses] of responsesByAttempt) {
    if (keepFullAttemptIds.has(attemptId)) {
      // Keep full responses for recent 12 attempts
      prunedResponses.push(...responses);
    } else {
      // Check if attempt is older than 90 days
      const attempt = state.attempts.find((a) => a.id === attemptId);
      const attemptDate = attempt ? new Date(attempt.startedAt) : new Date(0);
      if (attemptDate < ninetyDaysAgo) {
        // Drop raw responses beyond 90 days - they're already represented in domainResults/snapshots
        continue;
      }
      // Keep responses for attempts within 90 days but beyond 12 most recent
      prunedResponses.push(...responses);
    }
  }

  return {
    ...state,
    responses: prunedResponses,
  };
}

export function applyAssessmentPruning(state: AppStorageState): AppStorageState {
  if (!state.assessmentState) return state;
  return {
    ...state,
    assessmentState: pruneAssessmentResponses(state.assessmentState),
  };
}

/**
 * LocalStorage Adapter offering safe serialization, hydration, export, and reset capabilities.
 */
export const StorageAdapter = {
  /**
   * Reads and hydrates user state from browser localStorage.
   * Falls back gracefully to baseline seed defaults if corrupted or missing.
   */
  loadState(): AppStorageState {
    let raw: string | null = null;
    try {
      if (typeof localStorage === 'undefined') {
        return getDefaultStorageState();
      }

      raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const defaults = getDefaultStorageState();
        this.saveState(defaults);
        return defaults;
      }

      const parsed = JSON.parse(raw);

      if (validateStorageState(parsed)) {
        const defaults = getDefaultStorageState();
        const mergedTaskProgress = { ...defaults.taskProgress, ...parsed.taskProgress };
        const mergedSkillStates = { ...defaults.skillStates, ...parsed.skillStates };

        // parsed.dsaProgress is guaranteed to exist by validateStorageState
        const userDsaProgress = parsed.dsaProgress as Record<string, DSAProgress>;

        const mergedDsaProgress: Record<string, DSAProgress> = {};
        Object.keys(defaults.dsaProgress).forEach((probId) => {
          const defaultItem = defaults.dsaProgress[probId];
          const userItem = userDsaProgress[probId];
          if (userItem) {
            mergedDsaProgress[probId] = {
              ...defaultItem,
              ...userItem,
              currentBox: userItem.currentBox ?? defaultItem.currentBox,
              attemptCount: userItem.attemptCount ?? defaultItem.attemptCount,
              passedIndependently: userItem.passedIndependently ?? defaultItem.passedIndependently ?? false,
              consecutiveAssistedPasses: userItem.consecutiveAssistedPasses ?? defaultItem.consecutiveAssistedPasses ?? 0,
              assistedProvisional: userItem.assistedProvisional ?? defaultItem.assistedProvisional ?? false,
              consecutiveFailures: userItem.consecutiveFailures ?? defaultItem.consecutiveFailures ?? 0,
              remediationRequired: userItem.remediationRequired ?? defaultItem.remediationRequired ?? false,
              patternLessonViewed: userItem.patternLessonViewed ?? defaultItem.patternLessonViewed ?? false,
              patternLessonCompleted: userItem.patternLessonCompleted ?? defaultItem.patternLessonCompleted ?? false,
              remediationSelfCheckPassed: userItem.remediationSelfCheckPassed ?? defaultItem.remediationSelfCheckPassed ?? false,
            };
          } else {
            mergedDsaProgress[probId] = defaultItem;
          }
        });

        // parsed is guaranteed to have required fields by validateStorageState
        const validatedParsed = parsed as AppExtendedStorageState;

        // Merge with defaults (AGENTS.md storage step 3). User values always
        // win over the clean baseline; defaults only fill fields a pre-change
        // payload predates, so a legacy backup hydrates complete instead of
        // leaving `undefined` collections that downstream `.filter/.map`
        // would crash on. Nothing stored is dropped.
        const migratedState: AppExtendedStorageState = {
          ...validatedParsed,
          userSettings: {
            ...DEFAULT_USER_SETTINGS,
            ...(validatedParsed.userSettings || {}),
          },
          taskProgress: mergedTaskProgress,
          skillStates: mergedSkillStates,
          dsaProgress: mergedDsaProgress,
          companyOverlays: validatedParsed.companyOverlays || [],
          dailyCheckIns: validatedParsed.dailyCheckIns || [],
          dailyTaskAssignments: validatedParsed.dailyTaskAssignments || [],
          practiceAttempts: validatedParsed.practiceAttempts || [],
          preparationTopicProgress: validatedParsed.preparationTopicProgress || {},
          dsaAttempts: validatedParsed.dsaAttempts || [],
          evidenceLogs: validatedParsed.evidenceLogs || [],
          customTaskDefinitions: validatedParsed.customTaskDefinitions || [],
          assessmentState: validatedParsed.assessmentState,
        };
        this.saveState(migratedState);
        return migratedState;
      } else {
        console.warn(
          '[PlacementOS] Local storage data failed integrity check. ' +
            'Reverting to baseline default state; the unreadable payload was ' +
            'preserved under a quarantine key instead of being discarded.',
        );
        quarantineUnreadableState(raw, 'failed integrity check');
        const defaults = getDefaultStorageState();
        this.saveState(defaults);
        return defaults;
      }
    } catch (err) {
      console.error('[PlacementOS] Failed to read from localStorage:', err);
      if (raw) quarantineUnreadableState(raw, 'unreadable payload');
      return getDefaultStorageState();
    }
  },

  /**
   * Persists current state object to localStorage safely.
   */
  saveState(state: AppStorageState): boolean {
    try {
      if (typeof localStorage === 'undefined') return true;

      const payload: AppStorageState = {
        ...state,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        appVersion: CURRENT_APP_VERSION,
        lastSavedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return true;
    } catch (err) {
      console.error('[PlacementOS] Failed to save state to localStorage:', err);
      return false;
    }
  },

  /**
   * Calculates size of stored JSON string in bytes.
   */
  getStorageBytes(): number {
    try {
      if (typeof localStorage === 'undefined') return 0;
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? new Blob([raw]).size : 0;
    } catch {
      return 0;
    }
  },

  /**
   * Clears stored JSON state in localStorage.
   */
  clearState(): boolean {
    try {
      if (typeof localStorage === 'undefined') return true;
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (err) {
      console.error('[PlacementOS] Failed to clear localStorage state:', err);
      return false;
    }
  },

  /**
   * Exports state object to formatted JSON string.
   */
  exportJSON(state: AppStorageState): string {
    return JSON.stringify(state, null, 2);
  },

  /**
   * Imports state from JSON string with strict validation.
   */
  importJSON(jsonString: string): { success: boolean; state?: AppExtendedStorageState; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (validateImportState(parsed)) {
        const migratedState: AppExtendedStorageState = {
          ...parsed,
          userSettings: {
            ...DEFAULT_USER_SETTINGS,
            ...(parsed.userSettings || {}),
          },
          practiceAttempts: parsed.practiceAttempts || [],
          preparationTopicProgress: parsed.preparationTopicProgress || {},
          assessmentState: parsed.assessmentState,
        };
        this.saveState(migratedState);
        return { success: true, state: migratedState };
      }
      return { success: false, error: 'Invalid backup format or missing schema properties' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse JSON string';
      return { success: false, error: msg };
    }
  },

  /**
   * Resets local storage state to defaults.
   */
  resetState(): AppStorageState {
    const defaults = getDefaultStorageState();
    this.saveState(defaults);
    return defaults;
  },

  /**
   * Validates storage state (exported for testing).
   */
  validateStorageState,

  /**
   * Validates import state strictly (exported for testing).
   */
  validateImportState,

  /**
   * Validates assessment state structure (exported for testing).
   */
  validateAssessmentState,

  /**
   * Prunes assessment raw responses per retention policy (exported for testing).
   */
  pruneAssessmentResponses,

  /**
   * Applies assessment pruning to full app state (exported for testing).
   */
  applyAssessmentPruning,
};
