import type { ProjectLabSectionId } from '../types';

/**
 * Structured, defensible content for the Project Lab sections.
 * Every claim here is true of the actual codebase — it is what you will be
 * asked to defend in a project viva. Keep it short, specific, and checkable.
 */

export interface LabCard {
  label: string;
  value: string;
  detail?: string;
}

export interface LabBlock {
  title: string;
  body: string;
}

export interface LabSectionContent {
  id: ProjectLabSectionId;
  heading: string;
  intro: string;
  /** Single-line monospace data-flow / diagram string. */
  flow?: string;
  cards?: LabCard[];
  points?: string[];
  blocks?: LabBlock[];
}

export const PROJECT_LAB_CONTENT: LabSectionContent[] = [
  {
    id: 'overview',
    heading: 'PlacementOS Personal Portfolio Project',
    intro:
      'PlacementOS is a local-first, deterministic career preparation OS that measures, adapts, and tracks a placement trajectory end to end. No backend, no accounts, no external API calls — the whole app runs offline in the browser.',
    cards: [
      {
        label: 'Primary Stack',
        value: 'React 19 + TypeScript + Vite + Tailwind CSS 4',
        detail: 'Hash routing, no server rewrites required.',
      },
      {
        label: 'Architecture Pattern',
        value: 'Single Context + Pure Engine Functions + Storage Adapter',
        detail: 'All decisions are reproducible from state alone.',
      },
      {
        label: 'Persistence',
        value: 'localStorage via StorageAdapter (schema-versioned)',
        detail: 'One state key, validated on load, JSON export/import backup.',
      },
      {
        label: 'Adaptive Model',
        value: '6-factor weighted score + Leitner 4-box spaced repetition',
        detail: 'No randomness and no LLM in the decision path.',
      },
    ],
    points: [
      'Problem it solves: placement prep spreads across notes, sheets, and tabs with no signal on what to do next or what evidence proves readiness.',
      'Target user: a campus-SDE candidate running a multi-month prep cycle (Sep 2026 – May 2027).',
      'What makes it defensible: every recommendation traces to a weighted formula you can recompute by hand.',
    ],
  },
  {
    id: 'architecture',
    heading: 'System Architecture & Data Flow',
    intro:
      'One-directional data flow: UI events mutate state through the context, engines derive decisions from that state, and the adapter persists it.',
    flow:
      'User Action → PlacementContext → Pure Engine (adaptive / practice / skills) → State Update → StorageAdapter (JSON → localStorage) → React Re-render',
    blocks: [
      {
        title: 'Deterministic scoring engine',
        body: 'Priority = 0.25×Urgency + 0.20×Weakness + 0.20×Importance + 0.15×Company + 0.10×SpacedRep + 0.10×Recovery. Weights sum to exactly 1.0 and are covered by unit tests — the same inputs always produce the same plan.',
      },
      {
        title: 'Single storage adapter',
        body: 'loadState() validates and merges into defaults, so a corrupt or older payload never crashes hydration. Schema version (1.0.0) gates migrations; day-sealed check-ins are immutable.',
      },
      {
        title: 'Pure engines, thin UI',
        body: 'Engines are plain functions over plain objects with no React imports, so scoring, Leitner transitions, and readiness can be tested in isolation and reused across views.',
      },
      {
        title: 'Routing & state boundaries',
        body: 'Client-side hash routing (#/route/topicId) keeps deep links static-host friendly. Component state holds ephemeral UI (active tab, open modal); persisted state holds only domain data.',
      },
    ],
    points: [
      'No network calls at any point — offline by construction, not by fallback.',
      'Evidence flows back: practice attempts update skill freshness and evidence strength, which feed the next recommendation.',
    ],
  },
  {
    id: 'implementation',
    heading: 'Key Implementation Modules',
    intro:
      'Each module has one job and a pure interface, which is why the test suite can pin behavior without mounting React.',
    cards: [
      {
        label: 'adaptiveEngine.ts',
        value: 'Priority scoring, daily plan selection, Leitner transitions',
        detail: 'Inputs: task, skill state, deadlines. Output: ranked candidates.',
      },
      {
        label: 'practiceEngine.ts',
        value: 'Attempt evaluation, accuracy %, evidence logging',
        detail: 'Deterministic scoring for MCQ, numeric, and prompt sessions.',
      },
      {
        label: 'skillsEngine.ts',
        value: 'Topic/domain readiness and freshness decay',
        detail: 'Aggregates evidence; decays on a fixed schedule, no guesses.',
      },
      {
        label: 'storageAdapter.ts',
        value: 'Serialize, validate, migrate, restore',
        detail: 'Versioned schema with defaults merge and JSON backup import.',
      },
      {
        label: 'preparationEngine.ts',
        value: 'Topic preparedness: coverage → practiced → assessed → retained',
        detail: 'Coarse ladder (0–5) instead of fake-precision percentages.',
      },
      {
        label: 'PlacementContext.tsx',
        value: 'Hydration, persistence, route state, midnight rollover',
        detail: 'One provider; 60s poll + window.focus for day sealing.',
      },
    ],
  },
  {
    id: 'practices',
    heading: 'Engineering & Quality Practices',
    intro:
      'Quality is enforced by tooling, not discipline — a change cannot land unless typecheck, lint, tests, and build all pass.',
    blocks: [
      {
        title: 'Strict type safety',
        body: 'TypeScript across the app with explicit domain types in a single types module; no implicit any in engine signatures, so a schema change breaks the build instead of runtime.',
      },
      {
        title: 'Deterministic test suite',
        body: 'Vitest unit tests cover adaptive scoring, Leitner box moves, practice evaluation, storage integrity, and skills readiness — pure functions only, so the suite runs in milliseconds without a DOM.',
      },
      {
        title: 'Content integrity checks',
        body: 'Preparation content is verified programmatically: unique question IDs, resolvable topic references, in-bounds answers, and computed numeric answers checked against explanations.',
      },
      {
        title: 'Restraint in UI',
        body: 'Linear-style developer-tool aesthetic: 1px borders, tonal elevation, single bronze accent, no glow or soft shadows. Compact density by default.',
      },
      {
        title: 'Reversibility',
        body: 'Full JSON export/import and a schema version mean user data survives upgrades; resets are explicit and confirmed, never implicit.',
      },
    ],
    points: [
      'Gate commands: npm run lint · npx tsc --noEmit · npx vitest run · npm run build.',
      'Dependency policy: minimal — no state library, no data-fetching layer, no UI kit beyond what is used.',
    ],
  },
  {
    id: 'defense',
    heading: 'Project Viva & Defense Simulator',
    intro:
      'Interviewers will push on trade-offs, not features. Prepare a 60-second architecture answer, one honest trade-off, one bottleneck you found, and one thing you would rebuild.',
    blocks: [
      {
        title: 'Opening (60 seconds)',
        body: 'What it is → who it is for → the one design decision that matters: "all recommendations are a weighted formula over local state, so every suggestion is explainable and testable."',
      },
      {
        title: 'Trade-off you accepted',
        body: 'localStorage over a backend: instant offline use and zero infra, at the cost of device-bound data — mitigated by versioned JSON export/import rather than sync.',
      },
      {
        title: 'Bottleneck you solved',
        body: 'Recomputing priorities on every render → engines are memoized pure functions over normalized state, so scoring runs only when inputs change.',
      },
      {
        title: 'Hardest bug',
        body: 'Midnight rollover double-sealing days → sealing is idempotent and immutable, triggered by a 60s poll plus window focus instead of a single timer.',
      },
      {
        title: 'What you would rebuild',
        body: 'Move coverage from repeated string arrays to a single normalized map keyed by topic id — same behavior, one source of truth, easier migration.',
      },
    ],
    points: [
      'Answer with numbers: weights, box intervals (1/3/7/14 days), schema version, test counts.',
      'Name the alternative you rejected — "we considered X and chose Y because Z" reads as judgment.',
    ],
  },
  {
    id: 'evidence',
    heading: 'Project Defense Evidence History',
    intro:
      'Defense attempts below are recorded evidence: each session logs accuracy, time, and a domain evidence event that feeds the skills view.',
    flow:
      'Defense Session (practice-project-defense-01, 4 prompts, 80% pass) → PracticeAttempt (scorePct, pass/fail computed once) → EvidenceLog (score 0-100, confidence 1-5, sourceType practice_session) → Skill credit (+round(score × 0.2) on prep-interview-career) → Readiness, freshness & the adaptive weakness factor',
    cards: [
      {
        label: 'Defense Session',
        value: 'practice-project-defense-01 — 4 defense prompts, 80% pass threshold',
        detail: 'Prompts cover architecture, data flow, security, and trade-off defense.',
      },
      {
        label: 'Attempt Record',
        value: 'scorePct, correct/total, PASS/FAIL, submitted timestamp',
        detail: 'Pass is computed once at evaluation (scorePct ≥ 80) and stored — never re-derived in the view.',
      },
      {
        label: 'Evidence Event',
        value: 'EvidenceLog: score 0-100, confidence 1-5, sourceType practice_session',
        detail: 'Confidence maps from score (≥85→5, ≥70→4, ≥50→3, ≥30→2, else 1); the attempt links it via evidenceLogId.',
      },
      {
        label: 'Skill Credit',
        value: '+round(evidence score × 0.2) evidence strength on prep-interview-career',
        detail: 'Freshness decays with inactivity: fresh ≤7 days, aging ≤14 days (×0.9), stale beyond (×0.75).',
      },
    ],
    points: [
      'Attempts are append-only — every defense run records its own attempt; earlier history is never overwritten.',
      'The Evidence section completes only from recorded attempts (projectAttempts.length > 0); opening the tab proves nothing.',
      'Unanswered prompts count against accuracy — there is no partial credit derived from response length or a confidence self-rating.',
    ],
    blocks: [
      {
        title: 'What an interviewer can verify',
        body: 'Each entry shows session title, date, submitted timestamp, correct/total, the configured threshold, and the PASS/FAIL verdict straight from the recorded attempt — the view renders stored values and recomputes nothing.',
      },
      {
        title: 'Where the evidence lands',
        body: 'The evidence event carries topicId prep-interview-career (domainId interviews), so the credit raises that topic\'s evidence strength and freshness, which in turn drives the adaptive engine\'s weakness factor for the next recommendation.',
      },
    ],
  },
];
