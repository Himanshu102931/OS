import type {
  AssessmentState,
  DSAAttempt,
  DSAProblem,
  DSAProgress,
  EvidenceLog,
  PracticeAttempt,
  PracticeSessionDefinition,
  PreparationTopicProgress,
  TaskDefinition,
  TaskProgress,
  Topic,
  TopicSkillState,
} from '../types';
import type { ReviewCandidate } from './reviewScheduler';
import type { EvidenceClassification, TopicReadiness } from './skillsEngine';
import type { CompanyRequirementMapping } from './companyEngine';
import type { ReadinessDimension } from './interviewReadinessEngine';
import type { TaskLockExplanation } from './prerequisiteNavigation';
import { resolveRoadmapTarget } from './prerequisiteNavigation';
import { getPreparationTopic } from '../data/preparationDataset';

/**
 * EVIDENCE TRACEABILITY — Signal → Why → Evidence → Source → Go to Source.
 *
 * This is a presentation adapter, deliberately NOT an evidence engine. It owns
 * no scoring, no freshness math and no readiness calculation: every number it
 * displays is handed to it by the canonical engine that produced the signal
 * (skillsEngine, reviewScheduler, weaknessRouter, companyPlanEngine,
 * interviewReadinessEngine, assessmentEngine, practiceEngine).
 *
 * What it adds is the product layer that was missing:
 *
 *   WHY       a deterministic, human-readable statement of what produced the signal
 *   EVIDENCE  the contributing canonical records, classified direct vs aggregated
 *   SOURCE    each record resolved against real local state — never a phantom id
 *   ACTION    a route that is only called a deep link when the destination view
 *             actually reads `routeState.targetId` (today: roadmap, preparation)
 *
 * Guarantees:
 *   - reads no clock (`Date.now()`/`new Date()` are never called)
 *   - never mutates any input
 *   - identical inputs produce byte-identical traces, including ordering
 *   - a missing record is reported as `availability: 'missing'`, never invented
 */

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

/**
 * Route union kept in lockstep with `RoutePath` (PlacementContext). Mirrored
 * here so the engine stays free of React imports; the drift check lives in
 * `src/test/evidenceTrace.test.ts`.
 */
export type TraceRoute =
  | 'dashboard'
  | 'roadmap'
  | 'dsa'
  | 'skills'
  | 'practice'
  | 'preparation'
  | 'project'
  | 'companies'
  | 'analytics'
  | 'settings'
  | 'assessment'
  | 'interview';

/** The signals that can currently be traced back to evidence. */
export type SignalKind =
  | 'weak_skill'
  | 'stale_evidence'
  | 'dsa_remediation'
  | 'overdue_review'
  | 'routed_weakness'
  | 'company_gap'
  | 'assessment_weakness'
  | 'interview_readiness'
  | 'practice_weakness'
  | 'project_defense'
  | 'roadmap_lock'
  | 'progression';

/**
 * Where a trace entry points. `'derived'` is the only non-record kind and is
 * used when a signal genuinely has no single underlying record — it is never
 * used to dress up a record that failed to resolve.
 */
export type EvidenceSourceKind =
  | 'evidence_log'
  | 'practice_attempt'
  | 'practice_session'
  | 'dsa_attempt'
  | 'dsa_progress'
  | 'task_progress'
  | 'skill_state'
  | 'assessment_attempt'
  | 'assessment_response'
  | 'weakness_signal'
  | 'preparation_progress'
  | 'derived';

/** One contributing entry of a trace. */
export interface EvidenceSourceRef {
  kind: EvidenceSourceKind;
  /** Canonical id. Deterministic synthetic key for `derived` entries. */
  sourceId: string;
  label: string;
  detail?: string;
  /** ISO timestamp or `YYYY-MM-DD`, exactly as the canonical record stores it. */
  timestamp?: string;
  /** 0-100, only when the canonical record carries one. */
  strength?: number;
  /**
   * `'missing'` means the id was referenced but no such record exists in local
   * state (deleted / never persisted). The UI must show it as unavailable and
   * must not offer an action for it.
   */
  availability: 'available' | 'missing';
}

/** How the signal itself was produced. */
export type EvidenceTraceOrigin =
  /** exactly one contributing canonical record */
  | 'direct'
  /** composed from two or more contributing canonical records */
  | 'aggregated'
  /** no canonical record is attached — derived from computed state only */
  | 'derived';

export interface TraceDestination {
  route: TraceRoute;
  /** Present only when the destination view really consumes it. */
  targetId?: string;
  /** True only for routes whose view reads `routeState.targetId`. */
  deepLink: boolean;
  /** Honest action label — never names a record the route cannot open. */
  label: string;
  /** Populated when a requested target was dropped or the link is generic. */
  note?: string;
}

export interface EvidenceTrace {
  /** Deterministic id: `<signal>:<anchor>`. */
  id: string;
  signal: SignalKind;
  label: string;
  why: string;
  origin: EvidenceTraceOrigin;
  /** Canonical skills classification, present only for skill-readiness signals. */
  classification?: EvidenceClassification;
  sources: EvidenceSourceRef[];
  destination: TraceDestination;
}

/**
 * The canonical records a trace may resolve against. Assembled by the view
 * from `usePlacement()`; every field is read-only.
 */
