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

export interface Topic {
  id: string;
  moduleId: string;
  domainId: DomainId;
  name: string;
  description: string;
  targetDate?: string;
  importance: number; // 1 - 10 scale
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
  dueDate?: string; // YYYY-MM-DD
  createdAt: string;
}

export interface SkillDefinition {
  id: string;
  domainId: DomainId;
  topicId: string;
  name: string;
  description: string;
}

export interface DSAProblem {
  id: string;
  title: string;
  domainId: DomainId;
  topicId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  leetcodeUrl?: string;
  pattern: string;
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
  currentBox: 1 | 2 | 3 | 4;
  nextReviewAt: string; // YYYY-MM-DD
  lastAttemptAt?: string; // ISO timestamp
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
}

export type SkillFreshnessState = 'untested' | 'fresh' | 'aging' | 'stale';

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

export interface DSAAttempt {
  id: string;
  problemId: string;
  date: string; // YYYY-MM-DD
  result: 'pass' | 'partial' | 'fail';
  assistanceLevel: 'none' | 'hint' | 'solution';
  timeTakenMinutes: number;
  notes?: string;
  createdAt: string;
}

export interface EvidenceLog {
  id: string;
  topicId: string;
  domainId: DomainId;
  score: number; // 0 - 100
  confidence: 1 | 2 | 3 | 4 | 5;
  timestamp: string; // ISO timestamp
  sourceType: 'daily_assignment' | 'dsa_attempt' | 'test' | 'mock_interview' | 'project_feature';
  sourceId: string;
  details?: string;
}
