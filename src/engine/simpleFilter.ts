/**
 * PlacementOS Simple — Centralized Eligibility Policy (P1)
 *
 * Ensures that retired modules (Project Lab, Companies, Interview)
 * do not appear in the active learner journey, while preserving all underlying data.
 *
 * Uses stable canonical metadata (domainId, category, route, taskType, and ID prefixes).
 * Does NOT rely on title or descriptive text matching, protecting legitimate learning topics.
 */

export const RETIRED_DOMAIN_IDS = Object.freeze([
  'projects',
  'project',
  'proj',
  'interviews',
  'interview',
  'int',
  'companies',
  'company',
] as const);

export const RETIRED_ROUTE_PATHS = Object.freeze(['project', 'companies', 'interview'] as const);

export const RETIRED_PRACTICE_CATEGORIES = Object.freeze([
  'interviews',
  'interview',
  'projects',
  'project',
  'technical_interview',
  'behavioral_interview',
  'mock_interview',
  'project_defense',
] as const);

export type RetiredDomainId = (typeof RETIRED_DOMAIN_IDS)[number];
export type RetiredRoutePath = (typeof RETIRED_ROUTE_PATHS)[number];

export function isRetiredDomain(domainId?: string | null): boolean {
  if (!domainId) return false;
  const d = domainId.toLowerCase();
  return (
    (RETIRED_DOMAIN_IDS as readonly string[]).includes(d) ||
    d === 'proj' ||
    d === 'projects' ||
    d === 'interview' ||
    d === 'interviews' ||
    d === 'int' ||
    d === 'companies' ||
    d === 'company'
  );
}

export function isRetiredRoute(route?: string | null): boolean {
  if (!route) return false;
  return (RETIRED_ROUTE_PATHS as readonly string[]).includes(route);
}

export function isEligibleSimpleDomain(domainId?: string | null): boolean {
  return !isRetiredDomain(domainId);
}

export function isEligibleSimpleRoute(route?: string | null): boolean {
  return !isRetiredRoute(route);
}

export function isEligibleSimpleTask(task?: {
  id?: string;
  domainId?: string;
  route?: string;
  taskType?: string;
} | null): boolean {
  if (!task) return false;
  if (task.id) {
    const tid = task.id.toLowerCase();
    if (tid.startsWith('proj') || tid.startsWith('int-') || tid.startsWith('interview-')) {
      return false;
    }
  }
  if (task.taskType && (task.taskType === 'project' || task.taskType === 'interview')) {
    return false;
  }
  if (isRetiredDomain(task.domainId)) return false;
  if (isRetiredRoute(task.route)) return false;
  return true;
}

export function isEligibleSimpleCandidate(candidate?: {
  task?: { id?: string; domainId?: string; route?: string; taskType?: string };
  domainId?: string;
  route?: string;
  priority?: string;
} | null): boolean {
  if (!candidate) return false;
  if (candidate.task && !isEligibleSimpleTask(candidate.task)) return false;
  if (isRetiredDomain(candidate.domainId)) return false;
  if (isRetiredRoute(candidate.route)) return false;
  return true;
}

export function isEligibleSimplePracticeSession(session?: {
  id?: string;
  domainId?: string;
  category?: string;
} | null): boolean {
  if (!session) return false;
  if (session.id) {
    const sid = session.id.toLowerCase();
    if (sid.startsWith('ps-interview') || sid.startsWith('ps-proj')) {
      return false;
    }
  }
  if (isRetiredDomain(session.domainId)) return false;
  if (session.category && (RETIRED_PRACTICE_CATEGORIES as readonly string[]).includes(session.category)) {
    return false;
  }
  return true;
}

export function isEligibleSimpleDailyAssignment(
  assignment?: { referenceId?: string; domainId?: string; taskType?: string } | null,
  tasks?: Array<{ id: string; domainId: string }>
): boolean {
  if (!assignment) return false;
  if (assignment.domainId && isRetiredDomain(assignment.domainId)) return false;
  if (assignment.taskType && (assignment.taskType === 'project' || assignment.taskType === 'interview')) {
    return false;
  }
  if (assignment.referenceId) {
    const ref = assignment.referenceId.toLowerCase();
    if (ref.startsWith('proj') || ref.startsWith('int-') || ref.startsWith('interview-')) {
      return false;
    }
    if (tasks) {
      const matched = tasks.find((t) => t.id === assignment.referenceId);
      if (matched && isRetiredDomain(matched.domainId)) return false;
    }
  }
  return true;
}

export function isEligibleSimpleReviewCandidate(candidate?: {
  id?: string;
  domainId?: string;
  route?: string;
  priority?: string;
  type?: string;
  targetId?: string;
} | null): boolean {
  if (!candidate) return false;
  if (isRetiredDomain(candidate.domainId)) return false;
  if (isRetiredRoute(candidate.route)) return false;
  if (candidate.type === 'project' || candidate.type === 'interview') return false;
  if (candidate.targetId) {
    const tid = candidate.targetId.toLowerCase();
    if (tid.startsWith('proj') || tid.startsWith('int-') || tid.startsWith('interview-')) {
      return false;
    }
  }
  return true;
}

export function isEligibleSimplePreparationSection(section?: { id?: string } | null): boolean {
  if (!section || !section.id) return false;
  return section.id !== 'interview_career';
}

export function isEligibleSimplePreparationTopic(topic?: {
  id?: string;
  sectionId?: string;
  domainId?: string;
} | null): boolean {
  if (!topic) return false;
  if (topic.sectionId === 'interview_career') return false;
  if (isRetiredDomain(topic.domainId)) return false;
  if (topic.id) {
    const tid = topic.id.toLowerCase();
    if (tid.startsWith('prep-interview') || tid.startsWith('prep-proj')) {
      return false;
    }
  }
  return true;
}
