// PlacementOS Core Domain Data Models (V1 Specification)

export type DomainId =
  | 'python'
  | 'dsa'
  | 'sql'
  | 'oop'
  | 'dbms'
  | 'os'
  | 'cn'
  | 'aptitude'
  | 'communication'
  | 'projects'
  | 'interviews';

export interface DomainDefinition {
  id: DomainId;
  name: string;
  shortName: string;
  description: string;
  iconName: string;
  color: string;
}

// --- Curriculum Types (Immutable Domain Specifications) ---

export interface Phase {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  description: string;
  order: number;
}

export interface Module {
  id: string;
  phaseId: string;
  domainId: DomainId;
  name: string;
  description: string;
  targetDate?: string;
  order: number;
}

export interface TopicEducationalMetadata {
  overview?: string;
  whyItMatters?: string;
  learningObjectives?: string[];
  successCriteria?: string[];
}

export interface Topic {
  id: string;
  moduleId: string;
  domainId: DomainId;
  name: string;
  description: string;
  targetDate?: string;
  importance: number; // 1 - 10 scale
  educationalMetadata?: TopicEducationalMetadata;
}

export interface TaskLearningMetadata {
  learningSteps?: string[];
  primaryResource?: { title: string; url?: string; type?: string };
  supportingResources?: { title: string; url?: string; type?: string }[];
  practiceItems?: string[];
  selfCheckQuestions?: string[];
  completionCriteria?: string[];
  evidenceType?: string;
}

export interface TaskDefinition {
  id: string;
  title: string;
  description: string;
  domainId: DomainId;
  topicId: string;
  phaseId: string;
  estimatedMinutes: number;
  importance: number; // 1 - 10 scale
  taskType: 'learning' | 'practice' | 'review' | 'assessment' | 'project';
  languageTags?: string[];
  prerequisiteTaskDefinitionIds?: string[];
  parentTaskId?: string;
  dueDate?: string; // YYYY-MM-DD
  createdAt: string;
  learningMetadata?: TaskLearningMetadata;
}

export type AccessTier = 'FREE' | 'PREMIUM' | 'UNKNOWN';
export type ProgressionTier = 'STARTER' | 'CORE' | 'CHALLENGE';
export type LeitnerBox = 1 | 2 | 3 | 4;
export type AttemptResult = 'pass' | 'partial' | 'fail';
export type AssistanceLevel = 'none' | 'hint' | 'solution';
export type SelfCheckRating = 'correct' | 'incorrect' | 'unsure';

export interface LearningHint {
  whatToRecognize: string;
  keyIdea: string;
  commonTrap: string;
}

export interface DSAProblem {
  id: string; // 'dsa-001' .. 'dsa-150'
  leetcodeNumber: number;
  title: string;
  domainId: DomainId;
  topicId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  leetcodeUrl: string;
  accessTier: AccessTier;
  alternativeResourceUrl?: string;
  primaryPattern: string;
  secondaryPatterns?: string[];
  dataStructure: string;
  algorithmicTechnique: string;
  /**
   * Scheduling phase, not teaching phase: the earliest roadmap phase in which
   * this individual problem is recommended to be attempted (1..4). It gates
   * problem availability in `dsaEngine` ("Locked until Phase N").
   *
   * It is intentionally allowed to differ from the teaching phase of the
   * problem's topic/module: a topic may be taught in one phase while its
   * practice problems are scheduled earlier or later. `topicId` locates where
   * the problem is taught; `recommendedPhase` locates when it is unlocked.
   */
  recommendedPhase: number;
  progressionTier: ProgressionTier;
  prerequisites: string[]; // Problem IDs
  isAnchor: boolean;
  estimatedTimeMinutes: number;
  learningHint?: LearningHint;
}

// --- Mutable Runtime State Types ---

export interface TaskProgress {
  taskId: string; // References TaskDefinition.id
  state: 'not_started' | 'in_progress' | 'completed' | 'archived';
  postponedUntil?: string; // YYYY-MM-DD
  postponeCount: number;
  skipCount: number;
  lastCompletedAt?: string; // ISO timestamp
  timeSpentMinutes: number;
  updatedAt: string;
}

