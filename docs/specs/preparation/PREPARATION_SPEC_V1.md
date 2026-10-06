# PlacementOS Preparation Page — Final Visual Specification v1.0

**Status:** SPECIFICATION ONLY — FROZEN. No implementation is authorized by this document alone; it is the manufacturing blueprint for the subsequent UI implementation task.
**Baseline commit:** `cd95c59` — `feat(dsa): redesign algorithmic problem laboratory`
**Date:** 2026-10-06
**Scope:** `src/components/preparation/*` (Preparation Hub View, Topic Workspace, Practice Session Runner), integration with `src/components/common/TaskLearningWorkspaceDrawer.tsx`, and preparation test suites.

> **Reading contract.**
> This document resolves every visual, structural, behavioral, responsive, accessibility, animation, and test-preservation decision for the Preparation page redesign. Manufacturing must not reopen these decisions. Sections marked **LOCKED** are final. The specification strictly preserves all existing engine functions (`preparationEngine.ts`, `practiceEngine.ts`), storage schemas, routing contracts, prerequisite proof gates, evidence emission, and test assertions. The only file authorized in this task is this specification document; UI implementation is deferred to subsequent manufacturing tasks.

---

## 1. Purpose — LOCKED

PlacementOS is a local-first, zero-backend personal placement preparation operating system spanning September 2026 to May 2027.

The **Preparation Subsystem** (`#/preparation`) is the student's **Learning Progression & Knowledge Workspace**. It answers the fundamental student questions:
> *"What foundational concept or skill am I learning right now? Why does this specific topic matter for my target placement rounds? What are the prerequisites and are they proven? What does 'ready' look like, and how do I produce objective practice evidence to prove competence?"*

### Core Design Principle
```
Preparation Hub (4 Sections) → Section Active Topic & Next Action → Topic Knowledge Workspace → 4-Pillar Preparedness Model → 7-Stage Learning Progression → Interactive Subtopic Knowledge Cards → Deterministic Practice Drill & Assessment Protocol → Canonical Evidence Attribution
```

The redesigned Preparation page must make it immediately obvious within **5 seconds**:
1. **What Preparation is for:** Building foundational mastery, theoretical depth, and practice-proven competence across 4 core domains: Coding, Core CS, Aptitude & Communication, and Interview & Career.
2. **What am I learning right now:** Clear indication of the currently active topic and active stage within each section and workspace.
3. **What should I learn next:** The single dominant Next Recommended Action (e.g. *"Complete Orient & Learn stages"*, *"Prove Readiness: attempt practice drill"*, or *"Unlock prerequisite topic"*).
4. **Why this matters for placement:** Explicit placement context and "What Ready Means" criteria linked directly to recruitment rounds.
5. **How do I know I actually learned it:** The 4-pillar Preparedness Model (Coverage, Application, Assessment, Retention) showing verified proof vs missing proof, with an Evidence Score out of 100.

---

## 2. Current Page Architecture & Forensic Map — LOCKED

### 2.1 Route & Deep-Link Model
- **Base Route:** `#/preparation` (Hub view showing 4 sections and their topics).
- **Target Route (Deep-Link):** `#/preparation/<topicId>` (e.g. `#/preparation/prep-lang`, `#/preparation/prep-sql`).
- **Roadmap Bridge:** `getPreparationTopicIdByRoadmapId(roadmapTopicId)` maps curriculum roadmap nodes (`topic-*`) to preparation topics (`prep-*`).
- **Active Adaptive Session Handoff:**
  - When opened via Today's active session (`routeState.route === 'preparation' && routeState.targetId === topic.id`), `TopicWorkspace` renders the `session-deep-link-banner`.
  - Actions available: `"Return to Session"` and `"Complete Activity & Advance"`.
  - Completing the activity records the stage completion, advances the session via `session.advanceActivity('completed')`, and routes back to `#/dashboard`.