export interface EvidenceCatalog {
  topics: Topic[];
  taskDefinitions: TaskDefinition[];
  taskProgress: Record<string, TaskProgress>;
  dsaProblems: DSAProblem[];
  dsaProgress: Record<string, DSAProgress>;
  dsaAttempts: DSAAttempt[];
  evidenceLogs: EvidenceLog[];
  practiceSessions: PracticeSessionDefinition[];
  practiceAttempts: PracticeAttempt[];
  skillStates: Record<string, TopicSkillState>;
  /** `YYYY-MM-DD` from `todayDate` — passed in, never read from a clock. */
  todayISO: string;
  preparationTopicProgress?: Record<string, PreparationTopicProgress>;
  assessmentState?: AssessmentState;
}

// ---------------------------------------------------------------------------
// Deterministic ordering
// ---------------------------------------------------------------------------

/** Lower runs first when timestamps tie. */
const SOURCE_PRIORITY: Record<EvidenceSourceKind, number> = {
  dsa_attempt: 1,
  practice_attempt: 2,
  assessment_response: 3,
  assessment_attempt: 4,
  task_progress: 5,
  evidence_log: 6,
  weakness_signal: 7,
  dsa_progress: 8,
  skill_state: 9,
  practice_session: 10,
  preparation_progress: 11,
  derived: 99,
};

/**
 * timestamp DESC → source priority ASC → kind ASC → sourceId ASC → label ASC.
 * Records without a timestamp sort after every dated record. Stable, total and
 * independent of input order; no clock is read.
 */
export function compareEvidenceSources(a: EvidenceSourceRef, b: EvidenceSourceRef): number {
  const at = a.timestamp ?? '';
  const bt = b.timestamp ?? '';
  if (at !== bt) {
    if (at === '') return 1;
    if (bt === '') return -1;
    return at < bt ? 1 : -1;
  }
  const pa = SOURCE_PRIORITY[a.kind] ?? 90;
  const pb = SOURCE_PRIORITY[b.kind] ?? 90;
  if (pa !== pb) return pa - pb;
  if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
  if (a.sourceId !== b.sourceId) return a.sourceId < b.sourceId ? -1 : 1;
  if (a.label !== b.label) return a.label < b.label ? -1 : 1;
  return 0;
}

/** Sorts a copy. The input array is never mutated. */
export function sortEvidenceSources(sources: EvidenceSourceRef[]): EvidenceSourceRef[] {
  return [...sources].sort(compareEvidenceSources);
}

