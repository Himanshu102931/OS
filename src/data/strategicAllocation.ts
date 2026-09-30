import type { DomainId } from '../types';

/**
 * Strategic effort allocation (A1 data correction).
 *
 * Canonical split of the placement cycle's study effort across six groups.
 * This is a pure data record: no engine, view, or storage code reads it yet —
 * it exists so the allocation is stated once, explicitly, instead of being
 * implied ad hoc across notes.
 *
 * Invariants (validated by the data-correction scan):
 *   - `weightPct` sums to exactly 100.
 *   - Every one of the 11 domain IDs appears in exactly one group (no gap,
 *     no double-count) — `interviews` additionally covers company-overlay work,
 *     which has no domain of its own.
 */

export interface StrategicAllocationGroup {
  /** Stable identifier — safe to reference from future wiring. */
  id: string;
  name: string;
  description: string;
  /** Explicit membership: every DomainId assigned to exactly one group. */
  domainIds: DomainId[];
  /** Share of total study effort, in percent. Groups sum to 100. */
  weightPct: number;
}

export const STRATEGIC_ALLOCATION: StrategicAllocationGroup[] = [
  {
    id: 'alloc-dsa',
    name: 'DSA & Problem Solving',
    description:
      'Pattern-by-pattern LeetCode progression (150 problems across 17 patterns), Leitner spaced review, and remediation drills.',
    domainIds: ['dsa'],
    weightPct: 35,
  },
  {
    id: 'alloc-sql-python',
    name: 'SQL & Python Fluency',
    description:
      'Query writing, joins, window functions and CTEs on one side; idiomatic Python, built-ins, and comprehension fluency on the other.',
    domainIds: ['sql', 'python'],
    weightPct: 15,
  },
  {
    id: 'alloc-core-cs',
    name: 'Core CS Theory (DBMS, OS, CN, OOP)',
    description:
      'Interview theory blocks: ACID and normalization, scheduling and memory, networking foundations and protocols, SOLID and class design.',
    domainIds: ['dbms', 'os', 'cn', 'oop'],
    weightPct: 20,
  },
  {
    id: 'alloc-projects',
    name: 'Projects & Portfolio',
    description:
      'System/web project build-out, REST API architecture, and the Project Lab defense trail (kept deliberately bounded at 3–4h/wk).',
    domainIds: ['projects'],
    weightPct: 10,
  },
  {
    id: 'alloc-apt-communication',
    name: 'Aptitude & Communication',
    description:
      'Quantitative and logical aptitude drills (including the two timed sets) plus STAR stories, self-introduction, and verbal practice.',
    domainIds: ['aptitude', 'communication'],
    weightPct: 10,
  },
  {
    id: 'alloc-interviews-overlays',
    name: 'Mock Interviews & Company Overlays',
    description:
      'Mock/screener/final interview rounds together with company-specific overlay targeting (Amazon, TCS Digital / CodeVita).',
    domainIds: ['interviews'],
    weightPct: 10,
  },
];