### 2.2 Current Component Hierarchy
```
AppShell (src/components/layout/AppShell.tsx)
└── PreparationHubView (src/components/preparation/PreparationHubView.tsx) [401 lines]
    ├── Header & GuideTrigger (route="preparation")
    ├── 4 Major Sections Grid (coding, core_cs, aptitude_communication, interview_career)
    │   ├── Section Icon & Hardcoded SVG Motif
    │   ├── Section Stats (Average Evidence Score, Topic Count)
    │   ├── Active Topic & Next Action Banner
    │   ├── Topics in Section List (Locked status, Prereq proof, Priority badge)
    │   └── "Enter {Section} Workspace" CTA
    │
    ├── [When selectedTopic != null]
    │   └── TopicWorkspace (src/components/preparation/TopicWorkspace.tsx) [859 lines]
    │       ├── Session Deep Link Banner (`data-testid="session-deep-link-banner"`)
    │       ├── Breadcrumb Nav & "View in Roadmap" Button
    │       ├── Topic Header (Title, Readiness, Freshness, Priority, Target Level, Evidence Score)
    │       ├── 4-Pillar Preparedness Strip (Covered, Practiced, Assessed, Retained, Interview) + Missing Proof
    │       ├── Next Recommended Action Bar (with "Prove Readiness" / "Start Assessment" CTA)
    │       ├── Prerequisite Gate (`data-testid="prerequisite-gate"`, if locked)
    │       ├── 7-Stage Navigation Tabs (Orient, Learn, Apply, Assess, Review, Interview, Evidence)
    │       ├── Stage Content Area:
    │       │   ├── Stage Header & "Mark Stage Complete" Action
    │       │   ├── Stage 1 (Orient): Why It Matters, Prerequisites, "What Ready Means", Evidence Criteria
    │       │   ├── Stage 2 (Learn): Subtopic Knowledge Cards (What, Why, Example, Practice, Proof), Objectives, Resources
    │       │   ├── Stage 3 (Apply): Practice Activities, Matching Practice Modules
    │       │   ├── Stage 4 (Assess): Deterministic Practice Assessment Engine launcher
    │       │   ├── Stage 5 (Review): Historical Practice Attempts summary with accuracy & pass/fail verdicts
    │       │   ├── Stage 6 (Interview): Viva prompts, common questions, checkpoints
    │       │   └── Stage 7 (Evidence): Calculated Evidence Score & Log Telemetry
    │       │
    └── PracticeSessionRunner Modal (src/components/preparation/PracticeSessionRunner.tsx) [499 lines]
        ├── Step 1 (Intro): Title, description, question count, time limit, passing threshold
        ├── Step 2 (Active): Question prompt, category tag, countdown/elapsed timer, MCQ options / Textarea + Self-Certification checkbox + Confidence rating, Hint toggle
        └── Step 3 (Result): Pass/Fail verdict, score %, correct count, time, unanswered warning, "Retake" & "Return to Hub" CTAs
```

### 2.3 Canonical Data Sources
| Entity | Canonical Source | Description |
|---|---|---|
| Sections | `PREPARATION_SECTIONS` (`src/data/preparationDataset.ts`) | 4 core preparation sections: `coding`, `core_cs`, `aptitude_communication`, `interview_career`. |
| Topics | `PREPARATION_TOPICS` (`src/data/preparationDataset.ts`) | 13 comprehensive preparation topic definitions. |
| Progress | `preparationTopicProgress` (`StorageAdapter.ts`) | Authoritative per-topic stage records (`currentStage`, `completedStages`, `stageProgress`, `lastAccessedAt`, `evidenceStrength`, `freshness`). |
| Skill State | `skillStates` (`StorageAdapter.ts`) | Evidence strength (0–100), freshness (`fresh`, `aging`, `stale`, `untested`), last practiced ISO string. |
| Practice Sessions | `PRACTICE_SESSIONS` (`src/data/practiceDataset.ts`) | Pre-authored assessment drill sets with questions, options, hints, answers. |
| Practice Attempts | `practiceAttempts` (`StorageAdapter.ts`) | Immutable log of completed sessions with accuracy %, time, pass/fail. |
| Evidence Trail | `evidenceLogs` (`StorageAdapter.ts`) | Canonical append-only evidence events. |
| Active Session | `useSafeSession()` (`SessionContext.tsx`) | Adaptive daily study session orchestration. |

---

## 3. Current UX Audit — LOCKED

Evaluating the existing Preparation subsystem:

| Criterion | Current Rating | Forensic Findings |
|---|---|---|
| **A. 5-Second Comprehension** | **MODERATE** | Hub cards are information-rich but cluttered. The distinction between "Curriculum Covered" vs "Demonstrated Practice Proof" needs sharper visual hierarchy. |
| **B. Visual Hierarchy** | **MEDIOCRE** | Extensive use of legacy hardcoded colors (`#14171D`, `#1B2028`, `#262D38`, `#E5A93C`, `#F59E0B`, `#10B981`). Background surfaces lack unified tonal depth. |
| **C. Information Density** | **COMPLEX** | `TopicWorkspace.tsx` is 859 lines with large stacked sections and multiple nested buttons. Stages require clearer visual pacing and progress indicators. |
| **D. Defining Action Clarity** | **COMPETING** | Multiple action buttons per card (`Open`, `Practice`, `Enter Workspace`, `Mark Complete`, `Start Drill`). The primary next action for the user's immediate state must dominate. |
| **E. Legacy Color Tokens** | **FAIL** | Heavy dependence on legacy hex strings instead of standard design system CSS variables (`var(--background)`, `var(--surface)`, `var(--primary)`, `var(--action-accent)`). |
| **F. SVG Motifs Bloat** | **CLUTTERED** | Inline hardcoded SVG motifs inside `PreparationHubView.tsx` (lines 191–234) creating unnecessary visual noise and maintenance overhead. |
| **G. Responsive Layout** | **SUBOPTIMAL** | Stage tabs overflow on mobile screens; modal controls wrap awkwardly on small viewports. |
| **H. Accessibility** | **INCOMPLETE** | Missing explicit `role="tablist"` / `aria-selected` attributes on stage selectors, missing `role="progressbar"` on progress bars, missing explicit keyboard focus rings. |

---

## 4. 5-Second Test Evaluation — LOCKED

| Question | Current Status | Redesign Resolution |
|---|---|---|
| **1. What is Preparation for?** | Mostly clear, but feels like an unranked catalog. | Add a prominent Hub Header with macro progress metrics across all 4 domains. |
| **2. What am I learning right now?** | Clear only if a topic has prior progress. | Highlight the active section and active topic with a distinct "Currently In Progress" state card. |
| **3. What should I learn next?** | Buried in subtext. | Introduce a dominant Active Focus strip surfacing the exact single next action. |
| **4. Why does this matter for placement?** | Shown inside Orient stage. | Surface placement round context directly on the topic header and overview card. |
| **5. How do I know if I learned it?** | Shown in 4-pillar badges. | Elevate the 4-Pillar Preparedness Model with clean visual status tags and missing proof checklists. |

---

## 5. Visual Metaphor & Aesthetic System — LOCKED

### 5.1 Chosen Metaphor: "Learning Progression / Knowledge Workspace"
The Preparation subsystem is a **structured technical knowledge workshop**:
- **Clean Obsidian Planes:** Surface elevations (`#0B100D`, `#111713`, `#161E19`, `#1B241F`) with 1px subtle borders (`#28352D`).
- **Forest Green Identity:** Canonical brand accents (`#2E8B62`, `#46B982`, `#65D3A3`) representing verified knowledge, completed stages, and passing evidence.
- **Controlled Page Action Accent:** Dedicated action accent (`var(--action-accent)`) reserved exclusively for the defining action (e.g. `"Enter Active Workspace"`, `"Prove Readiness"`, `"Mark Stage Complete"`).
- **Warm Bronze Accent (`#D19A45`):** Reserved for unproven proof requirements, locked prerequisites, and active drill sessions.
- **Zero Decorative Noise:** Clean, typography-driven technical layouts (Inter + JetBrains Mono) with structured data badges.

---

## 6. Defining User Action — LOCKED

### The One Defining Action: `"Continue Learning"` / `"Prove Readiness"` / `"Mark Stage Complete"`
The defining action adapts deterministically based on the current state:
1. **On Hub View:** **`"Resume Active Topic"`** (or `"Start Next Topic"`) targeting the most recently active or recommended section.
2. **On Topic Workspace (Curriculum Incomplete):** **`"Mark Stage Complete"`** or `"Continue to Next Stage"`.
3. **On Topic Workspace (Curriculum Done, Proof Missing):** **`"Prove Readiness (Launch Drill)"`**.
4. **On Topic Workspace (Locked):** **`"Open Prerequisite Topic"`**.
5. **In Active Adaptive Session:** **`"Complete Activity & Advance"`**.

The defining CTA consumes `var(--action-accent)` to maintain clear visual priority.

---

## 7. Frozen Information Architecture — LOCKED

