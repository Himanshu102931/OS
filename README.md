# PlacementOS — Personal Placement Control System

PlacementOS is a deterministic, local-first placement preparation dashboard and adaptive engine designed for systematic computer science placement preparation (Horizon: September 1, 2026 – May 31, 2027).

Unlike generic educational tools or consumer platforms, PlacementOS operates as a studio-grade developer workspace built for disciplined, deliberate practice.

---

## 🚀 Key Architectural Pillars

- **Local-First & Offline-Capable**: 100% client-side React + TypeScript application with zero external cloud API dependencies. All progress, evidence logs, attempt histories, and target overlays are safely stored in browser `localStorage`.
- **Deterministic Adaptive Recommendation Engine**: Uses an explicit 6-factor weight formula ($1.00$ total) to calculate daily study priorities without random selection or runtime LLM dependencies:
  $$\text{Score} = 0.25(\text{Urgency}) + 0.20(\text{Weakness}) + 0.20(\text{Importance}) + 0.15(\text{Company}) + 0.10(\text{Spaced Repetition}) + 0.10(\text{Recovery})$$
- **Leitner 4-Box Spaced Repetition & Algorithmic Problem Laboratory**: 5-zone DSA command center supporting a curated 150-problem curriculum across 17 algorithmic patterns:
  - **Zone 1: Mastery Strip**: Macro progress tracking across 150 problems, Leitner distribution (Box 1: 1d, Box 2: 3d, Box 3: 7d, Box 4: 14d Mastered), due review count, and pattern mastery ratio.
  - **Zone 2: Active Focus**: Deterministic dominant training mission identifying the next unlocked problem, due review, or pattern remediation.
  - **Zone 3: Spaced Review Queue**: Explicit forgetting-curve review deck prioritizing due reviews with one-click logging.
  - **Zone 4: Pattern Mastery Matrix**: 17 algorithmic pattern cards tracking progression criteria, starter/core solve counts, and active filter control.
  - **Zone 5: Curated 150-Problem Workbench**: High-density practice catalog with multi-factor search, difficulty filters, Leitner box badges, and subordinate actions.
  - **Detail Layer**: Protocol-accurate attempt logging modal (`DSAAttemptModal`) with self-check ratings and remediation learning drawer (`TaskLearningWorkspaceDrawer`).
- **4-Phase Authoritative Roadmap & Trajectory Control**:
  - Interactive trajectory navigation connecting 4 placement phases:
    - **Phase 1** (Sep 1 – Nov 30, 2026): Core Foundations & Early Skills (DSA, Python, SQL, DBMS, OS, CN, OOP, Aptitude, Communication, Projects, Mock Interviews)
    - **Phase 2** (Dec 1, 2026 – Jan 31, 2027): Advanced Topics & Core CS Deep-Dive (DSA, Python, SQL, OS, CN, OOP)
    - **Phase 3** (Feb 1 – Mar 31, 2027): Intensive Mock Drills & Timed Assessments
    - **Phase 4** (Apr 1 – May 31, 2027): Placement Sprint & Final Drive Sweep
  - Temporal position tracking, active vs selected phase distinction, curriculum milestones with collapsible modules, domain-specific filtering, deterministic immediate unblocked focus selection, and full prerequisite lock tracing with deep-linked topic drawers.
- **Preparation Progression & Knowledge Workspace**:
  - **Zone 1: Hub Header & Macro Readiness Strip**: Real-time curriculum readiness tracking across 20 foundational topics, preparedness distribution (Covered, Practiced, Assessed, Retained, Mastered), and active topic focus selector.
  - **Zone 2: Section Progression Matrix**: 4-section curriculum grid (Core CS, System Design, Coding Foundations, Applied Practice) tracking module completion, unproven topics, and immediate learning targets.
  - **Zone 3: Workspace Context & 4-Pillar Preparedness Model**: Deterministic proof evaluation per topic tracking:
    1. *Covered*: Orient + Learn completed or passing score.
    2. *Practiced*: Apply stage completed or hands-on practice logged.
    3. *Assessed*: Passing score ($\ge 70\%$) demonstrated in practice assessments.
    4. *Retained*: Active non-stale evidence strength ($\ge 60/100$) + Interview stage completion.
  - **Zone 4: Prerequisite Proof Gate**: Explicit dependency barrier explaining locked topics and unmet prerequisite curriculum/evidence with direct deep-link navigation.
  - **Zone 5: 7-Stage Progression Rail with "Knowledge Flow" Signature Motion**: Connected learning progression (Orient $\rightarrow$ Learn $\rightarrow$ Apply $\rightarrow$ Assess $\rightarrow$ Review $\rightarrow$ Interview $\rightarrow$ Evidence) animated with a continuous 16s traveling energy beam, canonical current-stage breathing halo, and subtopic knowledge cards with accordion drill-downs (*What, Why, Example, Practice, Proof*).
  - **Zone 6: Diagnostic Practice Session Runner**: Focused training and diagnostic modal featuring the *Diagnostic Pulse* active scan motion, MCQ/subjective inputs with self-certification, hint support, and canonical evidence logging.
