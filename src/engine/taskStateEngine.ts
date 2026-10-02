import type { EvidenceLog, TaskDefinition, TaskProgress, TopicSkillState } from '../types';

/**
 * Daily-task defer/skip actions handled through the existing `updateTaskState`
 * path. They only touch the already-existing TaskProgress fields
 * (`postponeCount`, `skipCount`, `postponedUntil`) — no new persistence keys.
 *
 * - `postpone` defers the task using the engine's existing planning semantics:
 *   `getEvaluatedCandidates` excludes tasks whose `postponedUntil` is a future
 *   date, so a task postponed today returns to the plan once the date passes.
 * - `skip` records a friction/recovery signal (`skipCount`) without changing
 *   the task state, so the task is never treated as completed.
 *
 * Neither action emits evidence — and therefore neither produces a skill
 * update. Completion additionally derives a `skillUpdate` from its evidence
 * (task-completion EMA) so the adaptive weakness factor learns from ordinary
 * daily completions; the evening-seal duplicate guard lives at the bottom of
 * this module.
 */
export type TaskStateAction = 'postpone' | 'skip';

export interface TaskStateUpdateParams {
  taskId: string;
  /** Requested state. Ignored when `action` is set (existing state is preserved). */
  newState: TaskProgress['state'];
  action?: TaskStateAction;
  existing?: TaskProgress;
  /** Task definition — only needed to emit evidence on completion. */
  taskDef?: TaskDefinition;
  /**
   * Existing skill state for the task's topic, if any. Its `evidenceStrength`
   * seeds the completion EMA and its fields are preserved (freshness and
   * lastPracticedAt are refreshed on completion).
   */
  existingSkill?: TopicSkillState;
  /**
   * Strength of the bridged preparation skill state
   * (`getPreparationTopicIdByRoadmapId`), supplied by the caller only when the
   * roadmap topic has no skill state of its own. It seeds the first completion
   * EMA so a bridged preparation rating (e.g. 60) does not collapse into a
   * fresh own state of ~24 solely because the completion materialized it.
   */
  bridgedPrepStrength?: number;
  /** Epoch milliseconds — used for timestamps and evidence ids (deterministic in tests). */
  now: number;
  /** Today as YYYY-MM-DD — anchor used to schedule a postpone. */
  todayISO: string;
}

export interface TaskStateUpdateResult {
  progress: TaskProgress;
  /** Evidence log produced by this transition, or null when none is due. */
  evidence: EvidenceLog | null;
  /**
   * Skill-state update derived from `evidence` (task-completion EMA), or null
   * when no evidence is due — postpone/skip/reopen and unknown task
   * definitions never produce one. Computing it is pure: it never appends to
   * or mutates any evidence collection.
   */
  skillUpdate: TopicSkillState | null;
}