The Preparation subsystem consists of two primary operational layers and one detail modal:

```
===================================================================================
LAYER A: PREPARATION HUB (Overview & Section Navigation)
===================================================================================
ZONE 1: HUB HEADER & MACRO READINESS STRIP
  - Subsystem Identity Badge, Title ("PREPARATION"), Purpose Subtitle, Guide Trigger
  - 4-Column Macro Metrics:
    [Overall Preparedness]  [Curriculum Covered]  [Demonstrated Proofs]  [Active Topics]
        ↓
ZONE 2: SECTION PROGRESSION MATRIX (4 Major Sections)
  - 1. Coding (Python, Data Structures)
  - 2. Core CS (SQL, DBMS, OOP, OS, Networks)
  - 3. Aptitude & Communication (Quant, Reasoning, Verbal, Professional Comm)
  - 4. Interview & Career (Tech Viva, Behavioral & Resume Defense)
  - Per Section: Section Header, Average Evidence Score, Active Topic, Real Next Action, Topic List with Prerequisite & Proof Badges, Primary CTA ("Enter Workspace").

===================================================================================
LAYER B: TOPIC KNOWLEDGE WORKSPACE (Deep-Dive Learning Environment)
===================================================================================
ZONE 3: WORKSPACE CONTEXT & TOPIC PREPAREDNESS HEADER
  - Adaptive Session Deep Link Banner (if deep linked from Today)
  - Navigation Bar: "Back to Hub" button, Domain/Topic Breadcrumb, "View in Roadmap" link
  - Topic Title, Priority Badge, Target Level, Estimated Duration, Placement Value
  - Evidence Score Pill & Freshness Badge
  - 4-Pillar Preparedness Strip:
    [Covered (0-100%)]  [Practiced (# attempts)]  [Assessed (best %)]  [Retained (Score/100)]  [Interview (if applicable)]
  - Missing Proof Checklist (if unproven)
  - Dominant Action Banner with Primary Next Action CTA
        ↓
ZONE 4: PREREQUISITE PROOF GATE (Visible ONLY when Topic is Locked)
  - Shield / Lock Icon, Explanation of Unmet Curriculum or Missing Evidence
  - Actionable Prerequisite Cards with Direct Links ("Open Topic" or "Practice Topic")
        ↓
ZONE 5: 7-STAGE PROGRESSION WORKSPACE (Visible when Unlocked)
  - Stage Navigation Tabs with completion checkmarks:
    [1. Orient] [2. Learn] [3. Apply] [4. Assess] [5. Review] [6. Interview] [7. Evidence]
  - Stage Header: Stage Title, Curriculum Coverage %, "Mark Stage Complete" Action
  - Dynamic Stage Content:
    - Stage 1 (Orient): "Why It Matters", Prerequisites, "What Ready Means", Evidence Criteria
    - Stage 2 (Learn): Subtopic Knowledge Cards (What, Why, Example, Practice, Proof), Objectives, Recommended Resources
    - Stage 3 (Apply): Practice Activities, Practice Module Launchers
    - Stage 4 (Assess): Deterministic Practice Assessment Engine Launcher & Assessment Types
    - Stage 5 (Review): Historical Practice Attempts with scores, pass/fail verdicts, time spent
    - Stage 6 (Interview): Technical Viva Prompts & Checkpoints
    - Stage 7 (Evidence): Evidence Strength calculation & Log Event count

===================================================================================
LAYER C: PRACTICE SESSION RUNNER MODAL (Drill & Assessment Protocol)
===================================================================================
ZONE 6: ASSESSMENT & DRILL RUNNER
  - Step 1: Session Overview (Questions, Time Limit, Pass Threshold, Evidence Guarantee)
  - Step 2: Interactive Assessment (Question prompt, Category tag, Countdown timer, MCQ / Text Response + Self-Certification + Confidence Rating, Hint Toggle)
  - Step 3: Result & Evidence Summary (Pass/Fail Verdict, Score %, Unanswered Warning, Evidence Log Confirmation, "Retake" / "Return to Hub" CTAs)
```

---

## 8. Zone-by-Zone Specification — LOCKED