- **11-Domain Skill Matrix**: Real-time strength calculation (0–100) and freshness tracking (`Fresh`, `Aging`, `Untested`) across DSA, SQL, Python, DBMS, OS, CN, OOP, Projects, Communication, Aptitude, and Mock Interviews.
- **Skill Freshness Explanation**: Plain-language explanation of why a skill has its current freshness state (`fresh`, `aging`, `stale`, or `untested`), based on deterministic analysis of last practice/assessment evidence. Uses existing canonical evidence data — no new freshness calculation. Explains: "Fresh because recent evidence demonstrates the skill," "Aging because evidence is becoming old," "Stale because no sufficiently recent evidence exists," "Untested because no demonstrated evidence found."
- **Company Target Alignment Radar & Recruiter Requirement Matrix**:
  - **Zone 1: Header & Drive Timeline Strip**: Macro corporate target tracking with 4-metric strip (Active Targets Count, Top Benchmark Readiness %, Next Drive Countdown, Total Unresolved Requirement Gaps).
  - **Zone 2: Primary Target Focus & Drive Urgency Hero**: Deterministic #1 priority target spotlighting the nearest recruitment drive, application status, countdown tag, overall readiness progressbar, critical deficit spotlight, and 1-click `"Prepare for Company"` Coral Flame action CTA (`#F43F5E`).
  - **Zone 3: Target Companies Portfolio & Radar Grid**: Searchable, status-filtered, multi-criteria sorted portfolio cards with readiness meters, assessment countdown tags, required domain/language chips, top 2 preparation gaps, and inline delete safety.
  - **Zone 4: Requirement Coverage Matrix & Gap Breakdown**: Dense technical ledger for the focused company categorized across Domains, Topics, and Languages with evidence strength progressbars, level progress ($L1..L4$), canonical requirement status badges, and 1-touch gap closure triggers.
  - **Zone 5: Requirement Traceability Drawer & Modal Workbench**: Slide-over causal evidence drawer powered by `EvidenceTracePanel` and verified deep-link action execution to DSA, Roadmap, Preparation, and Practice workspaces, paired with an accessible Add/Edit Company Profile modal.
- **Interview Readiness Scorecard & Multi-Vector Telemetry Console**:
  - **Zone 1: Header & Readiness Telemetry Strip**: Multi-meter telemetry console reporting categorical Readiness Band (`Strong`, `Developing`, `Needs Work`, `Unassessed`), three strictly independent meters (*Evidence Strength %*, *Confidence %*, *Freshness %*), target company alignment filter, and active anomaly counters (DSA remediation, stale dimensions, weak evidence).
  - **Zone 2: Primary Readiness Mission Spotlight**: Dominant hero directing the candidate to the single highest-leverage exercise (Diagnostic Assessment, DSA Remediation, Mock Interview Drills, Project Defense) with the defining Electric Indigo action accent (`#6366F1`).
  - **Zone 3: 6-Vector Readiness Dimension Matrix**: Exhaustive evaluation across all 6 canonical dimensions (*Coding/DSA*, *Core CS*, *SQL/Programming*, *Communication*, *Interview Execution*, *Projects*) with independent mini-meters, company requirement chips, and expandable `EvidenceTracePanel` drill-downs.
  - **Zone 4: Subsystem Cross-Readiness & Signal Hub**: Dual-column deep dive linking Baseline Diagnostic status, Project Lab defense proof, and Active Weakness & Remediation triage shortcuts.
  - **Zone 5: Target Company Alignment Radar & Evidence Ledger**: Company requirement coverage list with assessment event countdowns and transparent proof-of-work evidence traceability.