export interface DSAProgress {
  problemId: string;
  currentBox: LeitnerBox;
  nextReviewAt?: string; // YYYY-MM-DD
  lastAttemptAt?: string; // ISO timestamp
  attemptCount: number;
  totalAttempts?: number;
  successfulAttempts?: number;
  passedIndependently?: boolean;
  consecutiveAssistedPasses?: number;
  assistedProvisional?: boolean;
  consecutiveFailures?: number;
  remediationRequired?: boolean;
  patternLessonViewed?: boolean;
  patternLessonCompleted?: boolean;
  remediationSelfCheckPassed?: boolean;
  evidenceStrength?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type SkillFreshnessState = 'untested' | 'fresh' | 'aging' | 'stale';

export interface UserSettings {
  placementHorizonDate: string; // YYYY-MM-DD
  targetPlacementGoal: string;
  targetPhaseId: string;
  dailyStudyMinutes: number; // 30 - 480
  dsaDailyCap: number; // 1 - 15
  placementMode: PlacementMode;
  theme: 'dark' | 'high_contrast' | 'slate_dark';
  densityMode: 'compact' | 'comfortable';
  showExplanationTooltips: boolean;
  dailyCheckInReminder: boolean;
  reminderTime: string; // HH:mm format
}

/**
 * An explicit rating the user saved through the skill override UI.
 *
 * This is the only thing that may ever be presented as a "Manual Rating
 * Override". Automatic writers (task completion, DSA attempt, practice attempt,
 * day sealing) read and spread the parent `TopicSkillState` but never create or
 * modify this field, so derived evidence can never be promoted into a manual
 * rating merely because it accumulated a numeric `evidenceStrength`.
 */
export interface TopicManualOverride {
  evidenceStrength: number; // 0 - 100 exactly as the user entered it
  freshness: SkillFreshnessState; // freshness the user selected
  updatedAt: string; // ISO timestamp of the override
}

export interface TopicSkillState {
  topicId: string;
  domainId: DomainId;
  lastPracticedAt?: string; // ISO timestamp
  freshness: SkillFreshnessState;
  evidenceStrength: number; // 0 - 100 calculated score (automatic + manual blend input)
  /**
   * Present only when the user explicitly saved a rating. Undefined for
   * automatically derived evidence. Automatic writers must preserve it by
   * spreading the existing state.
   */
  manualOverride?: TopicManualOverride;
}

export type PlacementMode = 'normal' | 'reduced' | 'exam' | 'placement_sprint';

export interface DailyCheckIn {
  id: string;
  date: string; // YYYY-MM-DD
  mode: PlacementMode;
  availableMinutes: number;
  energyLevel: 'low' | 'medium' | 'high';
  assignmentIds: string[];
  totalActualMinutes: number;
  notes?: string;
  isSealed: boolean;
  sealedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyTaskAssignment {
  id: string;
  date: string; // YYYY-MM-DD
  taskType: 'catalog_task' | 'dsa_review' | 'dsa_new';
  referenceId: string; // TaskDefinition.id or DSA problemId
  allocatedMinutes: number;
  completed: boolean;
  actualMinutes?: number;
}

export interface CompanyOverlay {
  id: string;
  companyName: string;
  targetRole: string;
  applicationStatus:
    | 'target'
    | 'applied'
    | 'oa_scheduled'
    | 'interview_scheduled'
    | 'rejected'
    | 'offered'
    | 'archived';
  eventDate?: string; // YYYY-MM-DD
  requiredDomains: DomainId[];
  requiredTopics: string[];
  requiredLanguages: string[];
}

// --- Historical Records Types ---

export interface PatternSelfCheckEvidence {
  patternRecognition: SelfCheckRating;
  timeComplexity: SelfCheckRating;
  spaceComplexity: SelfCheckRating;
}

export interface DSAAttempt {
  id: string;
  problemId: string;
  date: string; // YYYY-MM-DD or ISO timestamp
  result: AttemptResult;
  assistanceLevel: AssistanceLevel;
  timeTakenMinutes: number;
  notes?: string;
  selfCheck?: PatternSelfCheckEvidence;
  selfCheckEvidence?: PatternSelfCheckEvidence;
  createdAt: string;
}

export interface PatternMetadata {
  id?: string;
  patternId: string;
  name: string;
  title?: string;
  overview: string;
  whyItMatters: string;
  recognitionSignals: string[];
  coreIntuition: string;
  codeTemplate: string;
  commonMistakes: string[];
  expectedTimeComplexity: string;
  expectedSpaceComplexity: string;
  primaryResourceId: string;
  secondaryResourceId?: string;
}

export interface LearningResource {
  id: string;
  title: string;
  provider: 'NeetCode' | 'LeetCode' | 'TakeUForward' | 'LintCode' | 'GeeksforGeeks';
  type: 'video' | 'article' | 'interactive_problem';
  url: string;
  accessTier: AccessTier;
  accessStatus?: AccessTier;
  estimatedMinutes: number;
  purpose: string;
}

export interface EvidenceLog {
  id: string;
  topicId: string;
  domainId: DomainId;
  score: number; // 0 - 100
  confidence: 1 | 2 | 3 | 4 | 5;
  timestamp: string; // ISO timestamp
  sourceType:
    | 'daily_assignment'
    | 'dsa_attempt'
    | 'test'
    | 'mock_interview'
    | 'project_feature'
    | 'practice_session'
    | 'preparation_lesson';
  sourceId: string;
  details?: string;
}

// --- Assessment Types (Phase A Foundation) ---

export type AssessmentKind = 'diagnostic_assessment' | 'weekly_assessment' | 'full_reassessment';

export type AssessmentStatus = 'in_progress' | 'submitted' | 'auto_submitted' | 'abandoned';

export type AssessmentItemResult = 'correct' | 'incorrect' | 'dont_know' | 'unanswered';

export type AssessmentConfidence = 'confident' | 'somewhat' | 'guessing';

export interface AssessmentDefinition {
  id: string;
  kind: AssessmentKind;
  name: string;
  timeLimitMinutes: number;
  modules: AssessmentModule[];
  version: number;
}

export interface AssessmentModule {
  domainId: DomainId;
  timeBudget: number;
  itemCount: number;
  difficultyMix: { easy: number; medium: number; hard: number };
}

export interface PythonTestCase {
  id?: string;
  name?: string;
  inputs: unknown[];
  expected: unknown;
  description?: string;
}

export interface PythonExecutionContract {
  entryPoint: string;
  testCases: PythonTestCase[];
  timeoutMs?: number;
  memoryLimitBytes?: number;
  allowedBuiltins?: string[];
  forbiddenPatterns?: string[];
}

export interface SqlTableFixture {
  columns: string[];
  rows: (string | number | boolean | null)[][];
}

export interface SqlFixture {
  tables: Record<string, SqlTableFixture>;
  expectedOutput: {
    columns: string[];
    rows: (string | number | boolean | null)[][];
    orderSensitive?: boolean;
  };
}

export interface AssessmentExecutionResult {
  passed: boolean;
  status:
    | 'success'
    | 'syntax_error'
    | 'runtime_error'
    | 'assertion_failure'
    | 'timeout'
    | 'sandbox_violation'
    | 'unsupported';
  errorCategory?: string;
  message?: string;
  testsPassed: number;
  totalTests: number;
  executionTimeMs: number;
  actualOutput?: unknown;
  expectedOutput?: unknown;
  capturedLogs?: string[];
}

export interface AssessmentExecutionRecord {
  id: string;
  attemptId: string;
  itemId: string;
  language: 'python' | 'sql';
  code: string;
  result: AssessmentExecutionResult;
  timestamp: string;
}

export interface AssessmentItem {
  id: string;
  domainId: DomainId;
  topicId: string;
  subtopicId?: string;
  competency: string;
  difficulty: 1 | 2 | 3 | 4;
  estimatedMinutes: number;
  questionType: AssessmentQuestionType;
  assessmentRole: 'anchor' | 'branch' | 'confirm';
  eligibleFor: AssessmentEligibility[];
  exposurePolicy: AssessmentExposurePolicy;
  scoring: AssessmentScoring;
  prerequisites?: string[];
  parallelGroup?: string;
  prompt: string;
  options?: string[];
  key?: number | string;
  explanation: string;
  errorCategories: string[];
  origin: 'assessment';
  pythonContract?: PythonExecutionContract;
  sqlFixture?: SqlFixture;
}

export type AssessmentQuestionType =
  | 'mcq'
  | 'multiple_response'
  | 'short_answer'
  | 'normalized_match'
  | 'code_trace'
  | 'debug_item'
  | 'coding_constrained'
  | 'sql_query'
  | 'scenario'
  | 'structured_written'
  | 'rubric_written';

export type AssessmentEligibility = 'baseline' | 'weekly' | 'released_practice';

export interface AssessmentExposurePolicy {
  maxEstimationUses: number;
  releaseToPractice: boolean;
}

export interface AssessmentScoring {
  kind: 'objective' | 'normalized_match' | 'rubric' | 'execution_test';
  key?: number | string;
  rubricId?: string;
  weight: number;
  acceptableForms?: string[];
}

export interface AssessmentAttempt {
  id: string;
  definitionId: string;
  definitionVersion: number;
  kind: AssessmentKind;
  status: AssessmentStatus;
  startedAt: string; // ISO timestamp
  endedAt?: string; // ISO timestamp
  timeLimitSeconds: number;
  seed: string;
  selectedItemIds: string[];
  selectionExceptions?: string[];
}

export interface AssessmentResponse {
  id: string;
  attemptId: string;
  itemId: string;
  response: number | string; // option index or text
  result: AssessmentItemResult;
  responseConfidence?: AssessmentConfidence;
  timeSpentSeconds: number;
  errorCategories: string[];
  scoredCredit: number;
  weightApplied: number;
  executionResult?: AssessmentExecutionResult;
}

export interface AssessmentItemExposure {
  itemId: string;
  exposureCount: number;
  lastSeenAt: string; // ISO timestamp
  lastAttemptId: string;
  lastResult: AssessmentItemResult;
  previousAssessmentUsage: AssessmentKind[];
  estimationUses: number;
  eligibleForFutureEstimation: boolean;
  releasedToPractice: boolean;
}

export interface DomainAssessmentResult {
  domainId: DomainId;
  abilityScore: number; // 0-100
  level: 0 | 1 | 2 | 3 | 4 | 5;
  confidence: 'none' | 'low' | 'medium' | 'high';
  status: 'assessed' | 'partially_assessed' | 'unassessed';
  coverage: {
    topicsCovered: number;
    topicsTotal: number;
    competenciesCovered: string[];
    difficultyBands: number[];
  };
  assessmentDate: string; // ISO timestamp
  provisional: boolean;
  constructScope?: string;
  attemptId: string;
  kind: AssessmentKind;
}

export interface AssessmentSnapshot {
  id: string;
  takenAt: string; // ISO timestamp
  kind: AssessmentKind;
  trigger: 'scheduled' | 'manual' | 'post_baseline';
  domainResults: DomainAssessmentResult[];
  priorSnapshotId?: string;
}

export interface WeaknessSignal {
  id: string;
  domainId: DomainId;
  topicId?: string;
  competency?: string;
  errorCategory: string;
  strength: 1 | 2 | 3;
  status: 'open' | 'reinforced' | 'resolved';
  firstSeenAt: string; // ISO timestamp
  lastSeenAt: string; // ISO timestamp
  occurrences: number;
  sourceAttemptIds: string[];
  resolvedAt?: string; // ISO timestamp — set when weakness is resolved via correct assessment response
}

export interface AssessmentProfile {
  baselineCompletedAt?: string; // ISO timestamp
  lastSundayAt?: string; // ISO timestamp
  pendingSunday: boolean;
  nextReassessmentSuggestedAt?: string; // ISO timestamp
}

// --- Phase G: Company / Role Assessment Overlays & Calibration Path ---

export interface CompanyAssessmentOverlay {
  companyId: string;
  companyName: string;
  targetRole: string;
  overlayVersion: number;
  requiredDomains: DomainId[];
  requiredTopics?: string[];
  requiredLanguages?: string[];
  targetDifficultyLevels?: Partial<Record<DomainId, number>>;
  domainWeightMultipliers?: Partial<Record<DomainId, number>>;
  customModuleComposition?: DomainId[];
  provenance: string;
}

export interface DomainRoleAssessmentReadiness {
  domainId: DomainId;
  domainName: string;
  generalLevel: 0 | 1 | 2 | 3 | 4 | 5;
  generalAbilityScore: number;
  generalConfidence: 'none' | 'low' | 'medium' | 'high';
  isRoleRequired: boolean;
  roleTargetLevel: number;
  gap: number;
  status: 'met' | 'gap' | 'unassessed' | 'optional';
  weightMultiplier: number;
}

export interface CompanyAssessmentOverlayResult {
  companyId: string;
  companyName: string;
  targetRole: string;
  overlayVersion: number;
  provenance: string;
  generalOverallAbility: number;
  rolePreparationScore: number; // 0 - 100%
  requiredDomainsCount: number;
  metDomainsCount: number;
  gapDomainsCount: number;
  domainReadiness: DomainRoleAssessmentReadiness[];
  topRoleGaps: {
    domainId: DomainId;
    domainName: string;
    currentLevel: number;
    targetLevel: number;
    gap: number;
  }[];
}

export interface ItemCalibrationObservation {
  id: string;
  itemId: string;
  attemptId: string;
  assessmentKind: AssessmentKind;
  assessmentVersion: number;
  domainId: DomainId;
  topicId: string;
  authoredDifficulty: number;
  observedScore: number; // 0 to 1
  isCorrect: boolean;
  timeSpentSeconds: number;
  estimatedMinutes: number;
  responseConfidence?: AssessmentConfidence;
  errorCategories: string[];
  timestamp: string; // ISO timestamp
  overlayProvenance?: string;
}

export interface ItemCalibrationSummary {
  itemId: string;
  authoredDifficulty: number;
  domainId: DomainId;
  topicId: string;
  responseCount: number;
  exposureCount: number;
  correctCount: number;
  observedAccuracy: number; // 0 to 1
  averageTimeSpentSeconds: number;
  errorTaxonomyCounts: Record<string, number>;
  calibrationStatus: 'insufficient_data' | 'calibration_ready';
  calibrationThreshold: {
    minResponses: number; // 200 (DECIDED 6)
    minAttempts: number; // 50 (DECIDED 6)
  };
}

export interface AssessmentState {
  attempts: AssessmentAttempt[];
  responses: AssessmentResponse[];
  exposures: Record<string, AssessmentItemExposure>;
  domainResults: DomainAssessmentResult[];
  snapshots: AssessmentSnapshot[];
  weaknessSignals: WeaknessSignal[];
  profile: AssessmentProfile;
  calibrationObservations?: ItemCalibrationObservation[];
  executionRecords?: AssessmentExecutionRecord[];
}

// --- Practice & Assessment Subsystem Types ---

export type PracticeCategory =
  | 'aptitude'
  | 'verbal'
  | 'sql'
  | 'core_cs'
  | 'coding'
  | 'communication'
  | 'project_defense'
  | 'technical_interview'
  | 'behavioral_interview'
  | 'mock_interview'
  | 'resume';

export type QuestionType =
  | 'mcq'
  | 'short_answer'
  | 'sql_scenario'
  | 'defense_prompt'
  | 'interview_question'
  | 'multiple_choice'
  | 'query'
  | 'explanation'
  | 'self_evaluation';

export interface PracticeQuestion {
  id: string;
  category: PracticeCategory;
  domainId: DomainId;
  topicId: string;
  questionType: QuestionType;
  prompt: string;
  options?: string[]; // 0-indexed string choices for MCQ
  correctAnswer?: number | string; // Option index or text match
  explanation?: string;
  hint?: string;
  categoryTag?: string; // e.g. "percentages", "joins", "os_memory", "behavioral"
}

export interface PracticeSessionDefinition {
  id: string;
  title: string;
  description: string;
  category: PracticeCategory;
  domainId: DomainId;
  topicId?: string;
  estimatedMinutes: number;
  questionCount: number;
  passingScorePct: number;
  questions: PracticeQuestion[];
}

export interface PracticeUserAnswer {
  questionId: string;
  selectedOption?: number;
  userResponse?: string;
  isCorrect?: boolean;
  usedHint?: boolean;
  confidence?: 1 | 2 | 3 | 4 | 5;
}

export interface PracticeAttempt {
  id: string;
  sessionId: string;
  sessionTitle: string;
  category: PracticeCategory;
  domainId: DomainId;
  topicId?: string;
  date: string; // YYYY-MM-DD
  completedAt: string; // ISO timestamp
  totalTimeSeconds: number;
  scorePct: number;
  accuracyPct: number;
  correctCount: number;
  totalQuestions: number;
  /**
   * Explicit pass/fail outcome — always present. Computed by the evaluator as
   * `scorePct >= passingScorePct`; it is NOT an echo of the configured
   * threshold and is never derived in UI code. Fail-closed: if the session has
   * no usable threshold there is nothing to have met, so this stays false.
   */
  passed: boolean;
  /** The threshold actually evaluated, when the session defines a valid one. */
  passingScorePct?: number;
  userAnswers: PracticeUserAnswer[];
  evidenceLogId?: string;
  notes?: string;
}

// --- Preparation & Project Lab Architecture Types ---

export type PreparationSectionId =
  | 'coding'
  | 'core_cs'
  | 'aptitude_communication'
  | 'interview_career';

export interface PreparationSection {
  id: PreparationSectionId;
  title: string;
  subtitle: string;
  description: string;
  topicIds: string[];
}

export type TopicStageId =
  | 'orient'
  | 'learn'
  | 'apply'
  | 'assess'
  | 'review'
  | 'interview'
  | 'evidence';

export interface RecommendedResource {
  title: string;
  url?: string;
  type: string;
  description?: string;
  /** Curation role: 1 primary + 1 secondary + at most 1 optional practice link. */
  role: 'primary' | 'secondary' | 'practice';
}

export type PreparationPriority = 'high' | 'medium' | 'low';

/**
 * One progressive-disclosure learning card for a single subtopic.
 * Every card answers the same five questions in short, high-yield form:
 * WHAT → WHY → EXAMPLE → PRACTICE → PROOF.
 */
export interface SubtopicLearningCard {
  what: string;
  why: string;
  example: string;
  practice: string;
  proof: string;
}

export interface PreparationTopic {
  id: string;
  sectionId: PreparationSectionId;
  domainId: DomainId;
  title: string;
  description: string;
  whyItMatters: string;
  learningObjectives: string[];
  /** Ordered, human-readable subtopic headings. */
  subtopics: string[];
  /** Ordered parallel to `subtopics` — the learning card shown in the Learn stage. */
  subtopicCards: SubtopicLearningCard[];
  priority: PreparationPriority;
  recommendedPhase: string; // Phase ID from seedData PHASES ('phase-1' … 'phase-4')
  /** Free-text prerequisite labels shown in the Orient stage. */
  prerequisites: string[];
  /** Resolvable PreparationTopic ids that must be worked through first. */
  prerequisiteTopicIds: string[];
  recommendedResources: RecommendedResource[];
  stages: TopicStageId[];
  roadmapTopicId?: string; // Optional: not every preparation topic has a roadmap counterpart
  estimatedMinutes: number;
  targetLevel: 1 | 2 | 3 | 4 | 5;
  practiceActivities: string[];
  assessmentTypes: string[];
  interviewCheckpoints: string[];
  completionCriteria: string[];
  evidenceCriteria: string[];
}

/**
 * Ladder label for topic preparedness. Derived from the four proof pillars
 * (coverage, application, assessment, retention/interview evidence) relative
 * to the topic's target level — intentionally NOT a completion percentage.
 */
export type PreparationReadiness =
  | 'not_started'
  | 'learning'
  | 'practicing'
  | 'assessed'
  | 'ready';

/**
 * Reusable preparedness evaluation for a single PreparationTopic.
 * Coarse, deterministic values only — no fake precision.
 */
export interface TopicPreparedness {
  topicId: string;
  readiness: PreparationReadiness;
  currentLevel: number; // 0–5 rung, contiguous: covered → practiced → assessed → retained → interview-proof
  targetLevel: number; // topic.targetLevel (1–5)
  covered: boolean;
  coveragePct: number; // 0 | 50 | 100 (coarse)
  practiced: boolean;
  attemptCount: number;
  assessmentPerformance: number | null; // best attempt accuracy (integer %), null when no attempt
  evidenceStrength: number; // 0–100
  evidenceFreshness: SkillFreshnessState;
  interviewProof: boolean;
  missingProof: string[];
  nextAction: string;
}

export interface PreparationTopicProgress {
  topicId: string;
  sectionId: PreparationSectionId;
  domainId: DomainId;
  currentStage: TopicStageId;
  completedStages: TopicStageId[];
  stageProgress: Record<TopicStageId, {
    startedAt?: string;
    completedAt?: string;
    timeSpentMinutes: number;
  }>;
  lastAccessedAt: string;
  totalTimeSpentMinutes: number;
  evidenceStrength: number;
  freshness: SkillFreshnessState;
  createdAt: string;
  updatedAt: string;
}

export type ProjectLabSectionId =
  | 'overview'
  | 'architecture'
  | 'implementation'
  | 'practices'
  | 'defense'
  | 'evidence';