### 8.1 Zone 1: Hub Header & Macro Readiness Strip (`PreparationHeader.tsx` / `PreparationMasteryStrip.tsx`)
- **Render Condition:** Top of Hub view (`selectedTopic === null`).
- **Data Bindings:**
  - `totalTopics`: `PREPARATION_TOPICS.length` (13).
  - `readyTopics`: Topics where `evaluateTopicPreparedness().readiness === 'ready'`.
  - `coveredTopics`: Topics with `preparedness.covered === true`.
  - `evidencedTopics`: Topics with `preparedness.evidenceStrength >= 40`.
- **Layout:** 4 equal-width responsive metric cards on obsidian panels.

### 8.2 Zone 2: Section Progression Matrix (`PreparationSectionCard.tsx`)
- **Render Condition:** Main body of Hub view.
- **Data Bindings:**
  - Iterates `PREPARATION_SECTIONS`.
  - `getSectionStatus(section)`: Evaluates real active topic by `lastAccessedAt` timestamp (never hardcoded to first topic).
  - `getSectionStats(section)`: Computes average evidence strength and topic count.
  - Per Topic: `evaluatePrerequisiteStatus()` and `evaluateTopicProgression()` to display exact lock/unproven/ready status.
- **Primary CTA:** `"Enter {section.title} Workspace"` or `"Resume {activeTopic.title}"`.

### 8.3 Zone 3: Workspace Context & Preparedness Header (`TopicWorkspaceHeader.tsx`)
- **Render Condition:** Top of Workspace view (`selectedTopic !== null`).
- **Data Bindings:**
  - `topic`: Active `PreparationTopic`.
  - `topicSkill`: `skillStates[topic.id]`.
  - `preparedness`: `evaluateTopicPreparedness()`.
  - `progression`: `evaluateTopicProgression()`.
  - Deep-link state: `isDeepLinked` detecting active adaptive session handoff.
- **Elements:**
  - Breadcrumbs with domain badge and return button.
  - Title, description, estimated time, priority, target level.
  - 4-Pillar Preparedness Bar (Covered, Practiced, Assessed, Retained, Interview).
  - Missing proof bullet points.
  - Next Recommended Action bar with Primary CTA.

### 8.4 Zone 4: Prerequisite Proof Gate (`TopicPrerequisiteGate.tsx`)
- **Render Condition:** When `prerequisiteStatus.isLocked === true`.
- **Behavior:** Replaces Stage Tabs & Content to prevent navigating locked material.
- **Elements:**
  - Clear explanation of whether curriculum is incomplete or practice evidence is missing in prerequisites.
  - Actionable buttons to directly open or practice the prerequisite topic.

### 8.5 Zone 5: 7-Stage Progression Workspace (`TopicStageContent.tsx`)
- **Render Condition:** When `prerequisiteStatus.isLocked === false`.
- **Stage Tabs:** Horizontal scrollable tab list (`Orient`, `Learn`, `Apply`, `Assess`, `Review`, `Interview`, `Evidence`) with active state and completion indicators.
- **Stage Completion Header:** Shows current stage name, coverage %, and `"Mark {Stage} Complete"` button.
- **Subtopic Knowledge Cards (Stage 2):** Expandable cards detailing `What`, `Why`, `Example`, `Practice`, and `Proof`.

### 8.6 Zone 6: Practice Session Runner (`PracticeSessionRunner.tsx`)
- **Render Condition:** Modal overlay when `activeSessionId !== null`.
- **Preserved Test Contracts:**
  - Countdown/elapsed timer (`data-testid="session-countdown"` / `session-elapsed`).
  - Self-certification checkbox (`data-testid="self-certification"`).
  - Result score & verdict (`data-testid="result-score"`, `result-verdict`, `result-next-action`, `result-unanswered`).
  - Idempotent submission logging one attempt and one evidence event.

---

## 9. Component Contracts & Props — LOCKED

```typescript
// 1. Preparation Hub View
export interface PreparationHubViewProps {}

// 2. Preparation Section Card
export interface PreparationSectionCardProps {
  section: PreparationSection;
  onSelectTopic: (topic: PreparationTopic) => void;
}

// 3. Topic Workspace
export interface TopicWorkspaceProps {
  topic: PreparationTopic;
  onBackToHub?: () => void;
  onStartSession?: (sessionId?: string) => void;
}

// 4. Topic Stage Content
export interface TopicStageContentProps {
  topic: PreparationTopic;
  activeStage: TopicStageId;
  topicProgress?: PreparationTopicProgress;
  onStartSession?: (sessionId?: string) => void;
}

// 5. Practice Session Runner
export interface PracticeSessionRunnerProps {
  session: PracticeSessionDefinition;
  onClose: () => void;
}
```