- **Operational Telemetry Console & Evidence Review Observatory**:
  - **Zone 1: Telemetry Command Header & Time-Window Scope**: Macro telemetry control surface displaying operational horizon scope, accessible 4-segment time-window selector (`7d`, `30d`, `phase`, `all`), exact calendar range readouts, and direct Raw Telemetry inspector triggers.
  - **Zone 2: Operational Health & Velocity Strip**: 4 high-density deterministic telemetry surfaces reporting:
    1. *Study Velocity*: Honest logged study hours and sealed days consistency rate ($0..100\%$).
    2. *Curriculum Velocity*: Roadmap tasks completed, active phase completion %, and overall curriculum completion %.
    3. *DSA Solve Quality*: Solved problem counts with strict breakdown of Independent vs Assisted solve ratios.
    4. *Bottleneck Debt*: Aggregated evidence-backed bottleneck counters tracking overdue Leitner reviews, stale topics (>14d inactive), and active remediation requirements.
  - **Zone 3: Telemetry Observatory (Dual-Panel Memory & Progression Radar)**: Dual-panel analytical visualization:
    1. *Leitner Spaced Repetition Radar*: 4-segment proportional stacked box bar across 150 curated problems (Box 1–4 distribution), review retention rate indicator ($0..100\%$), and overdue review status.
    2. *Pattern Progression & Domain Readiness Radar*: 17-pattern progression gauge (attempted vs total count) and weighted 11-domain curriculum readiness meter.
  - **Zone 4: Evidence-Backed Operational Review Recommendations**: Dominant Primary Review Spotlight with 1-click **"Execute Operational Review"** CTA, paired with a causal recommendation grid for overdue spaced reviews, remediation drills, stale topic evidence, and repeatedly postponed tasks with integrated `EvidenceTracePanel` verification and honest empty states.
  - Defining Action Accent: **Crimson Pulse / Diagnostic Rose (`#F43F5E`)** highlighting high-severity operational review actions.
  - Signature Motion: **Telemetry Signal Pulse & Sweep (`telemetry-sweep`, `telemetry-pulse`)** with strict reduced-motion safety.
- **Daily Execution & Sealing Protocol**: Structured workflow featuring Morning Planning, Task Execution, Evidence Logging, Evening Reflection, and Day Sealing immutability.
- **Daily Plan & Adaptive Session Convergence**: Unified "What should I do today?" execution loop directly connecting Morning Planning (`todayAssignments`) with the Adaptive Session Composer (`SessionDisplay`). Committed daily assignments seamlessly guide adaptive session composition (flagged with a `Plan Aligned` session indicator and `Daily Plan` activity badges), while completing mapped session activities deterministically synchronizes assignment completion back to the daily plan with strict day-sealing immutability, duplicate-candidate filtering, and zero duplicate evidence.
- **Direct Leitner DSA Reviews in Morning Planning & Evening Reflection**: Morning Planning allows users to intentionally select and commit due Leitner DSA review and eligible new algorithmic problems directly into the Daily Plan. Committed DSA assignments converge deterministically into Adaptive Sessions without duplicate scheduling against the review engine. Completing a committed DSA problem through canonical attempt logging synchronously records evidence, advances Leitner box intervals and review dates, and marks the corresponding daily assignment as completed under strict day-sealing protection. Both roadmap curriculum tasks and direct DSA assignments seamlessly converge into Evening Reflection, enabling unified daily reflection, actual time logging, and immutable day sealing.

---

## 🛠️ Technology Stack

- **Framework**: React 19 + TypeScript 6.0
- **Build Tool**: Vite 8
- **Styling**: TailwindCSS 4 (Forest-green studio design system: deep obsidian `#0B100D`, primary forest `#2E8B62` / `#46B982`, warning bronze `#D19A45`, action coral `#F43F5E`, action indigo `#6366F1`)
- **Icons**: Lucide React
- **Testing**: Vitest (1,701 automated tests across 94 test files)
- **Routing**: Client-side hash routing (`#/${route}`)
- **Persistence**: `StorageAdapter` with JSON backup export/import

---

## 📖 Project Documentation

- 🎨 **Design System Reference**: Detailed color tokens, typography scale (Inter + JetBrains Mono), elevation planes, and component specifications are documented in [`docs/design/DESIGN.md`](docs/design/DESIGN.md).
- 🎯 **System Customizations**: Application rules and agent guidance are organized under [`.agents/rules/`](.agents/rules/).

---

## 💻 Local Development

### 1. Installation
```bash
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Run Quality Suite
```bash
npm test        # Execute Vitest scenario tests
npm run lint    # Run ESLint check
```

### 4. Build for Production
```bash
npm run build   # Generate static dist bundle
```

---

## 🌐 Production Deployment

PlacementOS builds as a pure static web application. It can be deployed to static web hosts (Vercel, Netlify, GitHub Pages) without server URL rewrite configuration due to its hash-based routing.

- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Storage Note**: *Hosting the frontend makes the application accessible from multiple devices, but LocalStorage remains device/browser-specific.* Use the built-in **Export / Import JSON Backup** in Settings to transfer state between browsers or devices.

---

## 📜 License

Private personal placement preparation system.