/** Keeps the first entry per `kind::sourceId` in sorted order. */
export function dedupeEvidenceSources(sources: EvidenceSourceRef[]): EvidenceSourceRef[] {
  const seen = new Set<string>();
  const out: EvidenceSourceRef[] = [];
  for (const source of sortEvidenceSources(sources)) {
    const key = `${source.kind}::${source.sourceId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(source);
  }
  return out;
}

/** Sorts, then deduplicates. The single entry point every trace passes through. */
export function finalizeEvidenceSources(sources: EvidenceSourceRef[]): EvidenceSourceRef[] {
  return dedupeEvidenceSources(sources);
}

// ---------------------------------------------------------------------------
// Source resolution
// ---------------------------------------------------------------------------

const STATE_LABEL: Record<TaskProgress['state'], string> = {
  not_started: 'not started',
  in_progress: 'in progress',
  completed: 'completed',
  archived: 'archived',
};

function missingSource(kind: EvidenceSourceKind, sourceId: string): EvidenceSourceRef {
  return {
    kind,
    sourceId,
    label: `Unavailable ${kind.replace(/_/g, ' ')} record`,
    detail: `No ${kind.replace(/_/g, ' ')} with id "${sourceId}" exists in local storage.`,
    availability: 'missing',
  };
}

function latestAttemptForProblem(
  catalog: EvidenceCatalog,
  problemId: string
): DSAAttempt | undefined {
  let best: DSAAttempt | undefined;
  for (const attempt of catalog.dsaAttempts) {
    if (attempt.problemId !== problemId) continue;
    if (!best) {
      best = attempt;
      continue;
    }
    const aTs = attempt.createdAt || attempt.date || '';
    const bTs = best.createdAt || best.date || '';
    if (aTs > bTs || (aTs === bTs && attempt.id > best.id)) best = attempt;
  }
  return best;
}

/**
 * Resolves one `(kind, sourceId)` pair against canonical state.
 *
 * A record that cannot be found is returned with `availability: 'missing'` and
 * an explicit explanation — the caller never receives an invented record.
 */
export function resolveEvidenceSource(
  kind: EvidenceSourceKind,
  sourceId: string,
  catalog: EvidenceCatalog
): EvidenceSourceRef {
  if (kind === 'derived') {
    return {
      kind: 'derived',
      sourceId,
      label: sourceId,
      availability: 'available',
    };
  }
  if (!sourceId) return missingSource(kind, sourceId);

  switch (kind) {
    case 'evidence_log': {
      const log = catalog.evidenceLogs.find((l) => l.id === sourceId);
      if (!log) return missingSource(kind, sourceId);
      return {
        kind,
        sourceId,
        label: `Evidence record (${log.sourceType.replace(/_/g, ' ')})`,
        detail: log.details || `Score: ${log.score}/100, confidence ${log.confidence}/5`,
        timestamp: log.timestamp,
        strength: log.score,
        availability: 'available',
      };
    }
    case 'task_progress': {
      const progress = catalog.taskProgress[sourceId];
      if (!progress) return missingSource(kind, sourceId);
      const task = catalog.taskDefinitions.find((t) => t.id === sourceId);
      return {
        kind,
        sourceId,
        label: task?.title ?? sourceId,
        detail: `Roadmap task — ${STATE_LABEL[progress.state]}, ${progress.timeSpentMinutes}m recorded`,
        timestamp: progress.lastCompletedAt || progress.updatedAt,
        availability: 'available',
      };
    }
    case 'dsa_progress': {
      const progress = catalog.dsaProgress[sourceId];
      if (!progress) return missingSource(kind, sourceId);
      const problem = catalog.dsaProblems.find((p) => p.id === sourceId);
      return {
        kind,
        sourceId,
        label: problem ? `#${problem.leetcodeNumber || ''} ${problem.title}`.trim() : sourceId,
        detail: `Leitner Box ${progress.currentBox}, ${progress.attemptCount} attempt${
          progress.attemptCount === 1 ? '' : 's'
        }${progress.remediationRequired ? ', remediation required' : ''}${
          progress.nextReviewAt ? `, review due ${progress.nextReviewAt}` : ''
        }`,
        timestamp: progress.lastAttemptAt || progress.updatedAt,
        strength: progress.evidenceStrength,
        availability: 'available',
      };
    }
    case 'dsa_attempt': {
      const attempt = catalog.dsaAttempts.find((a) => a.id === sourceId);
      if (!attempt) return missingSource(kind, sourceId);
      const problem = catalog.dsaProblems.find((p) => p.id === attempt.problemId);
      return {
        kind,
        sourceId,
        label: problem ? `#${problem.leetcodeNumber || ''} ${problem.title}`.trim() : attempt.problemId,
        detail: `${attempt.result} · assistance: ${attempt.assistanceLevel} · ${attempt.timeTakenMinutes}m`,
        timestamp: attempt.createdAt || attempt.date,
        availability: 'available',
      };
    }
    case 'practice_attempt': {
      const attempt = catalog.practiceAttempts.find((a) => a.id === sourceId);
      if (!attempt) return missingSource(kind, sourceId);
      return {
        kind,
        sourceId,
        label: attempt.sessionTitle,
        detail: `${attempt.scorePct}% · ${attempt.correctCount}/${attempt.totalQuestions} correct · ${
          attempt.passed ? 'passed' : 'not passed'
        }${attempt.category === 'project_defense' ? ' · project defense' : ''}`,
        timestamp: attempt.completedAt || attempt.date,
        strength: attempt.scorePct,
        availability: 'available',
      };
    }
    case 'practice_session': {
      const session = catalog.practiceSessions.find((s) => s.id === sourceId);
      if (!session) return missingSource(kind, sourceId);
      return {
        kind,
        sourceId,
        label: session.title,
        detail: `${session.questionCount} questions · pass mark ${session.passingScorePct}%`,
        availability: 'available',
      };
    }
    case 'skill_state': {
      const state = catalog.skillStates[sourceId];
      if (!state) return missingSource(kind, sourceId);
      const topic = catalog.topics.find((t) => t.id === sourceId);
      return {
        kind,
        sourceId,
        label: `Manual rating — ${topic?.name ?? sourceId}`,
        detail: state.manualOverride
          ? `User override ${state.manualOverride.evidenceStrength}/100 (${state.manualOverride.freshness})`
          : `Evidence ${state.evidenceStrength}/100 (${state.freshness})`,
        timestamp: state.manualOverride?.updatedAt || state.lastPracticedAt,
        strength: state.evidenceStrength,
        availability: 'available',
      };
    }
    case 'assessment_attempt': {
      const attempt = catalog.assessmentState?.attempts.find((a) => a.id === sourceId);
      if (!attempt) return missingSource(kind, sourceId);
      return {
        kind,
        sourceId,
        label: `Assessment attempt (${attempt.kind.replace(/_/g, ' ')})`,
        detail: `Status ${attempt.status.replace(/_/g, ' ')} · attempt ${attempt.id}`,
        timestamp: attempt.endedAt || attempt.startedAt,
        availability: 'available',
      };
    }
    case 'assessment_response': {
      const response = catalog.assessmentState?.responses.find((r) => r.id === sourceId);
      if (!response) return missingSource(kind, sourceId);
      return {
        kind,
        sourceId,
        label: `Response on item ${response.itemId}`,
        detail: `${response.result}${response.errorCategories.length ? ` · ${response.errorCategories.join(', ')}` : ''}`,
        availability: 'available',
      };
    }
    case 'weakness_signal': {
      const signal = catalog.assessmentState?.weaknessSignals.find((w) => w.id === sourceId);
      if (!signal) return missingSource(kind, sourceId);
      return {
        kind,
        sourceId,
        label: `Weakness: ${signal.competency || signal.errorCategory}`,
        detail: `${signal.status} · strength ${signal.strength}/3 · ${signal.occurrences} occurrence${
          signal.occurrences === 1 ? '' : 's'
        }`,
        timestamp: signal.lastSeenAt,
        availability: 'available',
      };
    }
    case 'preparation_progress': {
      const progress = catalog.preparationTopicProgress?.[sourceId];
      if (!progress) return missingSource(kind, sourceId);
      const topic = getPreparationTopic(sourceId);
      return {
        kind,
        sourceId,
        label: topic?.title ?? sourceId,
        detail: `Stage ${progress.currentStage} · ${progress.evidenceStrength}/100 evidence`,
        timestamp: progress.updatedAt,
        strength: progress.evidenceStrength,
        availability: 'available',
      };
    }
  }
}

/** Builds an entry that points at no record — used only for genuine aggregates. */
export function makeDerivedSource(
  sourceId: string,
  label: string,
  detail?: string,
  timestamp?: string,
  strength?: number
): EvidenceSourceRef {
  return {
    kind: 'derived',
    sourceId,
    label,
    detail,
    timestamp,
    strength,
    availability: 'available',
  };
}

// ---------------------------------------------------------------------------
// Destination resolution — honest labels, no phantom routes
// ---------------------------------------------------------------------------

