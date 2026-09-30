import type { DomainId } from '../types';

/**
 * Phase milestones (A2 data correction).
 *
 * The roadmap's phase requirements were previously stated only as prose in
 * `PHASES.description`. These 17 records make each requirement explicit and
 * checkable: one record per concrete phase requirement, derived from the four
 * phase descriptions ("core CS fundamentals, DSA baseline patterns, Python
 * fluency, SQL queries, basic interview pitches" / "trees, graphs, DP, OS/CN
 * interview theory, SOLID OOP principles" / "timed OAs, mock rounds, speed
 * aptitude, project defense" / "drive prep, Leitner reviews, HR clearances,
 * placement simulations"), with OS and CN theory split into their own records
 * and the non-outcome phrase "topic walkthroughs" omitted.
 *
 * Pure data: nothing in the engines or views imports this file yet.
 * Every `references` entry is an ID that already exists in seed content.
 */

export interface PhaseMilestone {
  /** Stable identifier — safe to reference from future wiring. */
  id: string;
  phaseId: string;
  domainId: DomainId;
  title: string;
  /** Why this requirement exists in its phase. */
  description: string;
  /** Measurable pass condition, checkable against recorded task/attempt state. */
  criterion: string;
  /** Existing seed record IDs this milestone is anchored to (never invented). */
  references: string[];
}

