import type { AssessmentItem } from '../../../types';

/**
 * M10: Interview Knowledge
 * 5 items, 10 minutes budget
 * Difficulty: 2 easy (diff 1-2), 2 medium (diff 3), 1 hard (diff 4)
 * Formats: MCQ, scenario, structured written response
 * Scope: Class B interview-knowledge construct (§22: knowledge-only, provisional)
 */
export const M10_INTERVIEWS_ITEMS: AssessmentItem[] = [
  // --- Easy Items (2 items: 1 diff 1, 1 diff 2) ---
  {
    id: 'asm-int-001',
    domainId: 'interviews',
    topicId: 'prep-interview-career',
    competency: 'int-structure-gap',
    difficulty: 1,
    estimatedMinutes: 1.5,
    questionType: 'mcq',
    assessmentRole: 'anchor',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'In behavioral and situational interviews, what does the STAR framework represent, and which section should receive the greatest portion of your speaking time?',
    options: [
      'Situation, Task, Action, Result; with the majority of time dedicated to the Action (your concrete technical contribution)',
      'Strategy, Tactics, Assessment, Review; with the majority of time on Strategy',
      'Situation, Timeline, Analysis, Resolution; with the majority of time on Timeline',
      'Scope, Team, Architecture, Release; with the majority of time on Architecture'
    ],
    key: 0,
    explanation: 'STAR stands for Situation, Task, Action, Result. Interviewers evaluate individual capability, so 60-70% of response time should focus on Action (specific technical decisions, trade-offs, and steps you personally led), followed by quantified Results.',
    errorCategories: ['E-TERM', 'int-structure-gap'],
    origin: 'assessment',
  },
  {
    id: 'asm-int-002',
    domainId: 'interviews',
    topicId: 'prep-interview-tech',
    competency: 'int-tech-knowledge-gap',
    difficulty: 2,
    estimatedMinutes: 1.5,
    questionType: 'mcq',
    assessmentRole: 'anchor',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'When an interviewer presents an intentionally open-ended or ambiguous coding problem statement, what is the best immediate response?',
    options: [
      'Ask clarifying questions about input scale, data types, negative numbers, duplicates, and constraints, then trace a concrete test case before writing code',
      'Immediately start typing code in the editor to demonstrate coding speed',
      'State that the problem description is defective and request a different problem',
      'Remain silent for 5 minutes while planning the complete solution in your head'
    ],
    key: 0,
    explanation: 'Interviewers intentionally omit constraints to evaluate requirement-gathering and communication skills. Proactively clarifying input boundaries, edge cases, and time/space constraints displays engineering discipline.',
    errorCategories: ['E-CONCEPT', 'int-tech-knowledge-gap'],
    origin: 'assessment',
  },

  // --- Medium Items (2 items: diff 3) ---
  {
    id: 'asm-int-003',
    domainId: 'interviews',
    topicId: 'prep-interview-career',
    competency: 'int-scenario-judgment',
    difficulty: 3,
    estimatedMinutes: 2,
    questionType: 'scenario',
    assessmentRole: 'branch',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'Scenario: An interviewer asks: "Tell me about a time a project you worked on failed or missed a milestone." Which response strategy is most credible and effective?',
    options: [
      'Own the outcome honestly without blaming others, explain the specific misjudgment or technical factor, detail how you adapted under pressure, and share concrete safeguards you instituted afterward',
      'Insist that you have never failed or missed a deadline because your work is always planned flawlessly',
      'Attribute the failure entirely to uncooperative teammates and unclear managerial directives',
      'Describe a trivial failure (such as misplacing a notebook) to avoid revealing real development mistakes'
    ],
    key: 0,
    explanation: 'Strong candidates demonstrate accountability, self-awareness, and resilience. Interviewers value candidates who analyze failures constructively and implement lasting preventative measures.',
    errorCategories: ['E-APPLY', 'int-scenario-judgment'],
    origin: 'assessment',
  },
  {
    id: 'asm-int-004',
    domainId: 'interviews',
    topicId: 'prep-interview-tech',
    competency: 'int-tech-knowledge-gap',
    difficulty: 3,
    estimatedMinutes: 2,
    questionType: 'mcq',
    assessmentRole: 'branch',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'During a system design interview for a high-volume read-heavy service (e.g. 20,000 queries per second with a requirement of sub-10ms response time), which architectural component is essential in front of the database?',
    options: [
      'Distributed in-memory caching cluster (e.g. Redis / Memcached) with an eviction policy like LRU',
      'Relational database replica with 128 virtual CPU cores and synchronous replication',
      'Flat JSON files stored on network-attached storage (NAS)',
      'Client-side sleep delays to throttle incoming user requests'
    ],
    key: 0,
    explanation: 'In-memory caches (Redis/Memcached) serve read-heavy queries in sub-millisecond time directly from RAM, absorbing 90%+ of read traffic and shielding relational databases from overload.',
    errorCategories: ['E-CONCEPT', 'int-tech-knowledge-gap'],
    origin: 'assessment',
  },

  // --- Hard Items (1 item: diff 4) ---
  {
    id: 'asm-int-005',
    domainId: 'interviews',
    topicId: 'prep-interview-tech',
    competency: 'int-structure-gap',
    difficulty: 4,
    estimatedMinutes: 3,
    questionType: 'structured_written',
    assessmentRole: 'confirm',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'rubric', weight: 1, rubricId: 'rubric-int-tradeoff-explanation' },
    prompt: 'When an interviewer asks you to justify choosing a NoSQL database (such as MongoDB or DynamoDB) over a relational database (such as PostgreSQL) for a new service, what is the best structured explanation?\n\nStructure:\n1. Two scenarios where NoSQL is genuinely advantageous.\n2. Two trade-offs or constraints you accept.\n3. The guiding engineering principle behind the choice.',
    options: [
      'NoSQL is advantageous for horizontal partition scaling and flexible schema models; it trades off multi-table ACID transactions and expressive SQL joins; choice must be driven by data access patterns and scaling limits rather than novelty.',
      'NoSQL is always faster than SQL because it uses JSON without transactions.',
      'Relational databases are deprecated for cloud-native applications.',
      'NoSQL requires zero database design or index planning.'
    ],
    key: 0,
    explanation: 'Rubric Criteria:\n1. Advantages: Horizontal scaling via partition keys, high write throughput, and schema flexibility for polymorphic data.\n2. Trade-offs: Eventual consistency over strict multi-table ACID transactions, lack of declarative JOINs requiring application-level denormalization.\n3. Principle: Base storage selection on explicit access patterns, query complexity, and scalability limits, not hype.',
    errorCategories: ['E-APPLY', 'int-structure-gap'],
    origin: 'assessment',
  },
];