/**
 * Routes whose view actually reads `routeState.targetId`.
 * Everything else opens a generic page and must be labelled as such.
 */
const DEEP_LINK_ROUTES: ReadonlySet<TraceRoute> = new Set<TraceRoute>(['roadmap', 'preparation']);

const ROUTE_ACTION_LABEL: Record<TraceRoute, string> = {
  dashboard: 'Open Dashboard',
  roadmap: 'Open Roadmap',
  dsa: 'Open DSA',
  skills: 'Open Skills Matrix',
  practice: 'Open Practice',
  preparation: 'Open Preparation',
  project: 'Open Project Lab',
  companies: 'Open Companies',
  analytics: 'Open Analytics',
  settings: 'Open Settings',
  assessment: 'View Assessment',
  interview: 'Open Interview Readiness',
};

/**
 * True when `route` is one of the views that consumes `routeState.targetId`.
 * Exported so surfaces can be tested against the routing model directly.
 */
export function routeSupportsDeepLink(route: TraceRoute): boolean {
  return DEEP_LINK_ROUTES.has(route);
}

/**
 * Resolves a destination. A `targetId` survives only when the destination view
 * reads it AND the id really exists; otherwise it is dropped and the reason is
 * reported, so no link can ever claim to open something it cannot open.
 */
export function resolveTraceDestination(
  route: TraceRoute,
  targetId: string | undefined,
  catalog: Pick<EvidenceCatalog, 'topics' | 'taskDefinitions'>
): TraceDestination {
  const genericLabel = ROUTE_ACTION_LABEL[route];

  if (!DEEP_LINK_ROUTES.has(route)) {
    return {
      route,
      deepLink: false,
      label: genericLabel,
      note: targetId
        ? `${genericLabel} — this page does not open a specific record.`
        : undefined,
    };
  }

  if (route === 'roadmap') {
    if (!targetId) return { route, deepLink: false, label: genericLabel };
    const resolved = resolveRoadmapTarget(targetId, catalog.topics, catalog.taskDefinitions);
    if (!resolved.topic && !resolved.taskId) {
      return {
        route,
        deepLink: false,
        label: genericLabel,
        note: `Roadmap target "${targetId}" was not found.`,
      };
    }
    const task = resolved.taskId
      ? catalog.taskDefinitions.find((t) => t.id === resolved.taskId)
      : undefined;
    const name = task?.title ?? resolved.topic?.name;
    return {
      route,
      targetId,
      deepLink: true,
      label: name ? `Open "${name}"` : genericLabel,
    };
  }

  // preparation
  if (!targetId) return { route, deepLink: false, label: genericLabel };
  const prepTopic = getPreparationTopic(targetId);
  if (!prepTopic) {
    return {
      route,
      deepLink: false,
      label: genericLabel,
      note: `Preparation topic "${targetId}" was not found.`,
    };
  }
  return { route, targetId, deepLink: true, label: `Open "${prepTopic.title}"` };
}

/**
 * Where a single source record can be opened from.
 *
 * Returns `null` for derived entries and for records that no longer exist — a
 * source you cannot reach must never offer a button. Route choice follows the
 * record's own type (and, for evidence logs, the log's `sourceType`).
 */
