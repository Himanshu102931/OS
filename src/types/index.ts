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

export interface SkillDefinition {
  id: string;
  domainId: DomainId;
  topicId: string;
  name: string;
  description: string;
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
  recommendedPhase: number;
  progressionTier: ProgressionTier;
  prerequisites: string[]; // Problem IDs
  isAnchor: boolean;
  estimatedTimeMinutes: number;
  learningHint?: LearningHint;
  pattern?: string; // Backwards compatibility helper
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

export interface TopicSkillState {
  topicId: string;
  domainId: DomainId;
  lastPracticedAt?: string; // ISO timestamp
  freshness: SkillFreshnessState;
  evidenceStrength: number; // 0 - 100 calculated score
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
  sourceType: 'daily_assignment' | 'dsa_attempt' | 'test' | 'mock_interview' | 'project_feature' | 'practice_session';
  sourceId: string;
  details?: string;
}

// --- Practice & Assessment Subsystem Types ---

export type PracticeCategory =
  | 'aptitude'
  | 'verbal'
  | 'sql'
  | 'core_cs'
  | 'project_defense'
  | 'technical_interview'
  | 'behavioral_interview'
  | 'mock_interview';

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
}

export type PreparationPriority = 'high' | 'medium' | 'low';

export interface PreparationTopic {
  id: string;
  sectionId: PreparationSectionId;
  domainId: DomainId;
  title: string;
  description: string;
  whyItMatters: string;
  learningObjectives: string[];
  subtopics: string[];
  priority: PreparationPriority;
  recommendedPhase: string; // Phase ID from seedData PHASES ('phase-1' … 'phase-4')
  prerequisites: string[];
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