/** Adds one calendar day to a YYYY-MM-DD string (pure, timezone-independent). */
export function nextDayISO(dateISO: string): string {
  const [year, month, day] = dateISO.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, '0');
  const d = String(next.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface TaskPrerequisiteStatus {
  isBlocked: boolean;
  unmetPrerequisiteIds: string[];
}

/**
 * Evaluates whether a task has unmet prerequisite tasks using canonical taskProgress.
 * A prerequisite is satisfied only when taskProgressMap[prerequisiteId]?.state === 'completed'.
 */
export function evaluateTaskPrerequisites(
  task: TaskDefinition,
  taskProgressMap: Record<string, TaskProgress>
): TaskPrerequisiteStatus {
  const ids = task.prerequisiteTaskDefinitionIds ?? [];
  if (ids.length === 0) {
    return { isBlocked: false, unmetPrerequisiteIds: [] };
  }
  const unmetPrerequisiteIds = ids.filter(
    (prereqId) => taskProgressMap[prereqId]?.state !== 'completed'
  );
  return {
    isBlocked: unmetPrerequisiteIds.length > 0,
    unmetPrerequisiteIds,
  };
}

/**
 * Task-completion evidence → skill strength, using the existing task-completion
 * (evening-seal) EMA precedent:
 *
 *   newStrength = clamp(0.7 × oldStrength + 0.3 × evidenceScore)
 *
 * The DSA `+0.15` and practice `+0.20` additive formulas are intentionally not
 * used here. Pure — clamp only, no rounding, no state access.
 */
export function computeCompletionSkillStrength(
  oldStrength: number,
  evidenceScore: number
): number {
  return Math.min(100, Math.max(0, 0.7 * oldStrength + 0.3 * evidenceScore));
}

/**
 * Pure TaskProgress transition used by `PlacementContext.updateTaskState`.
 *
 * Plain state changes (start / complete / reopen) behave exactly as before:
 * completion stamps `lastCompletedAt` and emits a `daily_assignment` evidence
 * log (score 80, confidence 4) when the task definition is known.
 *
 * Completion additionally derives a `skillUpdate` for the log's topic from the
 * SAME evidence object (EMA above) — applied by `updateTaskState` in the same
 * state transaction, so evidence and skill state stay in lockstep and no
 * second evidence event is ever created.
 *
 * Postpone/skip actions preserve the current state, never emit evidence, and
 * only bump the existing defer/skip counters — consequently they produce no
 * skill update.
 */
export function applyTaskStateUpdate(params: TaskStateUpdateParams): TaskStateUpdateResult {
  const { taskId, newState, action, existing, taskDef, existingSkill, bridgedPrepStrength, now, todayISO } = params;
  const timestamp = new Date(now).toISOString();

  const base: TaskProgress = existing ?? {
    taskId,
    state: 'not_started',
    postponeCount: 0,
    skipCount: 0,
    timeSpentMinutes: 0,
    updatedAt: timestamp,
  };

  if (action === 'postpone') {
    return {
      progress: {
        ...base,
        postponeCount: base.postponeCount + 1,
        postponedUntil: nextDayISO(todayISO),
        updatedAt: timestamp,
      },
      evidence: null,
      skillUpdate: null,
    };
  }

  if (action === 'skip') {
    return {
      progress: {
        ...base,
        skipCount: base.skipCount + 1,
        updatedAt: timestamp,
      },
      evidence: null,
      skillUpdate: null,
    };
  }

  const isCompleting = newState === 'completed';

  // P0-01 — completion is idempotent. The STATE TRANSITION itself is the
  // duplicate test: a task that is already `completed` cannot enter
  // `completed` again, so it must not produce a second evidence event or a
  // second skill EMA. Deliberately no timestamps, no generated ids — the
  // guard is a property of the transition, not of when it ran. The evening
  // seal has an equivalent guard at the bottom of this module.
  if (isCompleting && existing?.state === 'completed') {
    return { progress: base, evidence: null, skillUpdate: null };
  }

  const progress: TaskProgress = {
    ...base,
    state: newState,
    lastCompletedAt: isCompleting ? timestamp : base.lastCompletedAt,
    updatedAt: timestamp,
  };

  const evidence: EvidenceLog | null =
    isCompleting && taskDef
      ? {
          id: `evidence-task-${now}`,
          topicId: taskDef.topicId,
          domainId: taskDef.domainId,
          score: 80,
          confidence: 4,
          timestamp,
          sourceType: 'daily_assignment',
          sourceId: taskId,
        }
      : null;

  // Skill update ⇔ evidence: derived from the SAME log (topicId, domainId,
  // score, timestamp). Seed precedence for the EMA: this topic's own state →
  // bridged preparation strength (first materialization only) → 0.
  let skillUpdate: TopicSkillState | null = null;
  if (evidence) {
    const oldStrength = existingSkill?.evidenceStrength ?? bridgedPrepStrength ?? 0;
    skillUpdate = {
      ...existingSkill,
      topicId: evidence.topicId,
      domainId: evidence.domainId,
      freshness: 'fresh',
      lastPracticedAt: evidence.timestamp,
      evidenceStrength: computeCompletionSkillStrength(oldStrength, evidence.score),
    };
  }

  return { progress, evidence, skillUpdate };
}

// ---------------------------------------------------------------------------
// Evening Reflection seal — per-assignment completion record
// ---------------------------------------------------------------------------

export interface SealAssignmentReflection {
  /** Assignment id — stays the `sourceId` of seal evidence (existing behaviour). */
  assignmentId: string;
  /** Whether the reflection marks the assignment completed. */
  completed: boolean;
  actualMinutes: number;
  /** Evidence score from `calculateEvidenceScore(...)` — computed by the caller. */
  score: number;
  confidence: 1 | 2 | 3 | 4 | 5;
}

export interface SealAssignmentParams {
  reflection: SealAssignmentReflection;
  task: TaskDefinition;
  /** Current progress for the task (pre-seal) — used for the duplicate guard. */
  existingProgress?: TaskProgress;
  /** Current skill state for the task's topic (pre-seal), if any. */
  existingSkill?: TopicSkillState;
  /** Epoch milliseconds — deterministic timestamps in tests. */
  now: number;
}

export interface SealAssignmentResult {
  progress: TaskProgress;
  /** Seal `daily_assignment` evidence, or null when already completed through Today. */
  evidence: EvidenceLog | null;
  /** Seal skill EMA update, or null when already completed through Today. */
  skillUpdate: TopicSkillState | null;
}

/**
 * Pure record for one Evening-Reflection seal assignment: TaskProgress +
 * EvidenceLog + skill-state EMA — the three writes `handleSeal` performs for a
 * task, preserved byte-for-byte (evidence id `evidence-<now>-<taskId>`,
 * `sourceId = assignmentId`, seal EMA `round(0.7 × old + 0.3 × score)`).
 *
 * Duplicate guard: a task already completed through the normal completion path
 * (`TaskProgress.state === 'completed'`) already produced its single
 * `daily_assignment` evidence event and skill EMA at completion time, so the
 * seal returns no evidence and no skill update for that completion — one
 * completion, one evidence event, one skill update. Progress bookkeeping is
 * always updated (unchanged seal behaviour); the seal's other behaviour
 * (assignment totals, DSA Leitner transitions) stays in the modal, untouched.
 */
export function applySealAssignmentCompletion(
  params: SealAssignmentParams
): SealAssignmentResult {
  const { reflection, task, existingProgress, existingSkill, now } = params;
  const timestamp = new Date(now).toISOString();

  const base: TaskProgress = existingProgress ?? {
    taskId: task.id,
    state: 'not_started',
    postponeCount: 0,
    skipCount: 0,
    timeSpentMinutes: 0,
    updatedAt: timestamp,
  };

  const progress: TaskProgress = {
    ...base,
    state: reflection.completed ? 'completed' : 'not_started',
    lastCompletedAt: reflection.completed ? timestamp : base.lastCompletedAt,
    timeSpentMinutes: base.timeSpentMinutes + reflection.actualMinutes,
    updatedAt: timestamp,
  };

  // Already completed through Today → evidence + skill were written at
  // completion time; never emit a second record for the same completion.
  if (existingProgress?.state === 'completed') {
    return { progress, evidence: null, skillUpdate: null };
  }

  const evidence: EvidenceLog = {
    id: `evidence-${now}-${task.id}`,
    topicId: task.topicId,
    domainId: task.domainId,
    score: reflection.score,
    confidence: reflection.confidence,
    timestamp,
    sourceType: 'daily_assignment',
    sourceId: reflection.assignmentId,
  };

  const skillUpdate: TopicSkillState = {
    ...existingSkill,
    topicId: task.topicId,
    domainId: task.domainId,
    freshness: 'fresh',
    lastPracticedAt: timestamp,
    evidenceStrength: Math.min(
      100,
      Math.max(0, Math.round((existingSkill?.evidenceStrength ?? 0) * 0.7 + reflection.score * 0.3))
    ),
  };

  return { progress, evidence, skillUpdate };
}

// ---------------------------------------------------------------------------
// Transactional undo — exact snapshot restore for Today's Undo controls
// ---------------------------------------------------------------------------

/**
 * Exact snapshot of everything ONE Today transaction is allowed to change.
 *
 * Captured by the caller *before* it issues the action, from the same render
 * that issues it, so it can never disagree with the transaction it reverses.
 *
 * Completion fills `skillTopicId` / `previousSkill` /
 * `priorCompletionEvidenceIds`; postpone and skip leave them unset because
 * neither ever writes evidence or a skill state.
 *
 * The skill value is a SNAPSHOT, never an inverse of the EMA: undo restores
 * the exact prior object instead of trying to derive `oldStrength` back out of
 * `0.7 × old + 0.3 × score`.
 */
export interface TaskStateRestore {
  taskId: string;
  /**
   * Exact `TaskProgress` captured before the action. `undefined` when the
   * task had no progress entry at all — restore then removes the entry rather
   * than inventing one.
   */
  previousProgress?: TaskProgress;
  /** Completion only: topic whose skill state the completion overwrote. */
  skillTopicId?: string;
  /**
   * Completion only: exact pre-completion skill state for `skillTopicId`.
   * `null` means the topic had no skill state before — restore removes the
   * state the completion materialized.
   */
  previousSkill?: TopicSkillState | null;
  /**
   * Completion only: ids of this task's completion evidence that already
   * existed when the transaction ran. Restore removes only completion
   * evidence that is NOT in this set — i.e. exactly what this transaction
   * added — so evidence from an earlier completion cycle, and every unrelated
   * evidence record, is left untouched.
   */
  priorCompletionEvidenceIds?: ReadonlySet<string>;
}

/** The three collections a Today transaction may write. */
export interface TaskStateSlice {
  taskProgress: Record<string, TaskProgress>;
  skillStates: Record<string, TopicSkillState>;
  evidenceLogs: EvidenceLog[];
}

/**
 * Completion evidence for a task, identified through the EXISTING source
 * metadata (`sourceType: 'daily_assignment'`, `sourceId: taskId`) rather than
 * a second evidence model. Evening-seal evidence shares the sourceType but
 * carries an `assignmentId` (`assign-<date>-<taskId>-<n>`), never the bare
 * task id, so it is never matched here.
 */
export function isTaskCompletionEvidence(log: EvidenceLog, taskId: string): boolean {
  return log.sourceType === 'daily_assignment' && log.sourceId === taskId;
}

/**
 * Reverses ONE captured transaction exactly, with no recomputation:
 *
 * - `taskProgress[taskId]` is set back to `previousProgress`, or removed when
 *   the task had no entry before. `postponeCount`, `skipCount`,
 *   `postponedUntil`, `lastCompletedAt`, `state` and `updatedAt` all return in
 *   one write because the whole object is restored, not patched field by field.
 * - `skillStates[skillTopicId]` is set back to the snapshot, or removed when
 *   the completion materialized it. No EMA is inverted and no other topic's
 *   skill state is touched.
 * - completion evidence added by the transaction is filtered out; anything
 *   already present in `priorCompletionEvidenceIds` and any non-completion
 *   evidence is preserved.
 *
 * Pure: it never mutates the inputs, never appends evidence and never derives
 * a skill value. Postpone/skip restores omit the completion fields, so they
 * touch task progress only.
 */
export function applyTaskStateRestore(
  restore: TaskStateRestore,
  state: TaskStateSlice
): TaskStateSlice {
  const taskProgress = { ...state.taskProgress };
  if (restore.previousProgress === undefined) {
    delete taskProgress[restore.taskId];
  } else {
    taskProgress[restore.taskId] = restore.previousProgress;
  }

  let skillStates = state.skillStates;
  if (restore.skillTopicId !== undefined) {
    skillStates = { ...state.skillStates };
    if (restore.previousSkill === null || restore.previousSkill === undefined) {
      delete skillStates[restore.skillTopicId];
    } else {
      skillStates[restore.skillTopicId] = restore.previousSkill;
    }
  }

  let evidenceLogs = state.evidenceLogs;
  if (restore.priorCompletionEvidenceIds !== undefined) {
    const prior = restore.priorCompletionEvidenceIds;
    evidenceLogs = state.evidenceLogs.filter(
      (log) => !(isTaskCompletionEvidence(log, restore.taskId) && !prior.has(log.id))
    );
  }

  return { taskProgress, skillStates, evidenceLogs };
}

/** Everything a capture reads, taken from the render that issues the action. */
export interface TaskRestoreSource {
  taskId: string;
  /** Task definition — only the completion capture needs it (skill topic). */
  taskDef?: TaskDefinition;
  taskProgress: Record<string, TaskProgress>;
  skillStates: Record<string, TopicSkillState>;
  evidenceLogs: EvidenceLog[];
}

/**
 * Postpone / skip capture. Neither action writes evidence or a skill state, so
 * the whole pre-action TaskProgress is all that is needed to reverse one.
 */
export function captureDeferRestore(source: TaskRestoreSource): TaskStateRestore {
  return { taskId: source.taskId, previousProgress: source.taskProgress[source.taskId] };
}

/**
 * Completion capture. Adds the topic's exact prior skill state and the ids of
 * this task's completion evidence that already exist, so undo restores the
 * snapshot verbatim and removes only the evidence this transaction adds.
 */
export function captureCompletionRestore(source: TaskRestoreSource): TaskStateRestore {
  const restore = captureDeferRestore(source);
  // Without a task definition the engine emits no evidence and no skill update.
  if (!source.taskDef) return restore;

  const topicId = source.taskDef.topicId;
  return {
    ...restore,
    skillTopicId: topicId,
    previousSkill: source.skillStates[topicId] ?? null,
    priorCompletionEvidenceIds: new Set(
      source.evidenceLogs
        .filter((log) => isTaskCompletionEvidence(log, source.taskId))
        .map((log) => log.id)
    ),
  };
}