export function resolveSourceDestination(
  source: EvidenceSourceRef,
  catalog: EvidenceCatalog
): TraceDestination | null {
  if (source.kind === 'derived' || source.availability === 'missing') return null;

  switch (source.kind) {
    case 'task_progress':
      return resolveTraceDestination('roadmap', source.sourceId, catalog);
    case 'dsa_progress':
    case 'dsa_attempt':
      return resolveTraceDestination('dsa', source.sourceId, catalog);
    case 'practice_attempt':
    case 'practice_session':
      return resolveTraceDestination('practice', source.sourceId, catalog);
    case 'assessment_attempt':
    case 'assessment_response':
    case 'weakness_signal':
      return resolveTraceDestination('assessment', undefined, catalog);
    case 'skill_state':
      return resolveTraceDestination('skills', source.sourceId, catalog);
    case 'preparation_progress':
      return resolveTraceDestination('preparation', source.sourceId, catalog);
    case 'evidence_log': {
      const log = catalog.evidenceLogs.find((l) => l.id === source.sourceId);
      if (!log) return null;
      switch (log.sourceType) {
        case 'daily_assignment':
          // The log's own topic is the only id here known to be a roadmap id.
          return resolveTraceDestination('roadmap', log.topicId, catalog);
        case 'dsa_attempt':
          return resolveTraceDestination('dsa', undefined, catalog);
        case 'practice_session':
          return resolveTraceDestination('practice', undefined, catalog);
        case 'test':
          return resolveTraceDestination('assessment', undefined, catalog);
        case 'mock_interview':
          return resolveTraceDestination('interview', undefined, catalog);
        case 'project_feature':
          return resolveTraceDestination('project', undefined, catalog);
        default:
          return resolveTraceDestination('analytics', undefined, catalog);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Trace assembly
// ---------------------------------------------------------------------------

function computeOrigin(sources: EvidenceSourceRef[]): EvidenceTraceOrigin {
  const records = sources.filter((s) => s.kind !== 'derived');
  if (records.length === 0) return 'derived';
  return records.length === 1 ? 'direct' : 'aggregated';
}

/**
 * Single assembly point. Sorts + deduplicates sources, resolves the
 * destination and classifies the signal's provenance.
 */
export function buildEvidenceTrace(input: {
  id: string;
  signal: SignalKind;
  label: string;
  why: string;
  sources: EvidenceSourceRef[];
  route: TraceRoute;
  targetId?: string;
  classification?: EvidenceClassification;
  catalog: EvidenceCatalog;
}): EvidenceTrace {
  const sources = finalizeEvidenceSources(input.sources);
  return {
    id: input.id,
    signal: input.signal,
    label: input.label,
    why: input.why,
    origin: computeOrigin(sources),
    ...(input.classification ? { classification: input.classification } : {}),
    sources,
    destination: resolveTraceDestination(input.route, input.targetId, input.catalog),
  };
}

// ---------------------------------------------------------------------------
// Canonical source collection
// ---------------------------------------------------------------------------

/** Guards the due-date comparison against corrupted / hand-edited records. */
const DATE_SHAPE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function isValidDate(value: string | undefined): value is string {
  if (!value || value.length < 10) return false;
  return DATE_SHAPE.test(value.slice(0, 10));
}

/**
 * Lists the concrete records that back a roadmap topic: completed/in-progress
 * tasks, DSA Leitner state, evidence logs, practice attempts and any explicit
 * manual rating. Pure listing — no score is recomputed here, so the canonical
 * skillsEngine classification is never second-guessed.
 */
export function collectTopicEvidenceSources(
  catalog: EvidenceCatalog,
  topicId: string
): EvidenceSourceRef[] {
  const out: EvidenceSourceRef[] = [];

  for (const task of catalog.taskDefinitions) {
    if (task.topicId !== topicId) continue;
    const progress = catalog.taskProgress[task.id];
    if (!progress || progress.state === 'not_started') continue;
    out.push(resolveEvidenceSource('task_progress', task.id, catalog));
  }

  for (const problem of catalog.dsaProblems) {
    if (problem.topicId !== topicId) continue;
    if (!catalog.dsaProgress[problem.id]) continue;
    out.push(resolveEvidenceSource('dsa_progress', problem.id, catalog));
  }

  for (const log of catalog.evidenceLogs) {
    if (log.topicId !== topicId) continue;
    out.push(resolveEvidenceSource('evidence_log', log.id, catalog));
  }

  for (const attempt of catalog.practiceAttempts) {
    if (attempt.topicId !== topicId) continue;
    out.push(resolveEvidenceSource('practice_attempt', attempt.id, catalog));
  }

  const skillState = catalog.skillStates[topicId];
  if (skillState?.manualOverride) {
    out.push(resolveEvidenceSource('skill_state', topicId, catalog));
  }

  return out;
}

/** Every DSA problem whose Leitner record is due for review on/before today. */
export function collectOverdueReviewSources(catalog: EvidenceCatalog): EvidenceSourceRef[] {
  const out: EvidenceSourceRef[] = [];
  for (const problem of catalog.dsaProblems) {
    const progress = catalog.dsaProgress[problem.id];
    if (!progress?.nextReviewAt) continue;
    if (!isValidDate(progress.nextReviewAt)) continue;
    if (progress.nextReviewAt > catalog.todayISO) continue;
    out.push(resolveEvidenceSource('dsa_progress', problem.id, catalog));
  }
  return out;
}

/** Every DSA problem whose Leitner record currently demands remediation. */
export function collectRemediationSources(catalog: EvidenceCatalog): EvidenceSourceRef[] {
  const out: EvidenceSourceRef[] = [];
  for (const problem of catalog.dsaProblems) {
    const progress = catalog.dsaProgress[problem.id];
    if (!progress?.remediationRequired) continue;
    out.push(resolveEvidenceSource('dsa_progress', problem.id, catalog));
  }
  return out;
}

/** Skill states explicitly marked stale, plus the logs that explain the age. */
export function collectStaleEvidenceSources(catalog: EvidenceCatalog): EvidenceSourceRef[] {
  const topicIds = catalog.topics
    .filter((t) => catalog.skillStates[t.id]?.freshness === 'stale')
    .map((t) => t.id)
    .sort();
  const out: EvidenceSourceRef[] = [];
  for (const topicId of topicIds) {
    out.push(resolveEvidenceSource('skill_state', topicId, catalog));
    const latestLog = catalog.evidenceLogs
      .filter((l) => l.topicId === topicId)
      .reduce<EvidenceLog | undefined>(
        (best, log) => (!best || log.timestamp > best.timestamp ? log : best),
        undefined
      );
    if (latestLog) out.push(resolveEvidenceSource('evidence_log', latestLog.id, catalog));
  }
  return out;
}

/** Tasks the scheduler recorded as repeatedly postponed. */
export function collectPostponedTaskSources(catalog: EvidenceCatalog): EvidenceSourceRef[] {
  return Object.keys(catalog.taskProgress)
    .sort()
    .filter((taskId) => (catalog.taskProgress[taskId]?.postponeCount ?? 0) > 0)
    .map((taskId) => resolveEvidenceSource('task_progress', taskId, catalog));
}

/** Attempts that used hints or a full solution — the low-independence evidence. */
export function collectAssistedAttemptSources(catalog: EvidenceCatalog): EvidenceSourceRef[] {
  return catalog.dsaAttempts
    .filter((a) => a.assistanceLevel !== 'none')
    .map((a) => resolveEvidenceSource('dsa_attempt', a.id, catalog));
}

// ---------------------------------------------------------------------------
// Signal builders
// ---------------------------------------------------------------------------

type SkillEvidenceItem = TopicReadiness['supportingEvidence'][number];

/** Structural shape of a skillsEngine evidence row, for consumers outside the engine. */
export interface SkillEvidenceItemInput {
  id: string;
  sourceType: 'task' | 'dsa_problem' | 'dsa_attempt' | 'manual_override' | 'evidence_log';
  title: string;
  details: string;
  timestamp?: string;
  scoreContribution: number;
}

const SKILL_ITEM_KIND: Record<SkillEvidenceItem['sourceType'], EvidenceSourceKind> = {
  task: 'task_progress',
  dsa_problem: 'dsa_progress',
  dsa_attempt: 'dsa_attempt',
  manual_override: 'skill_state',
  evidence_log: 'evidence_log',
};

/** Maps a skillsEngine evidence row back to its canonical record id. */
function skillItemIdToSource(item: SkillEvidenceItem): { kind: EvidenceSourceKind; id: string } {
  const kind = SKILL_ITEM_KIND[item.sourceType];
  if (item.sourceType === 'task') return { kind, id: item.id.replace(/^task-/, '') };
  if (item.sourceType === 'dsa_problem') return { kind, id: item.id.replace(/^dsa-prog-/, '') };
  if (item.sourceType === 'manual_override') return { kind, id: item.id.replace(/^manual-override-/, '') };
  return { kind, id: item.id };
}

/**
 * Resolves one `supportingEvidence` row against canonical state, keeping the
 * presentation the Skills page already shows and re-checking that the record
 * still exists.
 */
export function resolveSkillEvidenceItem(
  item: SkillEvidenceItemInput,
  catalog: EvidenceCatalog
): EvidenceSourceRef {
  const { kind, id } = skillItemIdToSource(item as SkillEvidenceItem);
  const resolved = resolveEvidenceSource(kind, id, catalog);
  return {
    ...resolved,
    label: resolved.availability === 'available' ? item.title : resolved.label,
    detail: resolved.availability === 'available' ? item.details : resolved.detail,
    timestamp: item.timestamp ?? resolved.timestamp,
    strength: resolved.strength ?? item.scoreContribution,
  };
}

/**
 * Skill-readiness signals (weak evidence, stale evidence) built directly from
 * the canonical `TopicReadiness` the Skills page already computed — the score
 * is never recomputed and the classification is passed through untouched.
 */
export function buildSkillEvidenceTrace(
  readiness: TopicReadiness,
  signal: 'weak_skill' | 'stale_evidence',
  catalog: EvidenceCatalog
): EvidenceTrace {
  const sources: EvidenceSourceRef[] = readiness.supportingEvidence.map((item) =>
    resolveSkillEvidenceItem(item, catalog)
  );

  const why =
    signal === 'stale_evidence'
      ? `${readiness.topicName} evidence is ${readiness.freshness}${
          readiness.lastPracticedAt
            ? ` — last activity ${readiness.lastPracticedAt.slice(0, 10)}`
            : ' — no activity date recorded'
        }.`
      : `Low evidence in ${readiness.topicName}: ${readiness.evidenceStrength}% against target level ${readiness.targetLevel}.`;

  if (sources.length === 0) {
    sources.push(
      makeDerivedSource(
        `derived:${readiness.topicId}`,
        `No recorded evidence for ${readiness.topicName}`,
        readiness.gapExplanation
      )
    );
  }

  return buildEvidenceTrace({
    id: `${signal}:${readiness.topicId}`,
    signal,
    label:
      signal === 'stale_evidence'
        ? `${readiness.topicName} evidence is stale`
        : `${readiness.topicName} evidence is weak`,
    why,
    sources,
    route: readiness.recommendedAction.route,
    targetId: readiness.recommendedAction.targetId,
    classification: readiness.evidenceClassification,
    catalog,
  });
}

/** Priority → signal mapping for scheduler/router candidates. */
export function signalKindForPriority(
  priority: ReviewCandidate['priority']
): SignalKind {
  switch (priority) {
    case 'remediation':
      return 'dsa_remediation';
    case 'overdue_review':
    case 'retention':
      return 'overdue_review';
    case 'routed_weakness':
      return 'routed_weakness';
    case 'company_gap':
      return 'company_gap';
    case 'stale_evidence':
      return 'stale_evidence';
    case 'weak_topic':
      return 'weak_skill';
    case 'normal_progression':
    default:
      return 'progression';
  }
}

/**
 * Generic trace for any `ReviewCandidate` — this is the Today/Dashboard path
 * and it covers overdue reviews, routed weaknesses, company gaps, stale
 * evidence and remediation because those engines already attach
 * `sourceProblemId` / `sourceTaskId` / `sourceTopicId` for exactly this purpose.
 */
export function buildReviewCandidateTrace(
  candidate: ReviewCandidate,
  catalog: EvidenceCatalog
): EvidenceTrace {
  const sources: EvidenceSourceRef[] = [];

  if (candidate.sourceProblemId) {
    sources.push(resolveEvidenceSource('dsa_progress', candidate.sourceProblemId, catalog));
    const attempt = latestAttemptForProblem(catalog, candidate.sourceProblemId);
    if (attempt) sources.push(resolveEvidenceSource('dsa_attempt', attempt.id, catalog));
  }
  if (candidate.sourceTaskId) {
    sources.push(resolveEvidenceSource('task_progress', candidate.sourceTaskId, catalog));
  }
  if (candidate.sourceTopicId) {
    sources.push(resolveEvidenceSource('skill_state', candidate.sourceTopicId, catalog));
  }

  if (sources.length === 0 && candidate.targetId) {
    if (candidate.route === 'roadmap') {
      sources.push(...collectTopicSourcesForTarget(candidate.targetId, catalog));
    } else if (candidate.route === 'dsa') {
      sources.push(resolveEvidenceSource('dsa_progress', candidate.targetId, catalog));
    } else if (candidate.route === 'preparation') {
      sources.push(resolveEvidenceSource('preparation_progress', candidate.targetId, catalog));
    } else if (candidate.route === 'practice') {
      sources.push(resolveEvidenceSource('practice_session', candidate.targetId, catalog));
    }
  }

  if (sources.length === 0) {
    sources.push(
      makeDerivedSource(
        `derived:${candidate.id}`,
        'Derived from scheduler scoring',
        'This candidate was scored from aggregated state; no single record is attached to it.'
      )
    );
  }

  return buildEvidenceTrace({
    id: `candidate:${candidate.id}`,
    signal: signalKindForPriority(candidate.priority),
    label: candidate.title,
    why: candidate.reason,
    sources,
    route: candidate.route,
    targetId: candidate.targetId,
    catalog,
  });
}

/** Resolves a roadmap target id to whichever records exist for it. */
function collectTopicSourcesForTarget(
  targetId: string,
  catalog: EvidenceCatalog
): EvidenceSourceRef[] {
  const resolved = resolveRoadmapTarget(targetId, catalog.topics, catalog.taskDefinitions);
  if (resolved.topic) {
    const taskSources = resolved.taskId
      ? [resolveEvidenceSource('task_progress', resolved.taskId, catalog)]
      : [];
    return [...taskSources, ...collectTopicEvidenceSources(catalog, resolved.topic.id)];
  }
  if (resolved.taskId) return [resolveEvidenceSource('task_progress', resolved.taskId, catalog)];
  return [resolveEvidenceSource('task_progress', targetId, catalog)];
}

/** Analytics review prompts — aggregated prompts get their full contributing set. */
export function buildAnalyticsPromptTrace(
  prompt: { id: string; type: string; title: string; description: string; route: TraceRoute; targetId?: string },
  catalog: EvidenceCatalog
): EvidenceTrace {
  let sources: EvidenceSourceRef[] = [];
  let signal: SignalKind = 'progression';

  switch (prompt.type) {
    case 'overdue_review':
      signal = 'overdue_review';
      sources = collectOverdueReviewSources(catalog);
      break;
    case 'remediation_needed':
      signal = 'dsa_remediation';
      sources = collectRemediationSources(catalog);
      break;
    case 'stale_evidence':
      signal = 'stale_evidence';
      sources = collectStaleEvidenceSources(catalog);
      break;
    case 'repeated_postpone':
      signal = 'progression';
      sources = collectPostponedTaskSources(catalog);
      break;
    case 'low_independence':
      signal = 'dsa_remediation';
      sources = collectAssistedAttemptSources(catalog);
      break;
  }

  if (sources.length === 0 && prompt.targetId) {
    if (prompt.route === 'roadmap') {
      sources = collectTopicSourcesForTarget(prompt.targetId, catalog);
    } else if (prompt.route === 'dsa') {
      sources = [resolveEvidenceSource('dsa_progress', prompt.targetId, catalog)];
    } else if (prompt.route === 'skills') {
      sources = collectTopicEvidenceSources(catalog, prompt.targetId);
    }
  }

  if (sources.length === 0) {
    sources = [
      makeDerivedSource(
        `derived:${prompt.id}`,
        'Derived from telemetry aggregation',
        'Computed from windowed activity totals; no single record backs this prompt.'
      ),
    ];
  }

  return buildEvidenceTrace({
    id: `prompt:${prompt.id}`,
    signal,
    label: prompt.title,
    why: prompt.description,
    sources,
    route: prompt.route,
    targetId: prompt.targetId,
    catalog,
  });
}

/** Assessment weakness signal → the attempts that produced it. */
export function buildAssessmentWeaknessTrace(
  signal: { id: string; competency?: string; errorCategory: string; occurrences: number; lastSeenAt: string; sourceAttemptIds: string[]; domainId: string },
  catalog: EvidenceCatalog
): EvidenceTrace {
  const sources: EvidenceSourceRef[] = signal.sourceAttemptIds.map((attemptId) =>
    resolveEvidenceSource('assessment_attempt', attemptId, catalog)
  );

  // Empty reference list means the diagnosis never recorded where it came
  // from. A non-empty list whose records are gone keeps the (missing) entries
  // so the UI can report them as unavailable instead of erasing the trail.
  if (sources.length === 0) {
    sources.push(
      makeDerivedSource(
        `derived:${signal.id}`,
        'No attempt references recorded',
        'This signal carries no sourceAttemptIds, so it can only be shown as a derived diagnosis.'
      )
    );
  }

  const name = signal.competency || signal.errorCategory;
  return buildEvidenceTrace({
    id: `assessment-weakness:${signal.id}`,
    signal: 'assessment_weakness',
    label: `Assessment weakness: ${name}`,
    why: `${name} in ${signal.domainId} · seen ${signal.occurrences} time${
      signal.occurrences === 1 ? '' : 's'
    }, last ${signal.lastSeenAt.slice(0, 10)}.`,
    sources,
    route: 'assessment',
    catalog,
  });
}

/** Practice weakness → the exact attempt, plus its evidence log when linked. */
export function buildPracticeWeaknessTrace(
  attempt: PracticeAttempt,
  catalog: EvidenceCatalog
): EvidenceTrace {
  const sources: EvidenceSourceRef[] = [
    resolveEvidenceSource('practice_attempt', attempt.id, catalog),
  ];
  if (attempt.evidenceLogId) {
    sources.push(resolveEvidenceSource('evidence_log', attempt.evidenceLogId, catalog));
  }

  const passing = attempt.passingScorePct;
  const why = `${attempt.sessionTitle}: ${attempt.scorePct}% (${attempt.correctCount}/${attempt.totalQuestions} correct) — ${
    attempt.passed
      ? 'passed'
      : passing
      ? `below the ${passing}% pass mark`
      : 'not passed'
  }.`;

  return buildEvidenceTrace({
    id: `practice:${attempt.id}`,
    signal: 'practice_weakness',
    label: attempt.sessionTitle,
    why,
    sources,
    route: 'practice',
    catalog,
  });
}

/** Company requirement gap → the topic/domain records behind its strength. */
export function buildCompanyGapTrace(
  requirement: CompanyRequirementMapping,
  catalog: EvidenceCatalog
): EvidenceTrace {
  const sources: EvidenceSourceRef[] = [];

  if (requirement.topicId) {
    sources.push(...collectTopicEvidenceSources(catalog, requirement.topicId));
  } else if (requirement.domainId) {
    const topicIds = catalog.topics
      .filter((t) => t.domainId === requirement.domainId)
      .map((t) => t.id)
      .sort();
    for (const topicId of topicIds) {
      sources.push(...collectTopicEvidenceSources(catalog, topicId));
    }
  }

  if (sources.length === 0) {
    sources.push(
      makeDerivedSource(
        `derived:${requirement.requirementId}`,
        'Aggregated requirement rating',
        requirement.gapExplanation
      )
    );
  }

  return buildEvidenceTrace({
    id: `company-gap:${requirement.requirementId}`,
    signal: 'company_gap',
    label: `${requirement.requirementName} — ${requirement.statusLabel}`,
    why: `${requirement.requirementName}: ${requirement.statusLabel}, ${requirement.evidenceStrength}% evidence. ${requirement.gapExplanation}`,
    sources,
    route: requirement.recommendedAction.route,
    targetId: requirement.recommendedAction.targetId,
    classification: requirement.evidenceClassification,
    catalog,
  });
}

/**
 * Interview readiness dimension. `DimensionEvidence` rows are produced by
 * interviewReadinessEngine and carry no record id, so every entry is honestly
 * reported as derived rather than pointed at an invented record.
 */
export function buildInterviewDimensionTrace(
  dimension: ReadinessDimension,
  catalog: EvidenceCatalog
): EvidenceTrace {
  const sources: EvidenceSourceRef[] = dimension.evidenceItems.map((item, index) =>
    makeDerivedSource(
      `derived:${dimension.id}:${index}`,
      `${item.source}: ${item.description}`,
      `Freshness ${item.freshness} · no single record id recorded by the readiness engine`,
      item.timestamp,
      item.strength
    )
  );

  if (sources.length === 0) {
    sources.push(
      makeDerivedSource(
        `derived:${dimension.id}`,
        'No evidence recorded',
        dimension.gapExplanation
      )
    );
  }

  return buildEvidenceTrace({
    id: `interview:${dimension.id}`,
    signal: 'interview_readiness',
    label: `${dimension.shortName} readiness`,
    why: `${dimension.gapExplanation} Evidence ${dimension.evidenceStrength}%, confidence ${dimension.confidence}, freshness ${dimension.freshness}.`,
    sources,
    route: dimension.recommendedAction.route,
    targetId: dimension.recommendedAction.targetId,
    catalog,
  });
}

/** Project Lab defense evidence → every recorded defense attempt + its log. */
export function buildProjectDefenseTrace(catalog: EvidenceCatalog): EvidenceTrace {
  const attempts = catalog.practiceAttempts
    .filter((a) => a.category === 'project_defense')
    .map((a) => a.id)
    .sort();

  const sources: EvidenceSourceRef[] = [];
  for (const attemptId of attempts) {
    const attempt = catalog.practiceAttempts.find((a) => a.id === attemptId);
    if (!attempt) continue;
    sources.push(resolveEvidenceSource('practice_attempt', attempt.id, catalog));
    if (attempt.evidenceLogId) {
      sources.push(resolveEvidenceSource('evidence_log', attempt.evidenceLogId, catalog));
    }
  }

  if (sources.length === 0) {
    sources.push(
      makeDerivedSource(
        'derived:project-defense',
        'No defense session recorded',
        'Record a Project defense session to produce direct evidence for this signal.'
      )
    );
  }

  return buildEvidenceTrace({
    id: 'project-defense:all',
    signal: 'project_defense',
    label: 'Project defense evidence',
    why:
      attempts.length > 0
        ? `${attempts.length} recorded defense session${attempts.length === 1 ? '' : 's'} backing project readiness.`
        : 'No defense session has been recorded yet, so project readiness is derived from section completion only.',
    sources,
    route: 'project',
    catalog,
  });
}

/**
 * Roadmap lock explanation → the task-progress records that prove each
 * blocker's canonical state. Reuses `explainTaskLock` output verbatim for the
 * WHY, so prerequisite navigation and traceability can never disagree.
 */
export function buildRoadmapLockTrace(
  explanation: TaskLockExplanation,
  taskId: string,
  taskTitle: string,
  catalog: EvidenceCatalog
): EvidenceTrace | null {
  if (!explanation.isLocked) return null;

  const sources: EvidenceSourceRef[] = [resolveEvidenceSource('task_progress', taskId, catalog)];
  for (const blocker of explanation.blockers) {
    if (!blocker.prerequisiteTaskId) continue;
    sources.push(resolveEvidenceSource('task_progress', blocker.prerequisiteTaskId, catalog));
  }

  return buildEvidenceTrace({
    id: `roadmap-lock:${taskId}`,
    signal: 'roadmap_lock',
    label: `${taskTitle} is locked`,
    why: explanation.whyCannotStart,
    sources,
    route: 'roadmap',
    targetId: taskId,
    catalog,
  });
}
