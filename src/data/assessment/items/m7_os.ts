import type { AssessmentItem } from '../../../types';

/**
 * M7: OS Concepts & Scenarios
 * 6 items, 10 minutes budget
 * Difficulty: 2 easy (diff 1-2), 2 medium (diff 3), 2 hard (diff 4)
 * Formats: MCQ, scenario
 */
export const M7_OS_ITEMS: AssessmentItem[] = [
  // --- Easy Items (2 items: 1 diff 1, 1 diff 2) ---
  {
    id: 'asm-os-001',
    domainId: 'os',
    topicId: 'prep-os',
    competency: 'cs-terminology',
    difficulty: 1,
    estimatedMinutes: 1.5,
    questionType: 'mcq',
    assessmentRole: 'anchor',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'Which memory allocation issue occurs when total free physical memory exceeds a process request, but the free space is fragmented into non-contiguous small blocks that cannot satisfy the contiguous allocation?',
    options: [
      'External fragmentation',
      'Internal fragmentation',
      'Thrashing',
      'Segmentation violation'
    ],
    key: 0,
    explanation: 'External fragmentation occurs when dynamic memory allocation leaves small, non-contiguous holes between allocated partitions, preventing a contiguous block request from being fulfilled.',
    errorCategories: ['E-TERM', 'cs-terminology'],
    origin: 'assessment',
  },
  {
    id: 'asm-os-002',
    domainId: 'os',
    topicId: 'prep-os',
    competency: 'cs-concept-gap',
    difficulty: 2,
    estimatedMinutes: 1.5,
    questionType: 'mcq',
    assessmentRole: 'anchor',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'In CPU scheduling, which scheduling algorithm is susceptible to the "convoy effect" where short I/O-bound processes are forced to wait behind a long CPU-bound process?',
    options: [
      'First-Come, First-Served (FCFS)',
      'Round Robin (RR) with a 10ms quantum',
      'Shortest Remaining Time First (SRTF)',
      'Multi-Level Feedback Queue (MLFQ)'
    ],
    key: 0,
    explanation: 'FCFS is non-preemptive. If a CPU-heavy process arrives first, all subsequent interactive and short I/O tasks are blocked behind it, resulting in poor device and CPU utilization.',
    errorCategories: ['E-CONCEPT', 'cs-concept-gap'],
    origin: 'assessment',
  },

  // --- Medium Items (2 items: diff 3) ---
  {
    id: 'asm-os-003',
    domainId: 'os',
    topicId: 'prep-os',
    competency: 'cs-scenario-reasoning',
    difficulty: 3,
    estimatedMinutes: 1.5,
    questionType: 'scenario',
    assessmentRole: 'branch',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'Scenario: A server with 8 GB RAM experiences sudden severe page fault spikes, causing CPU utilization to drop to 4% while disk swap I/O surges to 99%. What state is the OS experiencing and what is the primary mitigation?',
    options: [
      'Thrashing; reduce the degree of multiprogramming by suspending or swapping out processes to let remaining processes retain their working sets',
      'Deadlock; terminate all kernel worker threads',
      'Belady\'s Anomaly; double the virtual page table size',
      'Kernel Panic; increase the CPU timer interrupt frequency'
    ],
    key: 0,
    explanation: 'Thrashing occurs when active processes exceed available physical frames. The OS spends nearly all CPU time swapping pages between RAM and disk. Lowering the degree of multiprogramming restores working sets in RAM.',
    errorCategories: ['E-APPLY', 'cs-scenario-reasoning'],
    origin: 'assessment',
  },
  {
    id: 'asm-os-004',
    domainId: 'os',
    topicId: 'prep-os',
    competency: 'cs-concept-gap',
    difficulty: 3,
    estimatedMinutes: 1.5,
    questionType: 'mcq',
    assessmentRole: 'branch',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'Which of the following conditions is NOT one of Coffman\'s four necessary conditions for deadlock to occur?',
    options: [
      'Preemption of resources allowed',
      'Mutual exclusion',
      'Hold and wait',
      'Circular wait'
    ],
    key: 0,
    explanation: 'Coffman\'s four conditions are: 1. Mutual Exclusion, 2. Hold and Wait, 3. No Preemption (resources cannot be forcibly taken), and 4. Circular Wait. Allowing preemption prevents or breaks deadlock.',
    errorCategories: ['E-CONCEPT', 'cs-concept-gap'],
    origin: 'assessment',
  },

  // --- Hard Items (2 items: diff 4) ---
  {
    id: 'asm-os-005',
    domainId: 'os',
    topicId: 'prep-os',
    competency: 'cs-scenario-reasoning',
    difficulty: 4,
    estimatedMinutes: 2,
    questionType: 'scenario',
    assessmentRole: 'confirm',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'Scenario: Multiple concurrent threads running on distinct CPU cores frequently modify separate variables that happen to be located on the same 64-byte hardware cache line. What performance penalty occurs?',
    options: [
      'False Sharing, where hardware cache coherence protocols repeatedly invalidate and reload the cache line across cores despite distinct variables',
      'Priority Inversion, where background threads starve latency-sensitive threads',
      'Race condition causing undefined program memory corruptions',
      'Deadlock on the PCI-e bus'
    ],
    key: 0,
    explanation: 'False sharing occurs when independent variables share the same hardware cache line. Modifications by one core invalidate the entire line in other cores\' L1/L2 caches, causing expensive bus traffic and cache misses.',
    errorCategories: ['E-CONCEPT', 'cs-scenario-reasoning'],
    origin: 'assessment',
  },
  {
    id: 'asm-os-006',
    domainId: 'os',
    topicId: 'prep-os',
    competency: 'cs-concept-gap',
    difficulty: 4,
    estimatedMinutes: 2,
    questionType: 'mcq',
    assessmentRole: 'confirm',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'In virtual memory systems, what is Belady\'s Anomaly?',
    options: [
      'For certain page reference patterns under the FIFO page replacement algorithm, increasing the number of physical page frames results in MORE page faults',
      'Increasing virtual address space decreases physical memory fragmentation',
      'The LRU replacement algorithm causes higher fault rates than FIFO on all reference strings',
      'Page table translation using TLB lookups is slower than multi-level page table walking'
    ],
    key: 0,
    explanation: 'Belady\'s Anomaly describes the counterintuitive situation in which increasing the number of allocated physical frames increases the number of page faults when using the FIFO page replacement algorithm.',
    errorCategories: ['E-CONCEPT', 'cs-concept-gap'],
    origin: 'assessment',
  },
];