---

## 10. Page Action Accent & Design System Tokens — LOCKED

All Preparation UI components must strictly adhere to the design system tokens:
- **Canvas / Background:** `var(--background)` (`#0B100D`)
- **Panel Surfaces:** `var(--surface)` (`#111713`), `var(--surface-elevated)` (`#161E19`), `var(--surface-muted)` (`#1B241F`)
- **Borders:** `var(--border)` (`#28352D`), `var(--border-active)` (`#3C4E43`)
- **Typography:** `var(--foreground)` (`#E8F0E9`), `var(--foreground-muted)` (`#9AA99F`), `var(--foreground-subtle)` (`#86958B`)
- **Primary Brand / Progress:** `var(--primary)` (`#2E8B62`), `var(--accent)` (`#46B982`), `var(--success)` (`#4CAF78`)
- **Semantic Warning / Proof Required / Locked:** `var(--warning)` (`#D19A45` warm bronze)
- **Semantic Danger / Failures:** `var(--danger)` (`#D05A52`)
- **Page Action Accent:** `var(--action-accent)` scoped to the defining CTA (e.g. `"Enter Workspace"`, `"Prove Readiness"`, `"Mark Stage Complete"`).

**Strict Prohibitions:**
- NO hardcoded legacy hex codes (`#14171D`, `#1B2028`, `#262D38`, `#E5A93C`, `#FFC665`, `#432C00`).
- NO arbitrary utility colors (`bg-emerald-500`, `text-amber-400`, `bg-blue-600`).
- NO neon glow boxes, particle animations, or excessive shadows.

---

## 11. Animation & Motion Specification — LOCKED

- **Micro-interactions:** `120–180ms` ease-out (button hover, card expansion, stage tab selection).
- **Surface Transitions:** `200–250ms` ease-out (switching between Hub and Workspace).
- **Subtopic Card Disclosure:** Smooth vertical accordion expansion `200ms` ease-out.
- **Modal Backdrop:** `200ms` fade-in / fade-out.
- **Reduced Motion:** Fully honors `@media (prefers-reduced-motion: reduce)` by disabling all animations and transitions.

---

## 12. Responsive Behavior & Viewport Breakpoints — LOCKED

| Viewport | Hub View Adaptation | Workspace Adaptation | Runner Modal |
|---|---|---|---|
| **1440 × 900** | 4-column metric strip, 2×2 section grid. | Full multi-column workspace, wide subtopic cards. | Centered modal (max 640px). |
| **1280 × 800** | Proportional scaling, side-by-side section cards. | Balanced 2-column details & stage layout. | Centered modal. |
| **1024 × 768** | 2-column metrics, 2-column section grid. | Single column with sticky breadcrumb bar. | Centered modal. |
| **768 × 1024** | 2-column metrics, stacked 1-column section cards. | Scrollable stage tabs, stacked preparedness strip. | Full-width padded dialog. |
| **375 × 667** | 1-column vertical stack, full-width touch buttons. | Horizontal swipeable stage tabs, full-width cards. | Bottom-sheet dialog, full viewport width. |

---

## 13. Accessibility Requirements — LOCKED

1. **Semantic Hierarchy:** `h1` for Preparation Hub / Topic Title, `h2` for Section / Stage Names, `h3` for Subtopics / Objectives.
2. **Tablist Semantics:** Stage navigation selector must use `role="tablist"`, with buttons having `role="tab"`, `aria-selected="true|false"`, and `aria-controls`.
3. **Progress Indicators:** Preparedness and coverage meters must use `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`.
4. **Interactive Controls:** All buttons and interactive cards must feature visible focus rings (`focus-visible:ring-2 focus-visible:ring-offset-1`).
5. **Non-Color Communication:** Status states (`Locked`, `Proof Needed`, `Ready`, `Fresh`, `Stale`) must always present text labels and icons alongside color indicators.

---

## 14. Cross-Subsystem Handoffs & Preserved Contracts — LOCKED

1. **Today → Preparation:**
   - Handoff route: `#/preparation/<topicId>`.
   - Workspace detects `isDeepLinked`, displays session banner, and provides `"Complete Activity & Advance"` which calls `session.advanceActivity('completed')` and routes back to `#/dashboard`.
