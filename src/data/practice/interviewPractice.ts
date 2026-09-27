import { makeSession } from './bank';

/**
 * Phase 2B — Interview readiness bank.
 * 24 technical-interview prompts (topic `prep-interview-tech`) + 12 resume checks
 * (category `resume`, topic `prep-interview-career`).
 */

export const INTERVIEW_SESSIONS = [
  makeSession({
    id: 'practice-interview-dsa-01',
    title: 'Technical Interview: DSA Explanation Drill',
    description: 'Twelve spoken-aloud algorithm questions: approach first, complexity second, code only after.',
    category: 'technical_interview',
    domainId: 'interviews',
    topicId: 'prep-interview-tech',
    minutes: 20,
    passing: 75,
    questions: [
      {
        id: 'q-ti-01',
        tag: 'Linked Lists',
        type: 'explanation',
        prompt: 'Explain how to reverse a singly linked list. State the approach, complexity, and the one edge case interviewers watch for.',
        explanation:
          'Iterate with prev/cur/next pointers, relinking cur.next to prev each step. O(N) time, O(1) space. Edge case: empty list or single node — prev must start as null and become the new head.',
        hint: 'Three pointers; guard the null head.',
      },
      {
        id: 'q-ti-02',
        tag: 'Binary Search',
        type: 'explanation',
        prompt: 'Your binary search loops forever on some inputs. What causes that, and how do you write it safely?',
        explanation:
          'Use `while (lo <= hi)` with `mid = lo + Math.floor((hi - lo) / 2)` and assign `lo = mid + 1` / `hi = mid - 1`. The infinite loop comes from `lo = mid` with a rounded-up mid, or from forgetting to move past mid.',
        hint: 'Every branch must shrink the range.',
      },
      {
        id: 'q-ti-03',
        tag: 'Linked Lists',
        type: 'explanation',
        prompt: 'How do you detect a cycle in a linked list, and how do you find where it starts? Give complexity.',
        explanation:
          'Floyd\'s algorithm: slow (1 step) and fast (2 steps) pointers — meeting proves a cycle. Reset one pointer to head and advance both one step; the meeting point is the cycle start. O(N) time, O(1) space.',
        hint: 'Tortoise and hare, then re-run from the head.',
      },
      {
        id: 'q-ti-04',
        tag: 'Dynamic Programming',
        type: 'explanation',
        prompt: 'Compare memoisation with tabulation. When would you choose each?',
        explanation:
          'Memoisation is top-down recursion with a cache — natural to write, may need a deep stack. Tabulation is bottom-up iteration — better cache locality and no recursion overhead. Choose memoisation for sparse state spaces, tabulation for tight loops.',
        hint: 'Recursive+cache vs iterative+table.',
      },
      {
        id: 'q-ti-05',
        tag: 'Arrays',
        type: 'explanation',
        prompt: 'Find the element that appears more than half the time in an array, in O(N) time and O(1) space. Explain the intuition.',
        explanation:
          'Boyer-Moore voting: keep a candidate and counter; increment on a match, decrement on a mismatch (resetting when zero). The majority element survives every cancellation. Verify with a second pass if majority is not guaranteed.',
        hint: 'Candidate plus counter.',
      },
      {
        id: 'q-ti-06',
        tag: 'Hashing',
        type: 'explanation',
        prompt: 'How does a hash map handle two keys that hash to the same bucket? What happens to lookup time then?',
        explanation:
          'Separate chaining (bucket becomes a list or balanced tree) or open addressing (probe for the next free slot). Collisions degrade average O(1) toward O(N) in the worst case, which is why load factor and a good hash function matter.',
        hint: 'Chaining vs probing.',
      },
      {
        id: 'q-ti-07',
        tag: 'Graphs',
        type: 'explanation',
        prompt: 'When is BFS preferable to DFS? Give one example of each.',
        explanation:
          'BFS finds shortest paths in unweighted graphs and explores level by level (social degree, levels-in-a-maze). DFS fits cycle detection, topological sorting and recursive decomposition (puzzles, directory walks).',
        hint: 'Breadth for distance, depth for structure.',
      },
      {
        id: 'q-ti-08',
        tag: 'Data Structures',
        type: 'explanation',
        prompt: 'Stack vs queue: define the discipline of each and give one real system that relies on it.',
        explanation:
          'Stack is LIFO — used for undo history, call stacks, expression evaluation. Queue is FIFO — used for task runners, print spooling, breadth-first level order. Say which operations are O(1): push/pop for stacks, enqueue/dequeue for queues.',
        hint: 'LIFO vs FIFO plus one system each.',
      },
      {
        id: 'q-ti-09',
        tag: 'Heaps',
        type: 'explanation',
        prompt: 'What is the time complexity of insert and extract-min in a binary min-heap? Why?',
        explanation:
          'Both are O(log N) because insertion places a leaf and bubbles it up at most the height, and extract-min replaces the root and sifts down the same height. Peak/min inspection is O(1).',
        hint: 'Height of the tree bounds both.',
      },
      {
        id: 'q-ti-10',
        tag: 'Problem Solving',
        type: 'interview_question',
        prompt: 'You have solved the problem but the sample test fails. Walk through your debugging steps in order.',
        explanation:
          'Reproduce minimally → print/trace the actual vs expected values at each step → check boundary inputs (empty, single element, duplicates, overflow) → verify loop bounds and off-by-one → re-read the problem statement for a missed constraint.',
        hint: 'Reproduce, instrument, then check boundaries.',
      },
      {
        id: 'q-ti-11',
        tag: 'Dynamic Programming',
        type: 'explanation',
        prompt: 'Solve "minimum coins for an amount" with dynamic programming: define state, transition, and complexity.',
        explanation:
          'State dp[a] = min coins for amount a; transition dp[a] = min(dp[a - c] + 1) over coins c ≤ a; base dp[0] = 0. Complexity O(amount × coins) time and O(amount) space.',
        hint: 'Define the table before the recurrence.',
      },
      {
        id: 'q-ti-12',
        tag: 'Recursion',
        type: 'explanation',
        prompt: 'Explain recursion to an interviewer: what is a base case, and what causes a stack overflow?',
        explanation:
          'A base case stops the self-calls; every other case must move toward it. Each call adds a stack frame holding parameters and locals, so unbounded depth or a missing base case exhausts the stack and throws.',
        hint: 'Termination plus progress toward it.',
      },
    ],
  }),

  makeSession({
    id: 'practice-interview-cs-01',
    title: 'Technical Interview: Core CS & System Design',
    description: 'Twelve discussion prompts: scaling, caching, reliability, concurrency, testing and operational metrics.',
    category: 'technical_interview',
    domainId: 'interviews',
    topicId: 'prep-interview-tech',
    minutes: 22,
    passing: 75,
    questions: [
      {
        id: 'q-ti-13',
        tag: 'System Design',
        type: 'interview_question',
        prompt: 'Design a URL shortener: describe the key components and the redirect path.',
        explanation:
          'POST → generate a short key (base62 of an auto-increment ID or a hash with a collision check) → store key→URL in a KV store. GET /:key → lookup → 301/302 redirect. Add a counter for analytics and a cache for hot keys.',
        hint: 'Key generation, storage, redirect, caching.',
      },
      {
        id: 'q-ti-14',
        tag: 'Databases',
        type: 'interview_question',
        prompt: 'When would you choose SQL and when would you choose NoSQL for the same feature?',
        explanation:
          'SQL for transactions, joins, strict schema and reporting consistency (payments, inventory). NoSQL for flexible/evolving documents, huge write throughput or denormalised access patterns (activity feeds). Start with the access pattern, not the trend.',
        hint: 'Access pattern and consistency needs decide.',
      },
      {
        id: 'q-ti-15',
        tag: 'Scaling',
        type: 'interview_question',
        prompt: 'A read-heavy API is saturating its database. Walk through your options in the order you would apply them.',
        explanation:
          '1) Add a read replica. 2) Cache hot reads (Redis/app cache) with a TTL. 3) Optimise the slow query / add the right index. 4) Denormalise or precompute aggregates. 5) Shard only when the previous steps stop helping.',
        hint: 'Cheapest lever first.',
      },
      {
        id: 'q-ti-16',
        tag: 'Distributed Systems',
        type: 'interview_question',
        prompt: 'Explain the CAP theorem in your own words with a concrete example.',
        explanation:
          'Under a network partition you must choose between consistency (every reader sees the latest write) and availability (every request gets a response). Example: a partitioned payment service can refuse writes for correctness or accept them and risk divergence.',
        hint: 'The choice only appears during a partition.',
      },
      {
        id: 'q-ti-17',
        tag: 'Caching',
        type: 'interview_question',
        prompt: 'Where can you place a cache, and what is the invalidation trade-off at each layer?',
        explanation:
          'Browser (max-age, hard to invalidate), CDN (TTL + purge API), application (fast, must handle stampedes), database buffer pool (transparent, still memory-bound). Prefer time-based expiry with explicit purge for correctness-critical data.',
        hint: 'Each layer moves staleness vs speed differently.',
      },
      {
        id: 'q-ti-18',
        tag: 'API Design',
        type: 'interview_question',
        prompt: 'What makes a REST API idempotent, and why does it matter for retries?',
        explanation:
          'Repeating the request leaves the server in the same state: GET, PUT, DELETE are idempotent; POST is not. Retries after a timeout are safe only for idempotent calls, which is why clients send an idempotency key with POSTs.',
        hint: 'Think about safe retries after timeouts.',
      },
      {
        id: 'q-ti-19',
        tag: 'Concurrency',
        type: 'interview_question',
        prompt: 'Explain the difference between concurrency and parallelism.',
        explanation:
          'Concurrency is structuring a program so tasks can interleave (many tasks in flight); parallelism is executing them at the same instant on multiple cores. A single-core server is concurrent; a multicore cluster is parallel.',
        hint: 'Interleaving vs simultaneous execution.',
      },
      {
        id: 'q-ti-20',
        tag: 'Memory',
        type: 'explanation',
        prompt: 'Stack vs heap, and what actually happens in a memory leak?',
        explanation:
          'Stack holds call frames (locals, parameters) and is freed on return; heap holds objects allocated at runtime and reclaimed by the GC. A leak is memory that stays reachable but is never used again — the collector cannot free it.',
        hint: 'Reachability is the key word.',
      },
      {
        id: 'q-ti-21',
        tag: 'Testing',
        type: 'interview_question',
        prompt: 'How would you test a payment-critical feature? Describe your test pyramid for it.',
        explanation:
          'Many unit tests for amount/tax/rounding logic, integration tests against a test double for the gateway covering success, decline and timeout, and a handful of end-to-end tests. Explicitly test retries, idempotency and double-charge prevention.',
        hint: 'Unit breadth, integration depth, few E2E.',
      },
      {
        id: 'q-ti-22',
        tag: 'Observability',
        type: 'interview_question',
        prompt: 'Which metrics do you monitor for a public API, and what alert would you set?',
        explanation:
          'RED: request rate, error rate, duration (p50/p95/p99). Alert on p95 latency breaching SLO for 5 minutes or a 5xx spike above baseline, with a dashboard breaking down by endpoint and status.',
        hint: 'Rate, errors, duration — percentiles, not averages.',
      },
      {
        id: 'q-ti-23',
        tag: 'Reliability',
        type: 'interview_question',
        prompt: 'A downstream microservice starts timing out. How do you keep your service healthy?',
        explanation:
          'Short timeouts so threads are not exhausted, retries with jitter and a budget, a circuit breaker that fails fast while it is down, a fallback response or cache, and explicit degradation of the dependent feature rather than the whole API.',
        hint: 'Timeout, retry, break, fallback.',
      },
      {
        id: 'q-ti-24',
        tag: 'Rate Limiting',
        type: 'interview_question',
        prompt: 'Explain how a token bucket rate limiter works and where you would apply it.',
        explanation:
          'Tokens are added at a fixed rate up to a bucket capacity; each request consumes one, and a request is rejected when the bucket is empty. It allows short bursts up to capacity while enforcing the sustained rate — apply it at the API gateway and on expensive endpoints.',
        hint: 'Sustained rate plus burst allowance.',
      },
    ],
  }),

  makeSession({
    id: 'practice-resume-01',
    title: 'Resume Audit Checklist — 12 Verified Checks',
    description: 'Run every check against your own résumé and record which ones pass before applying to any company.',
    category: 'resume',
    domainId: 'interviews',
    topicId: 'prep-interview-career',
    minutes: 25,
    passing: 75,
    questions: [
      {
        id: 'q-res-01',
        tag: 'Achievement Bullets',
        type: 'self_evaluation',
        prompt: 'Check: does every experience and project bullet contain both a strong action verb and a measurable outcome?',
        explanation:
          'Passing form: "Cut API p95 latency from 800ms to 220ms by adding a Redis cache." Failing form: "Worked on the backend." Numbers convert duties into impact.',
        hint: 'Verb + metric, every line.',
      },
      {
        id: 'q-res-02',
        tag: 'Length',
        type: 'self_evaluation',
        prompt: 'Check: is your résumé a single page for fresher / under-5-years experience?',
        explanation:
          'Recruiters scan in seconds and ATS previews truncate. One page means ruthless trimming: keep the strongest 3-4 bullets per role, drop coursework and objective statements.',
        hint: 'Trim to the strongest evidence.',
      },
      {
        id: 'q-res-03',
        tag: 'ATS Safety',
        type: 'self_evaluation',
        prompt: 'Check: is the file ATS-parseable — no multi-column layouts, tables, text boxes or images of text?',
        explanation:
          'Two-column designs and graphical headers often parse in scrambled order. Use a single column, standard headings, and a real text file (.docx or ATS-safe PDF).',
        hint: 'Machines read it before humans do.',
      },
      {
        id: 'q-res-04',
        tag: 'Verb Tense',
        type: 'self_evaluation',
        prompt: 'Check: are tenses consistent — present for current roles, past for completed ones?',
        explanation:
          'Current job: "develop", "own". Previous job: "developed", "led". Mixed tenses inside one role are the fastest way to look careless.',
        hint: 'Now = present, then = past.',
      },
      {
        id: 'q-res-05',
        tag: 'Targeting',
        type: 'self_evaluation',
        prompt: 'Check: does your summary or headline match the exact role you are applying for?',
        explanation:
          'A generic "aspiring engineer" headline is weak. Mirror the job description\'s core keywords — that also improves ATS keyword matches.',
        hint: 'Mirror the job description.',
      },
      {
        id: 'q-res-06',
        tag: 'Skills Honesty',
        type: 'self_evaluation',
        prompt: 'Check: can you defend every skill listed, at the level you implied?',
        explanation:
          'Anything on the résumé is fair game in the interview. List what you can discuss and use — put exposure-level items under "familiar with" rather than core skills.',
        hint: 'Everything listed is an interview question.',
      },
      {
        id: 'q-res-07',
        tag: 'Brevity',
        type: 'self_evaluation',
        prompt: 'Check: does each bullet stay under roughly 25 words and fit on one line?',
        explanation:
          'Long bullets bury the achievement. Split into two bullets if you genuinely need two claims — never run three lines of small text.',
        hint: 'One claim per bullet.',
      },
      {
        id: 'q-res-08',
        tag: 'Links',
        type: 'self_evaluation',
        prompt: 'Check: do your project entries link to a live demo and a clean repository README?',
        explanation:
          'The README needs a problem statement, setup steps, screenshots and architecture notes. A repo with no README reads as an unfinished experiment.',
        hint: 'Working link plus a readable README.',
      },
      {
        id: 'q-res-09',
        tag: 'Contact Block',
        type: 'self_evaluation',
        prompt: 'Check: is your contact block complete — professional email, phone, LinkedIn URL, GitHub URL, location?',
        explanation:
          'Use a plain professional email address, and full profile URLs rather than a bare username so the recruiter needs zero searching.',
        hint: 'Clickable URLs, professional email.',
      },
      {
        id: 'q-res-10',
        tag: 'Education',
        type: 'self_evaluation',
        prompt: 'Check: does the education section state degree, college, graduation year and CGPA/percentage (if the drive asks for it)?',
        explanation:
          'Keep it compact — one or two lines. If your college uses a percentage, convert to CGPA when the application form expects one, and stay consistent everywhere.',
        hint: 'Degree, institute, year, score.',
      },
      {
        id: 'q-res-11',
        tag: 'Proofreading',
        type: 'self_evaluation',
        prompt: 'Check: have you proofread for spelling, grammar and inconsistent capitalisation of technologies?',
        explanation:
          'Read it backwards sentence by sentence, or paste it into a reader that is not you. Standardise names: Node.js, PostgreSQL, PostgreSQL ORM — not three spellings across the page.',
        hint: 'Read backwards to break autocorrect blindness.',
      },
      {
        id: 'q-res-12',
        tag: 'Section Order',
        type: 'self_evaluation',
        prompt: 'Check: is the section order optimised for a fresher — skills and projects before education?',
        explanation:
          'For a fresher the strongest evidence is projects: put Skills → Projects → Experience → Education → Achievements so the recruiter sees proof before pedigree.',
        hint: 'Lead with evidence of building.',
      },
    ],
  }),
];
