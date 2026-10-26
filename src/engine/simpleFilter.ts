/**
 * PlacementOS Simple — Centralized Eligibility Policy (P1)
 *
 * Ensures that retired modules (Project Lab, Companies, Interview)
 * do not appear in the active learner journey, while preserving all underlying data.
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

export function isEligibleSimpleTask(task?: { id?: string; domainId?: string; route?: string } | null): boolean {
  if (!task) return false;
  if (task.id) {
    const tid = task.id.toLowerCase();
    if (tid.startsWith('proj') || tid.startsWith('int-') || tid.startsWith('interview')) {
      return false;
    }
  }
  if (isRetiredDomain(task.domainId)) return false;
  if (isRetiredRoute(task.route)) return false;
  return true;
}

export function isEligibleSimpleCandidate(candidate?: {
  task?: { id?: string; domainId?: string; route?: string };
  domainId?: string;
  route?: string;
  priority?: string;
} | null): boolean {
  if (!candidate) return false;
  if (candidate.priority === 'company_gap') return false;
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
  if (
    session.category === 'interviews' ||
    session.category === 'interview' ||
    session.category === 'projects' ||
    session.category === 'project' ||
    session.category === 'technical_interview' ||
    session.category === 'behavioral_interview' ||
    session.category === 'mock_interview' ||
    session.category === 'project_defense'
  ) {
    return false;
  }
  return true;
}