2. **Roadmap → Preparation:**
   - Curriculum node click navigates to `#/preparation/<topicId>` via `getPreparationTopicIdByRoadmapId()`.
   - Workspace provides `"View in Roadmap"` button routing back to `#/roadmap/<roadmapTopicId>`.
3. **Weakness Router & DSA Remediation → Preparation:**
   - Conceptual weakness triggers remediation routing to `#/preparation/<topicId>`.
   - Completing the lesson/stage logs canonical evidence and clears remediation flag.

---

## 15. Architecture Guardrails — LOCKED

The redesign **MUST NOT MODIFY**:
- `src/engine/preparationEngine.ts` pure logic functions.
- `src/engine/practiceEngine.ts` pure logic functions.
- `src/storage/storageAdapter.ts` data structures or schemas.
- `src/data/preparationDataset.ts` topic and section datasets.
- Context state management in `PlacementContext.tsx`.
- Evidence attribution scoring rules (+15 conceptual capped at 35; >=40 strictly reserved for practice/assessments).

---

## 16. Non-Goals — LOCKED

- No backend, cloud sync, or external database.
- No runtime LLM generation or dynamic question authoring.
- No changes to existing readiness calculation algorithms.
- No gamification badges, XP systems, or decorative education animations.

---

## 17. Acceptance Criteria Checklist — LOCKED

- [ ] **AC-1:** Hub View displays 4 macro metrics with 100% accurate data derived from `preparationTopicProgress` and `skillStates`.
- [ ] **AC-2:** Hub View renders 4 section cards with honest active topic detection (by `lastAccessedAt`) and real next actionable steps.
- [ ] **AC-3:** Deep linking (`#/preparation/<topicId>`) directly opens `TopicWorkspace` for the target topic and displays session banner when arriving from active sessions.
- [ ] **AC-4:** Locked topics render the `TopicPrerequisiteGate` explaining unmet curriculum or missing practice proof with direct action buttons.
- [ ] **AC-5:** Unlocked topics render the 4-Pillar Preparedness Model with accurate coverage %, attempt count, best assessment score, and retention evidence.
- [ ] **AC-6:** Stage selector uses accessible `tablist`/`tab` attributes and allows navigating across all 7 stages.
- [ ] **AC-7:** Subtopic Knowledge Cards expand smoothly to show `What`, `Why`, `Example`, `Practice`, and `Proof`.
- [ ] **AC-8:** `PracticeSessionRunner` modal preserves all test contracts (`data-testid="self-certification"`, timer, score, verdict, unanswered warning).
- [ ] **AC-9:** Zero legacy color literals (`#14171D`, `#E5A93C`, etc.) remain in Preparation components.
- [ ] **AC-10:** 100% of test suite passes (476+ tests), 0 lint errors, and production build succeeds.

---

## 18. Manufacturing Plan (3 Parts) — LOCKED

The manufacturing of the redesigned Preparation subsystem will execute in 3 focused, reviewable parts:

### Part 1: Hub Architecture & Section Progression Matrix
- Create `PreparationHeader.tsx` and `PreparationMasteryStrip.tsx` with macro metrics.
- Redesign `PreparationSectionCard.tsx` and `PreparationHubView.tsx` with clean obsidian styling and action accent CTA.
- Remove hardcoded SVG motifs in favor of clean iconography and structured metadata badges.
- Verify hub tests and deep-link routing.

### Part 2: Knowledge Workspace & Stage Progression Environment
- Redesign `TopicWorkspace.tsx` and break into focused modular components:
  - `TopicWorkspaceHeader.tsx` (Preparedness model, missing proof list, primary next action).
  - `TopicPrerequisiteGate.tsx` (Lock state with prerequisite actions).
  - `TopicStageContent.tsx` (7 stage renderers, subtopic knowledge cards with accordion disclosure).
- Replace all legacy colors with canonical CSS variables.
- Verify stage completion transitions and evidence logging.

### Part 3: Practice Session Runner & Verification
- Redesign `PracticeSessionRunner.tsx` with obsidian surfaces, timer bar, self-certification checkbox, confidence rating, and results screen.
- Verify deep-link completion handoff with `SessionContext`.
- Run full Vitest suite, ESLint check, and production build.

---

**END OF SPECIFICATION — FROZEN FOR MANUFACTURING**