export const PHASE_MILESTONES: PhaseMilestone[] = [
  // ---------------- Phase 1 (Sep 1 – Nov 30, 2026) ----------------
  {
    id: 'ms-p1-core-cs',
    phaseId: 'phase-1',
    domainId: 'dbms',
    title: 'Core CS fundamentals (DBMS, OS, CN, OOP)',
    description:
      'Phase-1 theory block covering ACID/isolation, CPU scheduling, OSI vs TCP/IP, and the four OOP pillars — primary domain DBMS, with OS, CN, and OOP carried by the same block.',
    criterion:
      'Tasks task-102, task-104, task-107, and task-114 all reach state "completed".',
    references: [
      'phase-1',
      'mod-dbms-1',
      'mod-os-1',
      'mod-cn-1',
      'mod-oop-1',
      'task-102',
      'task-104',
      'task-107',
      'task-114',
      'prep-dbms',
    ],
  },
  {
    id: 'ms-p1-dsa-baseline',
    phaseId: 'phase-1',
    domainId: 'dsa',
    title: 'DSA baseline patterns',
    description:
      'Arrays/two-pointers, sliding window, hashing, and linked-list reversal as the Phase-1 problem-solving baseline.',
    criterion:
      'Tasks task-101, task-111, task-112, and task-113 all reach state "completed".',
    references: [
      'phase-1',
      'mod-dsa-1',
      'mod-dsa-2',
      'topic-dsa-arrays',
      'topic-dsa-hashtable',
      'topic-dsa-linkedlist',
      'task-101',
      'task-111',
      'task-112',
      'task-113',
    ],
  },
  {
    id: 'ms-p1-python-fluency',
    phaseId: 'phase-1',
    domainId: 'python',
    title: 'Python fluency',
    description:
      'Idiomatic Python: comprehensions, generators, built-ins, and memory behavior for coding rounds.',
    criterion:
      'Task task-105 reaches state "completed" and preparation topic prep-lang meets its targetLevel of 4.',
    references: ['phase-1', 'mod-py-1', 'topic-py-basics', 'task-105', 'prep-lang'],
  },
  {
    id: 'ms-p1-sql-queries',
    phaseId: 'phase-1',
    domainId: 'sql',
    title: 'SQL queries',
    description:
      'Multi-table queries, joins, grouping, and subqueries as the Phase-1 SQL requirement.',
    criterion:
      'Task task-103 reaches state "completed" and preparation topic prep-sql meets its targetLevel of 4.',
    references: ['phase-1', 'mod-sql-1', 'topic-sql-joins', 'task-103', 'prep-sql'],
  },
  {
    id: 'ms-p1-interview-pitches',
    phaseId: 'phase-1',
    domainId: 'communication',
    title: 'Basic interview pitches',
    description:
      '90-second self-introduction and the first technical STAR stories — the Phase-1 "basic interview pitches" requirement.',
    criterion:
      'Task task-108 reaches state "completed" and the prep-comm checkpoint "Deliver the self-introduction in under 90 seconds" is met.',
    references: ['phase-1', 'mod-comm-1', 'topic-comm-star', 'task-108', 'prep-comm'],
  },

  // ---------------- Phase 2 (Dec 1, 2026 – Jan 31, 2027) ----------------
  {
    id: 'ms-p2-trees-graphs',
    phaseId: 'phase-2',
    domainId: 'dsa',
    title: 'Trees, BSTs & graphs deep-dive',
    description:
      'Phase-2 DSA deep-dive over traversals/BST and BFS/DFS/shortest-path patterns.',
    criterion:
      'Tasks task-201 and task-202 both reach state "completed" with at least one recorded attempt on each topic.',
    references: [
      'phase-2',
      'mod-dsa-3',
      'mod-dsa-4',
      'topic-dsa-trees',
      'topic-dsa-graphs',
      'task-201',
      'task-202',
    ],
  },
  {
    id: 'ms-p2-dynamic-programming',
    phaseId: 'phase-2',
    domainId: 'dsa',
    title: 'Dynamic programming deep-dive',
    description:
      'Phase-2 introduces DP problem-solving ahead of the Phase-3 DP module; 16 of the 29 topic-dsa-dp problems carry recommendedPhase 2.',
    criterion:
      'Every topic-dsa-dp problem with recommendedPhase 2 has an independent pass recorded.',
    references: ['phase-2', 'topic-dsa-dp'],
  },
  {
    id: 'ms-p2-os-theory',
    phaseId: 'phase-2',
    domainId: 'os',
    title: 'OS interview theory',
    description:
      'Paging, virtual memory, LRU replacement, semaphores, and the Coffman deadlock conditions.',
    criterion: 'Task task-204 reaches state "completed".',
    references: ['phase-2', 'mod-os-2', 'topic-os-memory', 'task-204', 'prep-os'],
  },
  {
    id: 'ms-p2-cn-theory',
    phaseId: 'phase-2',
    domainId: 'cn',
    title: 'CN interview theory',
    description:
      'TCP three-way handshake and teardown, HTTP/HTTPS status semantics, DNS resolution, and REST sockets.',
    criterion: 'Task task-205 reaches state "completed".',
    references: ['phase-2', 'mod-cn-2', 'topic-cn-web', 'task-205', 'prep-cn'],
  },
  {
    id: 'ms-p2-solid-oop',
    phaseId: 'phase-2',
    domainId: 'oop',
    title: 'SOLID OOP principles',
    description:
      'Refactoring toward single responsibility, open-closed, Liskov, interface segregation, and dependency inversion.',
    criterion:
      'Task task-206 reaches state "completed" and preparation topic prep-oop meets its targetLevel of 4.',
    references: ['phase-2', 'mod-oop-2', 'topic-oop-design', 'task-206', 'prep-oop'],
  },

  // ---------------- Phase 3 (Feb 1 – Mar 31, 2027) ----------------
  {
    id: 'ms-p3-timed-assessments',
    phaseId: 'phase-3',
    domainId: 'interviews',
    title: 'Timed online assessments & structured mock rounds',
    description:
      'The Phase-3 assessment gate: both timed sets plus the 45-minute technical screener under a countdown clock.',
    criterion:
      'practice-quant-timed-01 and practice-reasoning-timed-01 each recorded at ≥70% (their passing threshold), and task-302 reaches state "completed".',
    references: [
      'phase-3',
      'mod-mock-2',
      'topic-mock-screener',
      'task-302',
      'practice-quant-timed-01',
      'practice-reasoning-timed-01',
    ],
  },
  {
    id: 'ms-p3-speed-aptitude',
    phaseId: 'phase-3',
    domainId: 'aptitude',
    title: 'Speed aptitude under time pressure',
    description:
      'Quantitative and logical speed work in the canonical 15-question / 20-minute assessment format.',
    criterion:
      'Both timed aptitude sessions (15 questions / 20 minutes, passing 70) passed in recorded attempts.',
    references: [
      'phase-3',
      'practice-quant-timed-01',
      'practice-reasoning-timed-01',
      'prep-apt-quant',
      'prep-apt-reasoning',
      'topic-apt-work',
    ],
  },
  {
    id: 'ms-p3-project-defense',
    phaseId: 'phase-3',
    domainId: 'projects',
    title: 'Project defense',
    description:
      'Defend architecture decisions aloud against push-back — the Project Lab defense simulator session.',
    criterion:
      'A practice-project-defense-01 attempt recorded with score ≥80% (the session passing threshold).',
    references: [
      'phase-3',
      'practice-project-defense-01',
      'prep-interview-career',
      'topic-proj-rest',
    ],
  },

  // ---------------- Phase 4 (Apr 1 – May 31, 2027) ----------------
  {
    id: 'ms-p4-company-drives',
    phaseId: 'phase-4',
    domainId: 'interviews',
    title: 'Company-specific drive preparation',
    description:
      'Close the requirement gaps declared by the active target overlays (Amazon SDE-1, TCS Digital / CodeVita).',
    criterion:
      'Every required domain on comp-amazon and comp-tcs reaches "covered" requirement status.',
    references: ['phase-4', 'comp-amazon', 'comp-tcs'],
  },
  {
    id: 'ms-p4-leitner-sweep',
    phaseId: 'phase-4',
    domainId: 'dsa',
    title: 'Daily 4-box Leitner reviews',
    description:
      'Sustain retention with the 1/3/7/14-day review cadence instead of re-learning solved problems.',
    criterion:
      'Zero overdue Box 1 and Box 2 reviews; task task-401 reaches state "completed".',
    references: ['phase-4', 'mod-dsa-6', 'topic-dsa-leitner', 'task-401'],
  },
  {
    id: 'ms-p4-hr-clearance',
    phaseId: 'phase-4',
    domainId: 'interviews',
    title: 'HR clearances',
    description:
      'Resume defense and behavioral/HR rounds cleared before the final drive window.',
    criterion:
      'practice-resume-01 and practice-behavioral-01 each passed at their configured thresholds (75% and 80%).',
    references: [
      'phase-4',
      'prep-interview-career',
      'practice-resume-01',
      'practice-behavioral-01',
    ],
  },
  {
    id: 'ms-p4-drive-simulation',
    phaseId: 'phase-4',
    domainId: 'interviews',
    title: 'Placement simulations',
    description:
      'Full campus-drive round combining HR pitch, live coding, and project architecture defense.',
    criterion: 'Task task-402 reaches state "completed".',
    references: ['phase-4', 'mod-mock-3', 'topic-mock-final', 'task-402'],
  },
];
