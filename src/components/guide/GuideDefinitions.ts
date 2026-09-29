/**
 * PlacementOS Guide System — Comprehensive Page Guide Definitions
 *
 * Defines interactive walkthrough steps across all 10 major pages.
 * Targets correspond to real UI selectors, and steps explain actual capabilities.
 * Zero state mutations or progress changes are caused by these definitions.
 */

import type { PageGuideDefinition } from './GuideTypes';

export const PAGE_GUIDE_DEFINITIONS: PageGuideDefinition[] = [
  // 1. TODAY (Dashboard)
  //
  // Every target below is a real `data-guide-target` written by DashboardView /
  // TodayHeroVisual / CompletionAnimation, so the spotlight always lands on a
  // live element. Placement prefers right → left → below → above (see
  // guidePlacement.ts), which keeps the popover outside the highlighted target
  // — including the primary task card, the Daily Control Scene and Complete.
  {
    route: 'dashboard',
    title: 'Today / Operational Workspace',
    sections: [
      {
        title: 'Daily Context & Planning',
        steps: [
          {
            id: 'today-purpose',
            title: 'Today — Your Daily Operational Center',
            description: 'Today answers one question: what should you work on right now? It surfaces the single highest-leverage task from everything still pending.',
            detail: 'The deterministic 6-factor engine scores every candidate: 0.25×Urgency + 0.20×Weakness + 0.20×Importance + 0.15×Company + 0.10×Spaced Rep + 0.10×Recovery. No randomness, no opaque AI.',
            target: '[data-guide-target="today-header"]',
            placement: 'right',
          },
          {
            id: 'today-phase-mode',
            title: 'Active Phase & Placement Mode',
            description: 'Your current curriculum phase and the placement mode driving today’s expectations and task volume.',
            detail: 'Modes: Normal, Reduced (heavy college load), Exam (keeps review cadence with minimal drills) and Placement Sprint.',
            target: '[data-guide-target="today-phase-mode"]',
            placement: 'right',
          },
          {
            id: 'today-budget',
            title: 'Daily Study Budget',
            description: 'The minutes you have committed for today. Everything planned below is sized against this budget.',
            detail: 'If the day is not planned yet, Today falls back to the default budget instead of inventing one for you.',
            target: '[data-guide-target="today-budget"]',
            placement: 'right',
          },
          {
            id: 'today-plan-button',
            title: 'Plan Today',
            description: 'Opens the morning planning ritual: set your available minutes and commit the tasks you want in today’s plan.',
            detail: 'Until a plan is committed, the plan section below honestly shows "Up Next" from your roadmap rather than a fabricated schedule.',
            target: '[data-guide-target="today-plan-button"], [data-testid="plan-today-button"]',
            placement: 'bottom',
          },
        ],
      },
      {
        title: 'Primary Recommendation',
        steps: [
          {
            id: 'today-primary-action',
            title: 'Primary Recommended Task',
            description: 'The one task worth doing now — the highest-scoring candidate in the live queue, re-evaluated on every state change.',
            detail: 'This is the only decision Today asks you to make. Title, explanation and every action control stay clickable while the tour is open.',
            target: '[data-guide-target="today-primary"]',
            placement: 'right',
          },
          {
            id: 'today-why-task',
            title: 'Why This Task? Transparent Scoring',
            description: 'The exact factors that put this task above every other pending candidate, next to its priority score.',
            detail: 'Every recommendation is explainable and reproducible — same inputs, same score, no silent schedule rewrites.',
            target: '[data-guide-target="today-why-task"]',
            placement: 'right',
          },
        ],
      },
      {
        title: 'Daily Control Scene & Signals',
        steps: [
          {
            id: 'today-hero-scene',
            title: 'Daily Control Scene',
            description: 'An atmospheric map of your preparation territory: your primary focus at the center, domain nodes in orbit, momentum rings around them.',
            detail: 'It is a read-out, not decoration — node color and pulse state mirror the same live candidate data shown on the left.',
            target: '[data-guide-target="today-hero-scene"]',
            placement: 'left',
          },
          {
            id: 'today-domain-nodes',
            title: 'Domain Nodes',
            description: 'Each orbiting node is a placement domain (DSA, Python, SQL, OOP, DBMS, …). Nodes pulse when they have somewhere to go.',
            detail: 'The center node is your current primary task. Click any actionable node to jump straight to that domain — the guide never navigates for you.',
            target: '[data-guide-target="today-domain-nodes"]',
            placement: 'left',
            allowInteraction: true,
          },
          {
            id: 'today-daily-journey',
            title: 'Daily Journey',
            description: 'Today’s execution lifecycle in one strip: focus, learn, practice, prove and adapt, driven by what you actually did.',
            detail: 'It reads roadmap milestones and DSA attempts — it never creates activity of its own.',
            target: '[data-guide-target="today-daily-journey"]',
            placement: 'top',
          },
          {
            id: 'today-readiness-signals',
            title: 'Readiness Signals',
            description: 'Per-domain readiness and freshness across all 11 placement domains, plus active practice signals such as weak topics and due assessments.',
            detail: 'Green means backed by recent evidence; freshness decays with time so an old score can never masquerade as a current one.',
            target: '[data-guide-target="today-readiness-signals"]',
            placement: 'top',
          },
        ],
      },
      {
        title: 'Plan, Focus & Execution',
        steps: [
          {
            id: 'today-plan-list',
            title: 'Today’s Plan & Up Next',
            description: 'Everything committed for today, or the honest roadmap queue when no plan exists yet, with per-task state controls.',
            detail: 'Completing or deferring a task anywhere in the app refreshes this list — the plan and the engine share one source of truth.',
            target: '[data-guide-target="today-plan-list"]',
            placement: 'top',
          },
          {
            id: 'today-learning-workspace',
            title: 'Open Learning Workspace',
            description: 'Opens the workspace wired to this exact task — Topic Workspace material or the linked DSA problem drill.',
            detail: 'Progress saved there feeds the same evidence ledger the Skills matrix reads.',
            target: '[data-guide-target="today-learning-link"]',
            placement: 'right',
          },
          {
            id: 'today-focus-mode',
            title: 'Focus Mode',
            description: 'Starts a distraction-free session with a countdown timer, objectives and notes for this task.',
            detail: 'Finishing a focus session runs the very same completion transaction as the Complete button — one path, one source of truth.',
            target: '[data-guide-target="today-focus-mode"]',
            placement: 'right',
          },
          {
            id: 'today-complete-action',
            title: 'Complete',
            description: 'Runs ONE completion transaction: task state, evidence log, skill credit and queue refresh commit together, or roll back together.',
            detail: 'The tour never presses this for you — clicking it here is the normal C2 completion path, executed exactly once.',
            target: '[data-guide-target="today-complete-action"], [data-testid="complete-primary"]',
            placement: 'right',
          },
          {
            id: 'today-postpone-skip',
            title: 'Postpone & Skip',
            description: 'Postpone pushes the task to tomorrow without penalty; Skip steps past it without marking it done. Both ask for confirmation first.',
            detail: 'Each action stores a pre-action snapshot, so the Undo that appears afterwards restores the exact previous state and writes nothing new.',
            target: '[data-guide-target="today-postpone-skip"]',
            placement: 'right',
          },
        ],
      },
      {
        title: 'Results & Review',
        steps: [
          {
            id: 'today-completion-result',
            title: 'Completion Result & Next Step',
            description: 'After a real completion, the result card reports the task, the evidence event that was written and the next recommended step.',
            detail: 'Undo on that card reverses that single transaction — state, evidence and skill credit — and nothing else. The guide itself writes nothing.',
            target: '[data-guide-target="today-completion-result"], [data-guide-target="today-primary"]',
            placement: 'right',
          },
          {
            id: 'today-telemetry',
            title: 'Telemetry & Review Link',
            description: 'Expands skill freshness and your target companies’ event dates — the daily view of data the Review page keeps in full.',
            detail: 'Review / Analytics holds the complete history behind these numbers: velocity, streaks, evidence traceability and company deadlines.',
            target: '[data-guide-target="today-telemetry"]',
            placement: 'top',
          },
          {
            id: 'today-guide-self',
            title: 'Replay This Guide',
            description: 'Launch or replay this tour from any page — Today’s guide and every other page guide share one system.',
            detail: 'Guides are non-destructive: no state changes, no progress alterations and no forced scrolling. Backdrop click, Escape, Skip or this button close it.',
            target: '[data-guide-target="today-guide-trigger"]',
            placement: 'bottom',
          },
        ],
      },
    ],
  },

  // 2. ROADMAP
  {
    route: 'roadmap',
    title: 'Master Roadmap & Trajectory',
    sections: [
      {
        title: 'Roadmap Structure',
        steps: [
          {
            id: 'roadmap-header',
            title: 'Placement Curriculum Trajectory',
            description: 'Master placement roadmap structured across 4 progressive phases spanning September 2026 to May 2027.',
            detail: 'Designed for systematic placement preparation with zero gaps and full dependency enforcement.',
            target: 'h1',
            placement: 'bottom',
          },
          {
            id: 'roadmap-phases',
            title: 'Phase Navigation',
            description: 'Switch between Foundation, Core Placement, Advanced, and Placement Sprint phases.',
            detail: 'Each phase unlocks specific curriculum modules tailored to your preparation timeline.',
            target: '.overflow-x-auto button, div.flex.items-center.gap-2',
            placement: 'bottom',
          },
          {
            id: 'roadmap-progress',
            title: 'Phase Progress Tracking',
            description: 'Displays the percentage of completed tasks in the active phase.',
            detail: 'Progress updates automatically as you complete tasks in Today or through Topic Workspaces.',
            target: 'span:has(svg.lucide-clock), div:has(> span.font-bold)',
            placement: 'bottom',
          },
          {
            id: 'roadmap-modules',
            title: 'Curriculum Modules',
            description: 'Modules organize related placement topics. Click any module header to expand or collapse its contents.',
            detail: 'Keeping modules organized helps you focus on active learning blocks without cognitive overload.',
            target: 'div.bg-\\[\\#14171D\\].border, div.rounded-xl.border',
            placement: 'bottom',
          },
          {
            id: 'roadmap-topics',
            title: 'Topics & Prerequisite Chains',
            description: 'Topics show completion status, priority badges, and strict prerequisite dependencies.',
            detail: 'Locked topics display unmet prerequisite topics that must be completed before starting.',
            target: 'button.w-full.text-left, div.space-y-1\\.5 button',
            placement: 'top',
          },
          {
            id: 'roadmap-prep-link',
            title: 'Deep Link to Preparation Hub',
            description: 'Open any topic to jump directly into its dedicated multi-stage Preparation Workspace.',
            detail: 'Workspaces provide Learn, Apply, Assess, and Review stages with curriculum materials.',
            target: 'a, button:has(svg.lucide-target), button:has(svg.lucide-chevron-right)',
            placement: 'top',
          },
        ],
      },
    ],
  },

  // 3. DSA
  {
    route: 'dsa',
    title: 'DSA Bank & Spaced Repetition',
    sections: [
      {
        title: 'Algorithmic Mastery',
        steps: [
          {
            id: 'dsa-header',
            title: 'Curated DSA Problem Catalog',
            description: 'Curated algorithmic problems mapped to standard placement patterns with Leitner spaced repetition scheduling.',
            detail: 'Tracks independent solves, assisted attempts, hints used, and time to solve.',
            target: 'h1',
            placement: 'bottom',
          },
          {
            id: 'dsa-tabs',
            title: 'DSA Views & Pattern Lessons',
            description: 'Switch between the Guided Journey, the Problem Bank, and In-Depth Pattern Lessons.',
            detail: 'Pattern lessons cover Two Pointers, Sliding Window, Heap, Dynamic Programming, and Grid Traversal.',
            target: 'div.flex.items-center.gap-1.bg-\\[\\#14171D\\]',
            placement: 'bottom',
          },
          {
            id: 'dsa-search-filter',
            title: 'Search & Pattern Filtering',
            description: 'Filter problems by keyword, LeetCode number, algorithmic pattern, or difficulty level.',
            detail: 'Quickly find problems that match your immediate target company requirements.',
            target: 'input[type="text"], input[placeholder*="Search"]',
            placement: 'bottom',
          },
          {
            id: 'dsa-recommended',
            title: 'Recommended Next Problem',
            description: 'Surfaces the highest-priority problem to solve next based on reviews due and curriculum unlocking.',
            detail: 'Unsolved problems in Box 1 or overdue reviews in Boxes 2-4 are prioritized.',
            target: 'div:has(> span:contains("RECOMMENDED")), div.border-\\[\\#E5A93C\\]\\/40',
            placement: 'bottom',
          },
          {
            id: 'dsa-attempt-modal',
            title: 'Honest Attempt Flow',
            description: 'Record attempts honestly: solved independently, solved with hints, or needed solution walkthrough.',
            detail: 'Independent passes advance problems to higher Leitner boxes. Failures trigger remediation quizzes.',
            target: 'button:has(svg.lucide-play), button:contains("Start Attempt"), button:contains("Solve")',
            placement: 'top',
          },
        ],
      },
    ],
  },

  // 4. PREPARATION
  {
    route: 'preparation',
    title: 'Preparation Hub & Workspace',
    sections: [
      {
        title: 'Core Curriculum',
        steps: [
          {
            id: 'prep-header',
            title: 'Systematic Placement Curriculum',
            description: 'Structured preparation covering Coding, Core CS, Aptitude & Communication, and Interview Strategy.',
            detail: 'Each section aggregates evidence scores and tracks active topic progression.',
            target: 'h1',
            placement: 'bottom',
          },
          {
            id: 'prep-sections-grid',
            title: '4 Curriculum Sections',
            description: 'Explore the 4 foundational pillars required for high-tier software engineering placement rounds.',
            detail: 'Each section shows total topics, average evidence scores, and fresh topic counts.',
            target: 'div.grid.grid-cols-1.md\\:grid-cols-2',
            placement: 'bottom',
          },
          {
            id: 'prep-active-topic',
            title: 'Active Topic Tracking',
            description: 'Shows the topic in each section with the most recent saved progress and its next recommended action.',
            detail: 'Never claims progress if no work has been done, showing "Choose a topic to begin" honestly.',
            target: '[data-testid^="active-topic-"]',
            placement: 'top',
          },
          {
            id: 'prep-topic-list',
            title: 'Topic Catalog & Dependencies',
            description: 'Browse individual topics with priority badges and prerequisite chain status.',
            detail: 'Locked topics clearly state which prerequisite topics must be satisfied first.',
            target: 'div.space-y-1\\.5 button',
            placement: 'top',
          },
          {
            id: 'prep-enter-workspace',
            title: 'Enter Topic Workspace',
            description: 'Open the comprehensive workspace featuring Learn, Apply, Assess, and Review stages.',
            detail: 'Stage progress is persisted per topic and automatically bridges to your live Skills Matrix readiness.',
            target: 'button:contains("Enter"), button:has(svg.lucide-arrow-right)',
            placement: 'top',
          },
        ],
      },
    ],
  },

  // 5. PRACTICE
  {
    route: 'practice',
    title: 'Placement Assessment & Practice Hub',
    sections: [
      {
        title: 'Targeted Drills',
        steps: [
          {
            id: 'practice-header',
            title: 'Placement Assessment Drills',
            description: 'Targeted assessment drills for Aptitude, Verbal reasoning, SQL scenarios, Core CS, and Mock Interviews.',
            detail: 'Simulates real online placement test environments with timed questions and scoring thresholds.',
            target: 'h1',
            placement: 'bottom',
          },
          {
            id: 'practice-categories',
            title: 'Category Filtering',
            description: 'Filter drills by category: Aptitude, Verbal, SQL, Core CS, Project Defense, and Mock Interview.',
            detail: 'Track historical attempts and average score percentages across each category.',
            target: 'div.flex.items-center.gap-2.overflow-x-auto',
            placement: 'bottom',
          },
          {
            id: 'practice-recommended-drill',
            title: 'Recommended Drill',
            description: 'Surfaces the drill most relevant to your upcoming company targets and weakest skill areas.',
            detail: 'Explains why the drill was selected based on your live evidence profile.',
            target: 'div.border-\\[\\#E5A93C\\]\\/40, div.rounded-xl.p-6',
            placement: 'bottom',
          },
          {
            id: 'practice-session-cards',
            title: 'Practice Session Cards',
            description: 'View session question counts, estimated completion time, and past average scores.',
            detail: 'Questions include objective multiple-choice, subjective coding queries, and architectural defense.',
            target: 'div.grid.grid-cols-1.md\\:grid-cols-2.xl\\:grid-cols-3',
            placement: 'top',
          },
          {
            id: 'practice-runner-flow',
            title: 'Session Runner & Self-Certification',
            description: 'Timed questions feature confidence ratings, honest self-certification, and immediate explanations.',
            detail: 'Passing a drill records an immutable evidence log that directly increases topic readiness in Skills.',
            target: 'button:contains("Start Session"), button:contains("Start Drill")',
            placement: 'top',
          },
        ],
      },
    ],
  },

  // 6. SKILLS
  {
    route: 'skills',
    title: 'Skills Matrix & Readiness',
    sections: [
      {
        title: 'Readiness & Evidence',
        steps: [
          {
            id: 'skills-header',
            title: '11-Domain Skills Matrix',
            description: 'Your definitive placement readiness profile evaluated continuously across all 11 core placement domains.',
            detail: 'Calculates topic readiness from 0 to 100 based on recorded task, practice, and DSA evidence.',
            target: 'h1',
            placement: 'bottom',
          },
          {
            id: 'skills-overall-score',
            title: 'Overall Placement Readiness',
            description: 'Weighted composite readiness score reflecting comprehensive preparation across all requirements.',
            detail: 'Weighting prioritizes foundational domains and target company specifications.',
            target: 'div.text-3xl.font-bold, div:has(> span.font-mono.font-bold)',
            placement: 'bottom',
          },
          {
            id: 'skills-view-toggle',
            title: 'Matrix & Domain Views',
            description: 'Toggle between the detailed topic matrix and aggregated domain summary cards.',
            detail: 'Use domain view for quick executive assessment and matrix view for deep-dive topic auditing.',
            target: 'div.flex.items-center.gap-1.bg-\\[\\#14171D\\] button',
            placement: 'bottom',
          },
          {
            id: 'skills-freshness-decay',
            title: 'Evidence Strength & Freshness Decay',
            description: 'Recent practice maintains fresh evidence. Skills without recent practice decay to stale or decaying.',
            detail: 'Decay prevents false confidence by requiring periodic review to sustain high readiness.',
            target: 'span:contains("Fresh"), span:contains("decay"), span.tech-chip',
            placement: 'top',
          },
          {
            id: 'skills-traceability-override',
            title: 'Evidence Traceability & Manual Overrides',
            description: 'Click any topic row to view the full audit trail of evidence logs, or record an explicit manual override.',
            detail: 'Overrides require an explanation and are recorded as verifiable evidence in your audit history.',
            target: 'button:contains("Audit"), button:contains("Override"), div.app-table-row',
            placement: 'top',
          },
        ],
      },
    ],
  },

  // 7. ANALYTICS / REVIEW
  {
    route: 'analytics',
    title: 'Analytics & Review',
    sections: [
      {
        title: 'Operational Telemetry',
        steps: [
          {
            id: 'analytics-header',
            title: 'Operational Review & Telemetry',
            description: 'Telemetry summaries, velocity tracking, study streak consistency, and evidence-backed guidance.',
            detail: 'Analyzes your daily study patterns to keep you on trajectory toward placement deadlines.',
            target: 'h1',
            placement: 'bottom',
          },
          {
            id: 'analytics-time-window',
            title: 'Timeframe Windows',
            description: 'Switch analysis windows between 7 days, 30 days, current phase, or full preparation history.',
            detail: 'Metrics and activity breakdowns recompute deterministically for the selected window.',
            target: 'div.flex.items-center.gap-1.bg-\\[\\#14171D\\]',
            placement: 'bottom',
          },
          {
            id: 'analytics-kpi-cards',
            title: 'Core Performance KPIs',
            description: 'Review tasks completed, total study hours invested, DSA problems mastered, and active streaks.',
            detail: 'Streak tracking honors rest days in Reduced and Exam modes to prevent burnout.',
            target: 'div.grid.grid-cols-2.lg\\:grid-cols-4',
            placement: 'bottom',
          },
          {
            id: 'analytics-actionable-prompts',
            title: 'Actionable Focus Prompts',
            description: 'Deterministic recommendations pinpointing decayed skills, overdue DSA reviews, or company gaps.',
            detail: 'Click any prompt action button to jump directly into the relevant remediation task.',
            target: 'div.space-y-2\\.5, button:has(svg.lucide-arrow-right)',
            placement: 'top',
          },
        ],
      },
    ],
  },

  // 8. COMPANIES
  {
    route: 'companies',
    title: 'Target Companies & Overlays',
    sections: [
      {
        title: 'Company Overlays',
        steps: [
          {
            id: 'companies-header',
            title: 'Target Company Overlays',
            description: 'Configure custom company targets with role profiles, hiring dates, and specific requirements.',
            detail: 'Company overlays modulate adaptive engine scoring to prioritize high-yield company topics.',
            target: 'h1',
            placement: 'bottom',
          },
          {
            id: 'companies-add-btn',
            title: 'Add Target Company',
            description: 'Create a new company target with required DSA patterns, CS concepts, and language constraints.',
            detail: 'Specify drive dates to generate urgency-based preparation timelines.',
            target: 'button:has(svg.lucide-plus), button:contains("Add Company")',
            placement: 'bottom',
          },
          {
            id: 'companies-cards',
            title: 'Company Preparation Cards',
            description: 'Displays matched preparation scores, days remaining, and key hiring criteria.',
            detail: 'Evaluates your current skill profile against the specific requirements of each target company.',
            target: 'div.bg-\\[\\#14171D\\].border.rounded-xl, div.grid.grid-cols-1.md\\:grid-cols-2',
            placement: 'top',
          },
          {
            id: 'companies-gap-analysis',
            title: 'Requirement Gaps & Actions',
            description: 'Highlights specific gaps between your current readiness and company benchmarks.',
            detail: 'Provides direct links to start practicing the exact requirements needed to close gaps.',
            target: 'span:contains("Gap"), button:contains("Details"), button:has(svg.lucide-arrow-right)',
            placement: 'top',
          },
        ],
      },
    ],
  },

  // 9. PROJECT LAB
  {
    route: 'project',
    title: 'Project Lab & Engineering Defense',
    sections: [
      {
        title: 'Portfolio Defense',
        steps: [
          {
            id: 'project-header',
            title: 'Project Lab & Engineering Defense',
            description: 'BUILD → UNDERSTAND → EXPLAIN → DEFEND. PlacementOS is your primary portfolio engineering system.',
            detail: 'Designed to prepare you for senior engineer viva questions and system architecture deep-dives.',
            target: 'h1',
            placement: 'bottom',
          },
          {
            id: 'project-start-defense',
            title: 'Start Project Defense Drill',
            description: 'Launch an interactive viva defense session evaluating your architectural understanding.',
            detail: 'Questions challenge your design decisions, trade-offs, state management, and error handling.',
            target: 'button:contains("Start Project Defense")',
            placement: 'bottom',
          },
          {
            id: 'project-sections-nav',
            title: 'Project Documentation Tabs',
            description: 'Study system architecture diagrams, data flows, implementation details, and engineering practices.',
            detail: 'Tabs reflect the real code architecture of PlacementOS itself.',
            target: 'div.flex.items-center.gap-1\\.5.overflow-x-auto',
            placement: 'bottom',
          },
          {
            id: 'project-defense-scoring',
            title: 'Defense Scoring & Evidence',
            description: 'Requires a 70% score to pass. Passing writes authoritative project defense evidence to your Skills profile.',
            detail: 'Review completed attempts and detailed justifications at any time.',
            target: 'div:contains("Defense"), div.bg-\\[\\#14171D\\].border',
            placement: 'top',
          },
        ],
      },
    ],
  },

  // 10. SETTINGS
  {
    route: 'settings',
    title: 'System Settings & Storage',
    sections: [
      {
        title: 'System & Storage',
        steps: [
          {
            id: 'settings-header',
            title: 'Operational Parameters & Storage',
            description: 'Manage placement modes, local storage consumption, and data backup safeguards.',
            detail: 'PlacementOS is 100% offline and local-first; all state resides strictly on your device.',
            target: 'h1',
            placement: 'bottom',
          },
          {
            id: 'settings-storage-used',
            title: 'Offline Storage Status',
            description: 'Shows live localStorage consumption in kilobytes.',
            detail: 'Even with months of evidence logs and attempts, storage remains compact and fast.',
            target: 'span:contains("Storage Used")',
            placement: 'bottom',
          },
          {
            id: 'settings-mode-selector',
            title: 'Placement Mode Configuration',
            description: 'Select your default operational mode: Normal, Reduced, Exam, or Placement Sprint.',
            detail: 'Modulates daily recommended hours and task prioritization rules.',
            target: 'select, div.settings-control',
            placement: 'bottom',
          },
          {
            id: 'settings-backup-export',
            title: 'Export Backup JSON',
            description: 'Download your entire PlacementOS state as a single JSON file for offline archival or migration.',
            detail: 'Includes all tasks, DSA progress, practice attempts, evidence logs, and company targets.',
            target: 'button:has(svg.lucide-download), button:contains("Export")',
            placement: 'top',
          },
          {
            id: 'settings-backup-import',
            title: 'Import Backup JSON',
            description: 'Restore your state from a previous backup with rigorous schema validation.',
            detail: 'Validates structure and schema version before persisting to prevent corrupted state.',
            target: 'label:has(svg.lucide-upload), input[type="file"]',
            placement: 'top',
          },
          {
            id: 'settings-reset-config',
            title: 'Reset Configuration Only',
            description: 'Restores user preferences and mode settings to defaults without modifying any study progress or evidence.',
            detail: 'Completely safe to run if you wish to reset preferences.',
            target: 'button:contains("Reset Config Only")',
            placement: 'top',
          },
          {
            id: 'settings-full-reset',
            title: 'Full Application Reset',
            description: 'Restores all data, task history, and DSA progress to pristine factory seed state.',
            detail: 'Protected by a strict confirmation modal requiring explicit user intent.',
            target: 'button:contains("Reset All Application Data")',
            placement: 'top',
          },
        ],
      },
    ],
  },
];
