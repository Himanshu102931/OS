# PlacementOS Diagnostic & Adaptive Assessment Specification v1.0

**Status:** SPECIFICATION ONLY — no implementation authorized by this document.
**Baseline commit:** `4b5e039` — `fix(data): close placement data audit findings`
**Date:** 2026-09-30
**Scope:** A distinct, cross-cutting assessment layer over the existing PlacementOS placement system.

> **Reading contract.** Nothing in this document modifies source code, engines, storage,
> routes, UI, DSA-150, practice banks, preparation content, company overlays, or any
> > existing dataset. Sections marked **DECIDED** reflect locked product choices; no
> > unresolved items remain. All counts cited as "current" refer to the invariant state
> > verified at commit `4b5e039`.

---

## 1. Purpose

PlacementOS currently derives learner readiness from *accumulated work evidence*:
roadmap task completion, DSA attempts and Leitner state, practice attempts, and
preparation progress. All of this answers the question *"what has the learner done?"*
It does not directly answer:

> *"What can the learner actually do right now, across the full placement domain set,
> before any of that work has happened?"*

The Diagnostic & Adaptive Assessment System exists to answer that question and to keep
answering it over time.

Its purposes, in order:

1. **Establish a starting capability profile.** A single, time-bounded **Baseline
   Diagnostic** (180 minutes) produces a defensible per-domain estimate of the learner's
   initial ability — or an explicit admission that a domain could not be measured.
2. **Separate what is known from what is not.** Every domain carries a status
   (`assessed` / `partially_assessed` / `unassessed`) alongside its level and
   confidence, so the system never presents absence of evidence as evidence of absence.
3. **Identify strengths, weaknesses, and error patterns** at domain, topic, and
   competency granularity, including *why* items were missed — not merely *that* they
   were missed.
4. **Generate the initial adaptive plan** — priorities, starting points, difficulty and
   review density — without rewriting the master curriculum.
5. **Continuously reassess** through adaptive 90-minute Sunday mini-tests and periodic
   full reassessment, so the profile tracks growth, decays honestly, and resists
   overreaction to a single noisy result.

The system is explicitly **not** a certification exam, not a proctored test, and not a
replacement for demonstrated work evidence. It is a personal diagnostic instrument
inside a local-first learning application (§29, §31).

---

## 2. Design Principles

**P1 — Evidence, not intuition.**
Every level, strength, and weakness shown to the learner must trace back to recorded
responses or recorded work. No vibes-based ratings. No fabricated measurements.

**P2 — Four separate concepts, never collapsed.**
`LEVEL` (demonstrated capability), `EVIDENCE` (the work/responses proving it),
`CONFIDENCE` (how trustworthy the level estimate is), and `STATUS`
(assessed / partially_assessed / unassessed) are distinct fields with distinct
lifecycles. A single numeric field may never represent all four.

**P3 — Level 0 means "not demonstrated," not "cannot."**
Initial state for every measurable quantity is Level 0 / Unassessed: *"No valid
PlacementOS evidence has yet established this ability."* UI copy (future) must use
this framing.

**P4 — Honest measurement boundaries.**
If the assessment format cannot validly measure a capability, the system records
`unassessed` or `partially_assessed` rather than emitting a plausible-looking number
(§4 matrix is the authority for these boundaries).

**P5 — Deterministic, auditable scoring (V1).**
All scoring and selection logic is a pure function of stored data. No LLMs, no
randomness that cannot be reproduced from stored seeds, no opaque heuristics. This
matches the existing engine architecture (all engines in `src/engine/` are pure).

**P6 — Assessment is a cross-cutting layer, not a 12th domain.**
The 11 placement domains are complete and closed (§3). There is no "Assessment"
domain. Assessment *measures* domains.

**P7 — Curriculum stability.**
Assessment influences priority, difficulty, frequency, and starting point. It never
rewrites the roadmap, modules, topics, tasks, DSA-150, or preparation content.

**P8 — Evidence-source integrity.**
Assessment events are their own evidence kind. They are never disguised as
`practice_session`, `daily_assignment`, or `dsa_attempt` records (§23).

**P9 — Exposure discipline.**
A previously seen item must not repeatedly inflate ability estimates. Item exposure is
tracked, and estimation discounts or excludes exposed items (§13).

**P10 — Separation of banks.**
Curriculum, practice, diagnostic, and weekly assessment items are separate pools that
may share infrastructure but never share uncontrolled exposure (§13, §14).

**P11 — Conservative movement.**
Levels rise with sufficient positive evidence and fall only with sufficient
contradictory evidence. One test — good or bad — never locks or destroys a level
(§17).

**P12 — AMCAT-inspired, not AMCAT-cloned.**
Borrow the useful principles (modular assessment, adaptive difficulty, domain-specific
results, difficulty-aware scoring, strengths/weaknesses feedback, weakness-directed
preparation, practical coding where appropriate). Do not copy counts, timings,
scoring formulas, implementation, branding, or proprietary content (§5).

**P13 — Local-first honesty.**
The system states what it cannot guarantee (proctoring, item security, external
anti-cheating) instead of implying guarantees it cannot deliver (§29).

**P14 — Decision discipline.**
Anything that cannot be responsibly determined is marked **DECIDED** with the locked
choice, rationale, and consequences. All product decisions for V1 are locked in §37;
no unresolved items remain.

---

## 3. Relationship to Existing PlacementOS

### 3.1 Current authoritative baseline (unchanged)

Verified at `4b5e039` — this specification changes none of it:

| Area | Invariant |
|---|---|
| Domains | 11 (dsa, python, sql, dbms, os, cn, aptitude, communication, projects, interviews) |
| Roadmap | 4 phases · 11 domain modules set · 23 modules · 23 roadmap topics · 24 tasks |
| DSA | 150 canonical problems · 17 patterns · tiers 46/74/30 · phases 65/73/12 · 24 learning resources |
| Practice | 34 sessions · 415 questions (317 semantically verified MCQs) |
| Preparation | 4 sections · 13 topics · 162 subtopics · 162 cards · 35 resources · 11 bridges |
| Milestones / allocation | 17 milestones · 6 allocation groups summing to 100 across 11 domains |
| Evidence infra | `TopicSkillState`, `EvidenceLog`, DSA Leitner/attempt evidence, practice attempts, preparation progress, company overlays (2 seed examples), Project Lab |

### 3.2 Layering

```
┌─────────────────────────────────────────────────────────────┐
│                 ASSESSMENT LAYER (this spec)                │
│  Baseline Diagnostic · Sunday Mini Test · Full Reassessment │
│  DomainAssessmentProfile · WeaknessSignals · Snapshots      │
└───────────────┬─────────────────────────────────────────────┘
                │ reads evidence / writes assessment evidence only
┌───────────────▼─────────────────────────────────────────────┐
│              EXISTING PLACEMENT SYSTEM (untouched)          │
│  Roadmap · DSA-150 + Leitner · Practice 34/415 ·            │
│  Preparation · Skills/Readiness · Project Lab · Companies   │
│  adaptiveEngine · skillsEngine · dsaEngine · practiceEngine │
└─────────────────────────────────────────────────────────────┘
```

Rules of engagement:

1. The assessment layer is **additive**. New data entities (§31), one new engine module
   (future), one optional storage field (§27), and — in a later implementation phase —
   one new route.
2. Existing engines are **read-compatible, not modified** in the baseline phase.
   Integration points where assessment results will later feed existing systems are
   specified in §23–§26 as *planned contracts*, each gated behind its own implementation
   phase (§35).
3. Existing datasets (`src/data/**`) are never modified to create assessment content.
   Assessment items live in new files (§31, §32).
4. Existing evidence (task, DSA, practice, preparation, manual override) keeps its
   current meaning, formulas, and precedence. Assessment adds a *parallel* evidence
   stream with explicit precedence rules (§24), it does not merge into or reweight the
   existing formulas.

### 3.3 Existing concepts that already use the word "assessment"

The repository already contains three distinct uses of "assessment" that must not be
confused with this subsystem:

| Existing use | Location | Meaning | Relationship |
|---|---|---|---|
| `taskType: 'assessment'` | `TaskDefinition`, 2 seed tasks | A roadmap task *kind* ("Mock Interviews & Assessments" module) | Unrelated; remains a curriculum task type |
| Preparation "Assess" stage / `assessmentPerformance` | `preparationEngine.ts`, `ASSESSMENT_PCT` | Per-preparation-topic practice-assessment pass rate (≥70%) | Existing topic-level proof pillar; untouched. Assessment layer may later *read* it, never writes it |
| `PracticeSignals.assessmentDue` | `adaptiveEngine.ts` | Signal: practice is stale/absent | Existing signal; untouched |
| `EvidenceLog.sourceType: 'test'` | `types/index.ts` (currently unused member) | Reserved union member | **Adopted** by this spec as the evidence marker for assessment-emitted topic evidence (§23) |

### 3.4 What "initial state" means for the assessment layer

On first run (or after a data reset), the assessment layer ships with:

- `assessmentState` absent/empty → every domain: **Level 0, status `unassessed`, confidence `none`**.
- No attempts, no snapshots, no weakness signals, no exposures.
- Curriculum, DSA, practice, preparation, and all existing evidence **exactly as today**.

---

## 4. 11-Domain Assessment Matrix

Classification key:

- **A — Fully measurable in baseline:** the format can produce a strong, defensible
  domain level from a single sitting.
- **B — Partially measurable:** a meaningful *scoped* signal is possible, but the
  resulting level is **provisional** and covers only part of what the domain name
  implies.
- **C — Not meaningfully measurable in baseline:** no honest level can be produced;
  domain stays Level 0 / `unassessed` until practical evidence exists.

### 4.1 Matrix

| # | Domain | Class | Measurable in baseline | Not measurable in baseline | Recommended item formats | Evidence quality | Level strength | Must be replaced/supplemented by |
|---|---|---|---|---|---|---|---|---|
| 1 | DSA | **A** | Pattern/constraint recognition, algorithm selection, code tracing, complexity reasoning, debugging of given code, constrained coding (written/self-checked) | Sustained independent implementation under real judge conditions; speed at real coding; end-to-end problem solving | Code tracing, output prediction, MCQ pattern selection, complexity analysis, short debugging, 1–2 constrained coding items | High | **Strong** (provisional until first reassessment confirms) | Ongoing DSA-150 mastery (Leitner + `calculatePatternMastery`) remains the stronger long-term source (§14, §25) |
| 2 | Python | **B** | Language semantics, code reasoning, output prediction, debugging, control flow, data-structure behavior, API knowledge | *Practical coding execution* — no code-execution runtime exists in the app (no Pyodide/worker sandbox), so written answers cannot be auto-run | Code-trace MCQ, debug-the-bug, short written code, fill-the-blank, scenario MCQ | Medium–High for reasoning; **none** for execution | **Provisional**, scoped to "reasoning & debugging" | Later: real coding tasks, executed snippets (if a sandbox is ever adopted — see DECIDED 1), project evidence |
| 3 | SQL | **A** | Query reasoning, SELECT/filter semantics, JOIN logic, GROUP BY/aggregation, subquery and window-function reasoning, NULL semantics; written query correctness can be graded against authored answer keys | *Executed* query validation against a live engine (none exists in-app); schema design at scale | Query-selection MCQ, "what does this query return," short written query, scenario with given schema | High | **Strong** (provisional until confirmed) | Later: executed-query checks (DECIDED 1), real data tasks |
| 4 | DBMS | **A** | Concepts (normalization, transactions, indexing, ACID, storage), scenario reasoning, trade-off judgment | Deep practical administration skill | MCQ, multiple-response, scenario/case items | High | **Strong** (provisional until confirmed) | Practical DB work; stays MCQ/scenario-validated by design |
| 5 | OOP | **A** | Principles (encapsulation, inheritance, polymorphism, abstraction), code reasoning, design-choice trade-offs, spotting violations | Real refactoring skill; framework fluency | Code-reasoning MCQ, output-of-inheritance-trace, short design answer | High | **Strong** (provisional until confirmed) | Project code review evidence |
| 6 | OS | **A** | Concepts (processes, threads, memory, scheduling, I/O, synchronization), scenario reasoning | Kernel-level practical skill | MCQ, scenario items, short answer | High | **Strong** (provisional until confirmed) | Practical system work |
| 7 | CN | **A** | Concepts (layering, routing, TCP/UDP, DNS, HTTP, congestion), scenario and packet-reasoning items | Real network diagnostics | MCQ, scenario items, diagram-free packet/sequence reasoning | High | **Strong** (provisional until confirmed) | Practical networking work |
| 8 | Aptitude | **A** | Numerical/data interpretation, logical reasoning, speed under time constraint — the domain is *defined* by timed objective testing | — (fully aligned with format) | Timed MCQ, data-interpretation sets, quant word problems | High | **Strong** (provisional until confirmed) | Real OA performance; speed index tracked separately (§15) |
| 9 | Communication | **B** | Grammar, vocabulary, reading comprehension, written organization and clarity | **Speaking ability, fluency, interview delivery, pronunciation, real-time conversational skill** — a written score must never be presented as speaking ability | Comprehension passage + items, grammar/vocabulary MCQ, 1 short structured written response (analytic rubric) | Medium (written constructs only) | **Provisional**, scoped to "written/verbal knowledge" | Later: interview answers, verbal communication, mock-interview performance, structured speaking assessment if available (§21) |
| 10 | Projects | **C** | *Nothing valid.* No MCQ proxy may establish project capability | Implementation, debugging, architecture, testing, deployment, defense, explanation | **None — excluded from baseline** | None | **No level** — Level 0 / `unassessed` until project evidence (§20) | Project Lab evidence: implementation, debugging, architecture, project defense, testing, deployment, explanation |
| 11 | Interviews | **B** | Technical interview knowledge, familiarity with question types, behavioral-scenario understanding (STAR structure knowledge), resume/self-presentation knowledge | **Actual interview performance**: composure, delivery, follow-up handling, live problem articulation | Technical-knowledge MCQ, "how would you approach" structured written answer, behavioral-scenario judgment | Medium (knowledge constructs only) | **Provisional**, scoped to "interview knowledge" | Later: mock interviews, technical explanation, follow-up handling, project defense, behavioral responses (§22) |

### 4.2 Matrix reasoning (required before blueprint finalization)

- **Why DSA/SQL/DBMS/OOP/OS/CN/Aptitude are class A:** each has a stable, well-sampled
  knowledge structure that objective + short constructed items can discriminate across
  the full ability range; each admits difficulty stratification (§8); each tolerates a
  10–35 minute module without invalidating the construct through fatigue.
- **Why Python and Communication and Interviews are class B:** in each case the domain
  *name* is broader than what a written, unproctored, execution-free sitting can
  establish. Python loses the execution construct; Communication loses the speaking
  construct; Interviews lose the performance construct. Class B levels are therefore
  labeled **provisional** and *scoped* — the profile stores which construct was covered
  (coverage, §11) so a Level 3 "Communication" always renders as
  *"Level 3 (written/verbal knowledge, provisional)"* in future UI copy.
- **Why Projects is class C:** the only honest evidence of project capability is
  project work. An MCQ would create a fabricated level and violate P1/P3/P4. Projects
  is excluded from the baseline blueprint entirely (§20).
- **Why the baseline must not over-claim:** a 180-minute sitting measures a *sample*
  under *one format*. The matrix plus confidence/status fields (§2, §11) are the
  structural guarantee that the system distinguishes a measured construct from an
  assumed one.

### 4.3 Status semantics per class

| Class | Status after baseline | Level outcome |
|---|---|---|
| A | `assessed` if minimum evidence met (§6), else `partially_assessed` | Level 1–5 from ability estimate, provisional until confirmation |
| B | `partially_assessed` (always — scope is partial by definition) | Level 1–5 **for the covered construct only**, provisional |
| C | `unassessed` (always, from baseline) | Level 0 |

Minimum evidence thresholds (shared by A and B): a domain reaches `assessed` /
`partially_assessed` status only with **≥5 scored responses**, spanning **≥2 difficulty
bands** and **≥2 topics or competencies**; below that it is `unassessed` at Level 0
regardless of what was answered. *(Exact numeric thresholds are design constants held
in one place; see DECIDED 4 for the confirmation of final values.)*

---

## 5. Baseline Diagnostic

**Name:** BASELINE DIAGNOSTIC
**Definition:** the first full-capability assessment establishing the learner's
starting profile.

### 5.1 Hard rules

| Rule | Value |
|---|---|
| Maximum duration | **180 minutes (3 hours)**, wall-clock |
| Structure | One uninterrupted sitting |
| Pause | **Not permitted** after start |
| Submission | **Automatic submission at the hard time limit**; no grace period |
| Resume | An interrupted attempt (tab closed / browser closed) is marked `abandoned`; partial responses are retained for diagnostics but **the attempt cannot be resumed** — a restart creates a new attempt (items then follow exposure rules, §13) |
| Domain set | Every domain per §4 (Projects excluded, §20) |
| Availability | Once baseline is complete, the baseline is not re-offered; use Full Reassessment (§19) |

### 5.2 Purpose (restated as acceptance intent)

1. Estimate starting ability across every domain that can be *validly* measured in this
   format.
2. Leave unmeasurable domains at **Level 0**, status `unassessed` / `partially_assessed`
   (§4.3).
3. Produce strengths, weaknesses, recommended starting points, and the initial adaptive
   plan inputs (§16).

### 5.3 Anti-fatigue posture

The blueprint (§6) budgets **160 minutes of assessed content + 20 minutes of system
buffer** (instructions, module transitions, optional end-review) inside the 180-minute
hard limit. Item counts are set for *measurement quality per minute*, not maximum
volume (§7 of the brief: coverage + quality + reasonable fatigue + time validity +
domain discrimination). Adaptive routing (§9) may *shorten* a module when evidence is
already decisive; it may never lengthen the sitting beyond 180 minutes.

### 5.4 AMCAT inspiration boundary (P12)

Borrowed: modular per-domain sections, adaptive difficulty within sections,
domain-specific result reporting, difficulty-aware scoring, explicit
strengths/weaknesses output feeding preparation, practical/coding items where the
format supports them.

Not borrowed: exact question counts, exact timing, exact scoring formulas,
proprietary item formats or content, branding, or any proprietary implementation
detail. All numbers in §6 are PlacementOS's own, derived from this repo's content
density and the fatigue/time constraints above.

---

## 6. Baseline Blueprint

### 6.1 Blueprint rationale (required before finalization)

The brief forbids optimizing for question count. The blueprint therefore optimizes:

- **Coverage:** every class A/B domain gets a module; every module covers ≥2 topics or
  competencies (feeds §11 coverage and §4.3 minimum evidence).
- **Measurement quality:** each class A domain receives enough *scored* items to cross
  the ≥5-response minimum with slack for DK/unanswered.
- **Reasonable fatigue:** hard items and constructed responses are front-loaded within
  each module; the 20-minute buffer sits at system discretion, not as extra items.
- **Time validity:** budgets are derived from item-level `estimatedMinutes` sums (each
  item authored with an expected time, §7) + transition overhead — never the reverse.
- **Domain discrimination:** DSA, Aptitude, and SQL get the largest budgets because
  they show the widest ability spread in placement settings and carry the most
  downstream planning weight; short-knowledge domains (OS, CN, OOP, DBMS) are dense but
  narrow, so they get compact, high-signal modules.

Difficulty mix for the baseline (whole exam): **~37% easy / 40% medium / 23% hard** (derived
from module-level declared mixes below: 31/34/19 of 84 items) — enough hard items to
discriminate strong learners, enough easy items to anchor weak learners (§9 stage 1
anchors), no item bank that is all one difficulty.

### 6.2 Module table (180-minute hard limit)

| # | Module | Domain | Time budget | Items | Primary formats | Difficulty mix | Scoring signal | Min evidence to assess | Max contribution to domain estimate |
|---|---|---|---|---|---|---|---|---|---|
| M1 | Aptitude & Quant Reasoning | aptitude | **25 min** | 20 | Timed MCQ, data-interpretation sets | 40/40/20 | Weighted correctness + speed index (secondary, §15) | ≥5 scored, ≥2 bands, ≥2 sub-domains (quant vs reasoning) | ≤25% per item; speed never converts a correct answer to incorrect |
| M2 | DSA Reasoning & Coding | dsa | **35 min** | 9 | Pattern/constraint MCQ, code tracing, complexity reasoning, short debugging, 1 constrained coding item | 30/45/25 | Weighted correctness; constructed items double-weighted but item-capped (§9) | ≥5 scored, ≥2 bands, ≥2 patterns | ≤25% per item; single item may never exceed 30% of module signal |
| M3 | Python Code Reasoning | python | **15 min** | 8 | Output prediction, debug-the-bug, fill-blank, short written code | 35/45/20 | Weighted correctness | ≥5 scored, ≥2 bands, ≥2 competency areas | ≤25% per item; module yields *provisional scoped* level only (§4) |
| M4 | SQL Query Reasoning | sql | **15 min** | 7 | Query-selection MCQ, "what does it return," short written query, scenario (given schema) | 35/45/20 | Weighted correctness + authored-key match (normalized string compare, future engine) | ≥5 scored, ≥2 bands, ≥2 skill areas (filter/join vs aggregation/window) | ≤25% per item |
| M5 | DBMS Concepts & Scenarios | dbms | **12 min** | 8 | MCQ, multiple-response, scenario | 40/40/20 | Weighted correctness | ≥5 scored, ≥2 bands, ≥2 topics | ≤25% per item |
| M6 | OOP Code Reasoning | oop | **12 min** | 7 | Code-trace MCQ, principle identification, short design answer | 40/40/20 | Weighted correctness | ≥5 scored, ≥2 bands, ≥2 topics | ≤25% per item |
| M7 | OS Concepts & Scenarios | os | **10 min** | 6 | MCQ, scenario | 40/40/20 | Weighted correctness | ≥5 scored, ≥2 bands, ≥2 topics | ≤25% per item |
| M8 | CN Concepts & Scenarios | cn | **10 min** | 6 | MCQ, scenario | 40/40/20 | Weighted correctness | ≥5 scored, ≥2 bands, ≥2 topics | ≤25% per item |
| M9 | Communication | communication | **16 min** | 8 (incl. 1 written response) | Grammar/vocab MCQ, comprehension passage items, 1 short structured written response | 40/40/20 | Objective correctness + analytic rubric for written item | ≥5 scored, ≥2 bands, ≥2 constructs (grammar/comprehension vs written organization) | ≤25% per item; written rubric item ≤20%; **construct is written-only** (§21) |
| M10 | Interview Knowledge | interviews | **10 min** | 5 | Technical-knowledge MCQ, approach-structured written answer, behavioral-scenario judgment | 40/40/20 | Weighted correctness + rubric for structured answer | ≥4 scored, ≥2 bands, ≥2 construct areas | ≤25% per item; **construct is knowledge-only** (§22) |
| — | System buffer (instructions, transitions, end review) | all | **20 min** | — | — | — | — | — | — |
| — | **TOTAL** | | **180 min** | **84 items** | | **~37/40/23 overall** | | | |

Notes:

- **Projects:** no module, no items, no time (§20).
- Module order is fixed and interleaved by fatigue profile (timed-heavy M1 first while
  fresh, dense-knowledge modules mid-sitting, written constructs late where fatigue
  hurts least). Order is part of `AssessmentDefinition`, not hard-coded in logic.
- Item counts are *targets*; the authored bank must satisfy both the time sum and the
  per-module minimum-evidence rule (§30 QA enforces both).
- "Max contribution to domain estimate" is an item-influence cap enforced by the
  scorer (§9): no single item may carry more than the stated share of its domain's
  ability estimate, so one lucky guess or one brutal item cannot define a domain.
- **Global difficulty mix** is derived from module-level declared mixes (authoritative):
  M1 (20: 40/40/20), M2 (9: 30/45/25), M3 (8: 35/45/20), M4 (7: 35/45/20), M5 (8: 40/40/20),
  M6 (7: 40/40/20), M7 (6: 40/40/20), M8 (6: 40/40/20), M9 (8: 40/40/20), M10 (5: 40/40/20)
  → 31 easy / 34 medium / 19 hard = **36.9% / 40.5% / 22.6%** → rounded **~37/40/23**.

### 6.3 Adaptive behavior inside the baseline

The baseline uses **multistage routing within each module** (§9): a short anchor set
(medium difficulty) determines whether the module continues with easier or harder
branches. This preserves time validity (no wasted hard items for a beginner, no wasted
easy items for a strong learner) while keeping the 180-minute envelope fixed.

---

## 7. Item Model

Assessment items are authored objects, distinct from `PracticeQuestion`. They may
share infrastructure (authoring helpers like `src/data/practice/bank.ts` demonstrate
the deterministic-derivation pattern this repo prefers) but are separate records with
separate exposure (§13).

### 7.1 Required authoring metadata (V1)

Every assessment item must support at least:

| Field | Type / values | Purpose |
|---|---|---|
| `id` | `asm-<domain>-###` (globally unique) | Identity |
| `domainId` | `DomainId` (11 values, existing type) | Domain targeting |
| `topicId` | existing roadmap `Topic.id` **or** assessment-internal topic id | Topic signal + skills bridge (§24) |
| `subtopicId?` | string | Finer granularity for error analysis |
| `competency` | stable slug (e.g. `sql-join`, `dsa-pattern-selection`, `quant-speed`) | Error taxonomy + parallel groups |
| `difficulty` | `1 \| 2 \| 3 \| 4` (§8) | Difficulty-aware scoring + routing |
| `estimatedMinutes` | number | Time budget math (§6) + time signal (§15) |
| `questionType` | `AssessmentQuestionType` (below) | Format handling |
| `assessmentRole` | `'anchor' \| 'branch' \| 'confirm'` | Multistage routing (§9) |
| `eligibleFor` | `('baseline' \| 'weekly' \| 'released_practice')[]` | Bank separation (§10) |
| `exposurePolicy` | `{ maxEstimationUses: number; releaseToPractice: boolean }` | Exposure control (§13) |
| `scoring` | `{ kind: 'objective' \| 'normalized_match' \| 'rubric'; key?; rubricId?; weight; acceptableForms?: string[] }` | Grading method |
| `prerequisites?` | item ids or competency slugs | Impossible-prerequisite QA (§30) |
| `parallelGroup?` | slug | Equivalent alternatives for re-tests (§13, §19) |
| `prompt` / `options?` / `key?` | content | The item itself |
| `explanation` | string | Post-assessment feedback (never shown during baseline) |
| `errorCategories` | controlled taxonomy codes (§12) + which distractor maps to which | Failure diagnosis |
| `origin` | `'assessment'` (always, for this bank) | Provenance, forever (§14) |

### 7.2 `AssessmentQuestionType`

A separate union in the assessment module — **extends** the vocabulary already used by
`QuestionType` (`src/types/index.ts`) rather than modifying it:

```
'mcq' | 'multiple_response' | 'short_answer' | 'normalized_match'
| 'code_trace' | 'debug_item' | 'coding_constrained'
| 'sql_query' | 'scenario' | 'structured_written' | 'rubric_written'
```

Rationale: code/SQL/Rubric items need grading semantics that `QuestionType` does not
express, and modifying the existing union is an unnecessary cross-system change
(§36 non-goal: do not modify existing practice types).

### 7.4 SQL normalized-match semantics (V1)

For `sql_query` items with `scoring.kind: 'normalized_match'`:

- An item **may define multiple authored acceptable normalized answer forms** via
  `scoring.acceptableForms: string[]` where semantically equivalent SQL syntax exists
  (e.g., `JOIN` vs `INNER JOIN`, `!=` vs `<>`, column aliases, whitespace normalization).
- The scorer normalizes both the learner's response and each authored acceptable form
  (lowercase, whitespace collapse, alias stripping, canonical keyword ordering) and
  checks for exact string equality against the set.
- **One literal SQL string is not required** when multiple equivalent forms are
  intentionally accepted — the `acceptableForms` array encodes the intentional
  equivalences.
- This is **not execution**; it is syntactic/semantic normalization against a finite
  authored set. No live engine is invoked.

### 7.3 Separation from existing question models

| Model | Consumer | Contains assessment items? |
|---|---|---|
| `PracticeQuestion` (415 questions) | `practiceEngine`, PracticeRunnerModal | **No** |
| `DSAProblem` (150) | `dsaEngine`, DSA view | **No** (but §14 defines a one-way release flow *from* the assessment bank) |
| `PreparationTopic` content | `preparationEngine` | **No** |
| `AssessmentItem` (new) | future `assessmentEngine` only | Yes |

---

## 8. Difficulty Model

### 8.1 Authoring scale

Items are authored at difficulty **1–4**:

| Level | Label | Meaning |
|---|---|---|
| 1 | Foundational | Single-fact / single-step recognition; near-ceiling for prepared learners |
| 2 | Basic application | One concept applied in a standard setting |
| 3 | Applied / multi-step | Two or more concepts, or a non-standard setting |
| 4 | Advanced | Chained reasoning, unusual framing, or trade-off judgment |

Mapping to bands used by the blueprint (§6): `1–2 → easy pool`, `3 → medium pool`,
`4 → hard pool` (per-module mixes stated in the 40/45/20 sense of item *bands*).

### 8.2 Why authored difficulty (and how it stays honest)

- **No empirical calibration exists.** PlacementOS has one user. Item Response Theory
  parameters cannot be estimated from n=1. V1 therefore uses **authored difficulty +
  authored weights**, exactly as `QuestionSeed`-based practice authoring uses
  deterministic derived distractors today.
- **Guard against author drift:** difficulty is *revisited* during Content QA (§30 —
  balanced difficulty is an explicit check) and later revised from response history
  (§9.4 future path). Authored difficulty is a hypothesis; the scorer treats it as a
  weight, never as truth about the learner.

### 8.3 Difficulty-aware scoring vs difficulty-aware routing

- **Routing** (which items you see) uses difficulty to keep the test informative at
  the learner's level (§9 stage 2).
- **Scoring** (what your responses mean) credits a hard item more than an easy item
  (§9.2), so 60% on hard items must not equal 60% on easy items.

---

## 9. Scoring Model

### 9.1 Why simple percentage-correct is insufficient

A naive `correct / total × 100` fails in at least seven documented ways:

1. **Difficulty blindness.** 80% correct on difficulty-1 items is not 80% correct on
   difficulty-4 items; a percentage treats them identically.
2. **Guess floor.** 4-option MCQ has a 25% chance floor — raw percentage systematically
   overstates low ability and cannot distinguish knowledge from luck.
3. **Small-n noise.** A domain with 5 items has ~±20-point swings; a percentage has no
   way to say "this number is not trustworthy" (confidence must be separate, §11).
4. **DK vs wrong conflation.** "I don't know" and "I thought B was right but it was C"
   are diagnostically different (§14 of the brief / §13 below) yet a percentage merges
   them.
5. **Coverage blindness.** A percentage over a sampled subset says nothing about
   unsampled topics — it invites over-generalization beyond the construct (§4).
6. **Speed conflation.** Slow-correct and fast-correct are both "correct"; the learner
   in an OA setting needs speed tracked separately (§15).
7. **Non-comparable forms.** Baseline, Sunday test, and reassessment use different
   item sets (§13); raw percentages across forms are not on the same scale.

### 9.2 V1: deterministic multistage estimation (authored metadata)

All of the following are pure functions over stored responses.

**Step 1 — Item scoring.**

| Response | Objective credit | Note |
|---|---|---|
| correct | 1.0 | |
| incorrect | 0.0 | |
| `dont_know` | 0.0 | flagged `dk = true` — same credit as wrong, **different diagnosis** (§12, §14) |
| unanswered (time) | 0.0 | flagged `unanswered = true` — a timing signal, not a knowledge signal |

**Step 2 — Chance correction (objective MCQ only).**
Effective credit for MCQ types is reduced toward the guess floor:
`c' = max(0, (c − 1/k) / (1 − 1/k))` where `k` = number of options. Correct answers
still credit fully *after* correction is applied to the aggregate, not per-item — the
practical effect is that the aggregate is measured above chance, so random clicking
converges to ~0, not ~25%.

**Step 3 — Difficulty weighting.**
Item weights: `w = {1: 0.8, 2: 1.0, 3: 1.3, 4: 1.7}` (authored constants).
Constructed-response items (`coding_constrained`, `sql_query`, `rubric_written`,
`structured_written`) receive their authored `scoring.weight` (default 2× an objective
item of same difficulty) — but the **item-influence cap** applies: after weighting, no
item may exceed its module's "max contribution" share (§6.2) of the domain's weighted
total. Excess weight is redistributed proportionally among other items in the module.

**Step 4 — Domain ability estimate (0–100 internal measure).**

```
domainAbility = 100 × Σ(wᵢ × c'ᵢ × capFactorᵢ) / Σ(wᵢ)   over scored items of that domain
```

then bounded to [0, 100]. This is an *internal measure*, not a percentage — it is
difficulty-weighted, chance-corrected, and influence-capped.

**Step 5 — Level assignment (§10) and confidence (§11)** are computed *separately*
from `domainAbility`.

### 9.3 Signals recorded but never mixed into correctness

- **Speed index** (per timed domain): `Σ estimatedMinutes / Σ actualMinutes`, reported
  as a secondary competency (§15). Never alters correctness.
- **Confidence response** (guessing / somewhat / confident): supporting evidence for
  error taxonomy and weakness strength (§14), never alters correctness.
- **DK rate:** feeds coverage/consistency in confidence (§11).

### 9.4 Future path: empirical recalibration (explicitly out of V1 scope)

| Phase | Trigger | What changes |
|---|---|---|
| V1 (this spec) | — | Authored difficulty, authored weights, deterministic multistage scoring |
| V2 (future) | Sufficient accumulated responses (indicative: ≥200 responses/item across ≥50 distinct attempts — **DECIDED 6**) | Estimate real item parameters (Rasch/2PL-style or simpler logistic calibration); replace authored weights with calibrated ones; keep the same `domainAbility → level → confidence` pipeline |
| V3 (future) | Multi-form experience | Parallel-form equating (§13) replaces the assumption that authored parallel groups are equivalent |

V1 and V2 must share interfaces so calibration is a **weight replacement**, not a
rewrite. This distinction (deterministic estimation vs future psychometric
calibration) is a hard boundary of this document: **no calibration math ships in V1.**

---

## 10. Level Model

### 10.1 Scale

| Level | Label | Meaning |
|---|---|---|
| **0** | No demonstrated capability | No valid PlacementOS evidence has established this ability — **either unassessed, insufficient evidence, or assessed with zero demonstrated performance** (P3) |
| **1** | Beginner | Minimal demonstrated capability; needs foundational work |
| **2** | Basic | Can handle standard items with effort; inconsistent |
| **3** | Intermediate | Reliable on standard application; some multi-step work |
| **4** | Job Ready | Consistent performance at the target-difficulty band |
| **5** | Strong | Consistently handles advanced items with margin |

Level 0 means: **"No demonstrated capability OR insufficient valid evidence."** Therefore:
- `unassessed` → Level 0
- `partially_assessed` with insufficient evidence (<5 scored responses, <2 bands, <2 competencies) → Level 0
- `assessed` with sufficient evidence but `domainAbility = 0` → Level 0 (allowed; demonstrates zero capability on the measured construct)
- Level 1 begins **only once minimum evidence exists AND demonstrated ability > 0**

Levels apply to **domains** in this subsystem. (Topic-level readiness in
`skillsEngine` keeps its own existing 0–5 rung semantics — §24 defines precedence, no
merging.)

### 10.2 The pipeline (raw → level), without hard-coded final thresholds yet

```
raw responses
  → item credit + DK/unanswered flags            (§9.2 step 1)
  → chance correction + difficulty weighting     (§9.2 steps 2–3)
  → domainAbility (0–100 internal measure)       (§9.2 step 4)
  → [provisional] band mapping domainAbility → level 0–5   (§10.3)
  → confidence (low/medium/high) + status        (§11, §4.3)
  → displayed level = level (0 if status = unassessed OR insufficient evidence OR domainAbility = 0)
```

### 10.3 Why thresholds are not final yet

The brief forbids hard-coding arbitrary percentage thresholds. Therefore:

- The **mechanism** is specified: monotone band function over `domainAbility`, held as
  a single named constants table in one place (future `assessmentScoring` module), with
  `level = f(domainAbility)` monotone non-decreasing.
- The **provisional band values** below exist only to make the pipeline concrete and
  testable later; they are explicitly labeled *provisional pending first-cohort data*:

  | Band | Provisional domainAbility range | Level |
  |---|---|---|
  | B0 | 0 | 0 |
  | B1 | 1–19 | 1 |
  | B2 | 20–39 | 2 |
  | B3 | 40–64 | 3 |
  | B4 | 65–84 | 4 |
  | B5 | 85–100 | 5 |

  **Rule:** Level 0 is assigned when `domainAbility = 0` **or** when `status = unassessed` **or** when `status = partially_assessed` with insufficient evidence (fewer than 5 scored responses, fewer than 2 difficulty bands, or fewer than 2 competencies covered). A domain with `status = assessed` and `domainAbility = 0` receives Level 0 — it is an honest measurement of zero demonstrated capability, not an error.

- **Confidence gating:** a low-confidence estimate may never *display* Level 4 or 5;
  it renders as at most "Level ≤3 (low confidence)". High-confidence bands are the
  only route to a Job Ready / Strong claim. Level 0 is never confidence-gated — it
  reflects the absence of demonstrated capability or evidence. (Exact gating constant:
  DECIDED 4.)

### 10.4 Provisional assignment vs long-term confirmation

| | Provisional (from first diagnostic) | Confirmed |
|---|---|---|
| Source | Baseline attempt (or first reassessment of a domain) | ≥2 subsequent assessments with consistent band placement (±1 level) **and** confidence ≥ medium |
| Label in data | `provisional: true` | `provisional: false` |
| May drive plan? | Yes — but planner treats low-confidence weaknesses as *soft* signals (§26) | Yes |
| May claim "Job Ready"? | Only with confidence ≥ medium (§10.3 gating) | Yes |
| Decay | Staleness (§11) can demote confidence over time; confirmation itself does not expire, but stale confirmed levels show a staleness flag | |

### 10.5 Why a single test cannot lock a level

- Confidence and level are separate (§11): one sitting yields bounded confidence when
  coverage or n is thin.
- Regression rules require repeated contradiction (§17).
- Confirmation requires ≥2 consistent follow-ups (§10.4).
- Full reassessment produces a *new snapshot*, never an overwrite of history (§19).

---

## 11. Confidence Model

### 11.1 Per-domain result record

Every assessment run produces, per domain:

```ts
{
  domainId,
  abilityScore: 0-100,        // §9.2 step 4
  level: 0-5,                 // §10 (0 when status = unassessed)
  confidence: 'none' | 'low' | 'medium' | 'high',
  status: 'assessed' | 'partially_assessed' | 'unassessed',
  coverage: {                 // what the sample actually touched
    topicsCovered: number, topicsTotal: number,
    competenciesCovered: string[], difficultyBands: number[]
  },
  assessmentDate,             // ISO timestamp of the attempt
  provisional: boolean,       // §10.4
  constructScope?: string     // e.g. 'written_only' for communication (§4)
}
```

### 11.2 Confidence inputs (deterministic)

Confidence is a function of six factors, each normalized to [0,1]:

| Factor | Definition | Why it matters |
|---|---|---|
| **Observation count** | scored responses relative to the module's target item count | small n → wide error bars (§9.1-3) |
| **Coverage** | topics/competencies touched relative to the domain's assessable set | unsampled topics → narrower claim (§9.1-5) |
| **Difficulty range** | distinct difficulty bands sampled (≥2 required, §4.3) | all-easy samples cannot place the top of the scale |
| **Consistency** | agreement among related items (same-competency items disagreeing) | contradiction inflates noise |
| **Response quality** | DK rate, unanswered rate, suspicious patterns (identical option runs) | junk responses are not evidence |
| **Format reliability** | authored reliability class of the mix (MCQ-only lower; constructed items present higher; rubric items require ≥1 rubric-scored response for high) | format ceiling on trust |

`confidence = band(0.35·observations + 0.25·coverage + 0.15·difficultyRange +
0.15·consistency + 0.05·responseQuality + 0.05·formatReliability)` → `low` (0–0.49),
`medium` (0.50–0.79), `high` (0.80–1.0). *(Weight vector is a provisional constants
table — DECIDED 4.)*

Initial state: **`none`** (distinct from `low` — no data at all).

### 11.3 Time decay of confidence

Confidence is freshness-aware, mirroring the existing `SkillFreshnessState` philosophy
without reusing that type:

| Age since last assessment of the domain | Confidence effect |
|---|---|
| < 14 days | unchanged |
| 14–42 days | demote one step (`high→medium`, `medium→low`; `low` stays) |
| > 42 days | demote to `low` (never to `none` — the evidence exists, it is just stale) |

Decay affects *confidence only*, never level — staleness is a reason to retest (§19,
§16), not a reason to demote demonstrated capability. (Exact decay windows: DECIDED 4.)

### 11.4 Guarantees

- A single good test cannot permanently lock a level (§10.5): confirmation needs
  repetition; confidence decays.
- A single bad test cannot destroy a level (§17).
- `confidence` never merges into `level` or `abilityScore` — they are always separate
  fields (P2).

---

## 12. Error Taxonomy

### 12.1 General taxonomy (top level, applies to every domain)

| Code | Name | Definition | Typical signal |
|---|---|---|---|
| `E-CONCEPT` | Concept gap | The underlying fact/rule is unknown or wrong | DK, low-confidence wrong, first-attempt wrong across related items |
| `E-APPLY` | Application / reasoning error | Concept known, applied wrongly in this setting | Confident wrong on scenario items |
| `E-INTERPRET` | Interpretation error | Misread the question, schema, diagram, or data | Time overrun + wrong on otherwise-known competency |
| `E-EXEC` | Execution / carelessness | Known procedure botched (arithmetic, syntax slip, off-by-one) | Confident wrong + fast response + rubric shows minor slip |
| `E-PATTERN` | Recognition failure | Failed to recognize the situation/type (which pattern, which join, which construct) | Wrong on `anchor` recognition items specifically |
| `E-TERM` | Terminology | Knows the idea, not the word (or vice versa) | Correct on scenario, wrong on terminology MCQ |
| `E-SPEED` | Time pressure | Ran out of time for the domain/module | `unanswered` + low time index (§15) |
| `E-GUESS` | Unsupported guess | Low signal either way | `dk`-adjacent or guessing-confidence wrong |

Domain specializations (assignable as `errorCategories` on items, §7.1):

| Domain | Specializations (extend, don't replace, the general codes) |
|---|---|
| **DSA** | concept recognition · pattern selection · algorithm design · implementation · complexity reasoning |
| **Python** | syntax · language knowledge · control flow · data structures · debugging · logic |
| **SQL** | SELECT/filter · JOIN · GROUP BY · aggregation · subquery · window functions · NULL semantics |
| **Aptitude** | concept · arithmetic · interpretation · speed · careless error |
| **Core CS (DBMS/OS/CN)** | concept gap · scenario reasoning · terminology · application |
| **OOP** | principle identification · code trace · design trade-off · vocabulary |
| **Communication** | grammar · comprehension · vocabulary · written organization |
| **Interviews** | technical knowledge gap · structure gap (STAR/approach) · scenario judgment |

### 12.2 Derivation rules

1. Primary derivation: the item's authored `errorCategories` mapping for the selected
   distractor/response (objective items).
2. Secondary derivation: cross-item patterns within a competency (e.g., 3 related items
   wrong + DK-heavy → `E-CONCEPT` rather than `E-EXEC`).
3. Confidence responses (§14) modulate *priority*, not classification:
   wrong + confident → treat as likely **misconception** (`E-CONCEPT`/`E-APPLY`,
   elevated weakness strength); wrong + guessing → knowledge gap (ordinary strength);
   DK → gap, explicitly *not* a mistake.
4. Unattributed errors are recorded as `E-UNSPECIFIED` rather than guessed — an
   unclassified error is honest; a fabricated one is not (P1).

The taxonomy is consumed by: weekly selection (§16), weakness signals (§31), and
planner recommendations ("revisit window functions" rather "review SQL").

---

## 13. Exposure Model

### 13.1 Bank separation (P10)

| Bank | Contents | Consumers | Exposure rules |
|---|---|---|---|
| **Curriculum items** | DSA-150 problems, roadmap tasks, preparation content | learning flows | Never used for ability estimation |
| **Practice items** | 415 practice questions (34 sessions) | `practiceEngine` | Practice attempts are ordinary evidence; never counted as assessment responses |
| **Diagnostic items** | Baseline pool (`eligibleFor: 'baseline'`) | Baseline + reassessment | One estimation use per item, then discounted/excluded (§13.3) |
| **Weekly assessment items** | Sunday pool (`eligibleFor: 'weekly'`) | Sunday mini test (§15) | Tracked identically; parallel groups preferred for repeats |

An item may be in *both* pools only if `eligibleFor` lists both — and exposure is
tracked **per pool** (an item seen in baseline is still eligible for weekly use only if
its policy allows, with estimation discount applied).

### 13.2 Exposure record (per learner, per item)

`AssessmentItemExposure` fields: `itemId`, `exposureCount`, `lastSeenAt`,
`lastAttemptId`, `lastResult`, `previousAssessmentUsage`
(`('baseline'|'weekly'|'reassessment')[]`), `estimationUses` (count of uses that fed
an ability estimate), `eligibleForFutureEstimation: boolean`, `releasedToPractice:
boolean`.

### 13.3 Estimation discount / exclusion rules (deterministic)

| Situation | Effect on future estimation |
|---|---|
| 1st use | Full weight |
| 2nd use of same item, same domain, within 60 days | Weight ×0.5 |
| ≥3rd use, or any use after 60-day parallel-group-free repeat | Excluded from estimation (still recordable as a response for error tracking) |
| Item in a `parallelGroup` | Group members are equivalent for estimation; group usage count governs the rules above |
| Item `releasedToPractice` (§14) and later solved in practice | Practice result is normal evidence; the *assessment* uses remain counted — practice does not reset exposure |

### 13.4 Principles enforced

- **Repeated-question memory must not become the primary signal** (brief §10): selection
  (§16) prefers `eligibleForFutureEstimation` items with zero/low exposure, and the
  scorer applies §13.3 regardless of what selection did.
- **Novel-item preference:** among equal-priority candidates, tie-break toward lowest
  `exposureCount`, then stable item-id order (determinism, P5).
- **Historical integrity:** exposure records are append-only facts; they are never
  rewritten to "clean" a profile.

---

## 14. DSA Assessment Pool

### 14.1 Separation from the canonical 150

- **DSA-150 remains the canonical learning curriculum.** Not expanded, not modified,
  not reordered by this subsystem.
- The **DSA ASSESSMENT BANK** is a separate conceptual pool of assessment-specific
  items (`domainId: 'dsa'`, `origin: 'assessment'`, `eligibleFor` per §7.1) — code
  tracing, pattern selection, complexity, debugging, constrained coding. It is a
  *new dataset*, authored in a future phase (§35 Phase B), living in new files (§32).

### 14.2 Release flow (assessment item → practice resource)

```
BASELINE DSA ASSESSMENT ITEM
        ↓  used for diagnosis (assessment context, exposure tracked)
assessment result recorded (§31 AssessmentResponse + DomainAssessmentResult)
        ↓  item flagged releasedToPractice (per its exposurePolicy)
item becomes available/unlocked in the DSA page as a practice resource
        ↓  learner attempts it in practice mode
ordinary DSA attempt evidence accrues (existing pipeline, unchanged)
```

**Invariants:**

1. **Origin metadata is retained forever** (`origin: 'assessment'`), including after
   release — a released item can always be distinguished from curriculum items.
2. Released items **do not enter DSA-150** and do not change the 150/17/24 invariants.
3. Released items participate in future ability estimation **only** per §13.3
   (exposed items excluded/heavily discounted; future tests prefer novel/parallel items
   measuring the same capability).

### 14.3 Diagnostic evidence vs DSA problem mastery (the critical distinction)

| | DSA diagnostic evidence | DSA problem mastery (existing) |
|---|---|---|
| Source | Assessment responses on assessment items | `DSAAttempt` + Leitner transitions + `calculatePatternMastery` |
| Stored in | `AssessmentResponse` → `DomainAssessmentResult` (domain level only) | `DSAProgress`, `dsaAttempts`, pattern mastery results |
| Granularity | **Domain-level DSA ability only** | Problem-level box state → pattern mastery |
| Can it set pattern mastery? | **No — never** | Yes (existing, unchanged) |
| Can it set Leitner box? | **No — never** | Yes (existing, unchanged) |
| Strength | Strong *initial cross-sectional* estimate | **Stronger long-term evidence source** |

**Hard rule (brief §11): one diagnostic problem can never immediately establish DSA
pattern mastery.** The assessment scorer has no write path into `DSAProgress`,
`dsaAttempts`, Leitner boxes, or `calculatePatternMastery`. The only DSA write path
from an assessment-origin item is the *practice* attempt the learner later makes after
release — which is ordinary demonstrated work (§24 precedence).

### 14.4 Rubric-scored response rules (V1)

- **Learner self-evaluation NEVER independently awards correctness/ability credit.**
  Self-reported confidence (`confident` / `somewhat` / `guessing`) supports diagnosis
  only (§9.3, §14) — it never converts an incorrect response to correct or alters
  `scoredCredit`.
- **Actual scoring of structured written/rubric items** (`rubric_written`,
  `structured_written`, `sql_query` with `scoring.kind: 'rubric'`) **must come from
  deterministic authored rubric criteria** attached to the item (`scoring.rubricId`).
- Rubric criteria must be **sufficiently explicit to reproduce the same score from the
  same response** — i.e., a pure function of the response text and the rubric.
- Ambiguous or incomplete responses produce **partial or zero credit according to
  predefined rubric rules**, never ad-hoc judgment.
- The system remains **local-first and deterministic** — no LLM grading, no external
  APIs, no human-in-the-loop for V1.

---

## 15. Sunday Mini Test

**Canonical day:** Sunday.
**Maximum duration:** **90 minutes**, one continuous assessment after starting,
auto-submit at limit (same hard-limit mechanics as baseline, §5.1).

### 15.1 Default composition

| Share | Intent | Selection basis |
|---|---|---|
| **60%** | Weakness-targeted | Open `WeaknessSignal`s: domain → topic → competency → recurring error type (§12, §16) |
| **20%** | Recent learning | Items competencies touched by the last 7 days of evidence (tasks/practice/DSA/prep) needing retrieval |
| **20%** | Retention / mixed coverage | Strong/medium domains sampled for decay detection; broad domain floor |

*(Percentage targets are composition goals for item slots; rounding is deterministic —
e.g., largest-remainder allocation to integer item counts.)*

### 15.2 Composition constraints

| Constraint | Rule (provisional constants, DECIDED 4) |
|---|---|
| **Domain coverage floor** | Every domain with status ≠ `unassessed` gets ≥1 item; domains with open weakness signals get ≥2 |
| **Concentration cap** | ≤40% of items from a single domain; ≤35% from a single topic; ≤50% from a single competency |
| **Repeated-item suppression** | §13.3 applies in full; exposed items are excluded from candidate set unless pool exhaustion forces a documented exception |
| **Difficulty balancing** | Anchored to the learner's current per-domain level: target mix ≈ (level-appropriate ± 1 band), plus ≥1 harder-than-level item in weak domains to test ceiling |
| **Recent exposure rules** | Any item seen in the last 14 days is ineligible (even if not estimation-exhausted) |
| **Time budget** | Sum of `estimatedMinutes` ≤ 78 minutes (90 − 12 min buffer) |
| **Domain breadth** | ≥6 distinct domains per Sunday test when candidate supply allows |

### 15.3 Targeting ladder

```
domain weakness → topic weakness → concept/pattern weakness → recurring error type
```

Selection descends the ladder: pick the *most specific* signal that has enough
eligible items; fall back one level when the pool is empty. Strong domains still
receive retention items so success is not punished (§15.1 20% retention slice).

### 15.4 Timing as evidence (shared with §15 of the brief)

Recorded per item and per attempt: `estimatedMinutes`, `actualMinutes`, completion,
`timeRemaining` at submit. Rules:

- **Time is a secondary signal.** A correct answer never becomes wrong because it was
  slow.
- **Speed readiness** is defined as a **separate competency** for time-constrained
  domains (Aptitude primarily; optionally DSA-in-OA contexts): reported as a speed
  index alongside the domain profile, never inside `abilityScore`.
- Unanswered items due to time are flagged `unanswered` (§9.1) and attributed to
  `E-SPEED`, distinguishing "didn't know" from "didn't get there."

---

## 16. Adaptive Selection Algorithm (Sunday)

Deterministic candidate selection — a pure function of
(current profile, weakness signals, recent evidence, exposure records, definition).

### 16.1 Priority inputs (in order)

1. **Unresolved remediation** — open weakness signals whose last remediation attempt
   did not clear.
2. **High-confidence weakness** — weak domain with confidence ≥ medium (a *trustworthy*
   weakness deserves targeting first).
3. **Repeated weakness** — same competency wrong across ≥2 assessments/attempts.
4. **Recent learning needing retrieval** — competency practiced within 7 days (retrieval
   before decay).
5. **Retention coverage** — strong/medium domains due for decay sampling (age > 14 days
   since last assessment of that domain).
6. **Stale / decaying evidence** — profile confidence demoted by §11.3 staleness.
7. **Assessment balance** — fairness across domains after 1–6 are satisfied.

### 16.2 Candidate scoring (deterministic)

Each eligible item gets:

```
priorityScore = 0.30·P1 + 0.22·P2 + 0.16·P3 + 0.12·P4 + 0.08·P5 + 0.06·P6 + 0.06·P7
```

where each `Pn` ∈ [0,1] is the normalized satisfaction of that priority for the item's
domain/topic/competency, and eligibility enforces §13 exposure rules, §15.2
constraints, and pool membership first (constraints are hard filters, not weights).

Slot filling: sort by `priorityScore` desc → tie-break by lower `exposureCount` →
tie-break by item id (fully deterministic, P5). Fill 60/20/20 slots with the
composition constraints as hard post-filters; if a constraint cannot be met (pool
exhaustion), fill by next-best candidate and record a `selectionException` on the
attempt for QA visibility (§30).

### 16.3 Anti-oscillation rules (brief §18)

- **No single-result dominance:** one poor Sunday result may raise `P1/P3` for that
  competency by at most one priority step; it cannot reweight the whole test.
- **Historical evidence over recency:** `P3` uses the *history* of a competency
  (≥2 occurrences), not the last attempt alone.
- **Hysteresis:** a competency targeted in the last two Sunday tests is demoted in
  `P1` (it has had its chance) unless a *new* error category appeared for it.
- **Swing cap:** no more than 50% of items may come from competencies that were
  weakness-targeted the previous Sunday (forced rotation).
- **Determinism:** same inputs → same test, always (P5). Randomization of *order* is
  derived from a stored seed, not `Math.random()`.

---

## 17. Level Regression

Levels **may** decrease. They may **never** decrease from a single bad result alone.

### 17.1 Regression requirements (all must hold)

| # | Requirement | Rationale |
|---|---|---|
| 1 | **Sufficient evidence:** ≥3 scored responses in the new assessment for the domain, ≥2 difficulty bands | small samples can't contradict an established level |
| 2 | **Confidence precondition:** current confidence ≥ `medium` for the *existing* level (a low-confidence level may be corrected more readily) | a shaky level isn't worth defending |
| 3 | **Repeated contradiction:** the new `domainAbility` falls **below the level's lower band by ≥8 points**, AND at least one other observation in the last 45 days (assessment or strong practice signal for that domain) is also below-band | one outlier ≠ trend |
| 4 | **Minimum observation threshold:** domain has ≥2 prior assessment observations (i.e., not its first reassessment) unless the drop is catastrophic (below) | a baseline provisional level is expected to move |
| 5 | **Magnitude cap:** at most **−1 level per assessment event** | prevents 4 → 1 |
| 6 | **No offsetting evidence:** no correct/strong result for the same domain in the new attempt that contradicts the drop | mixed results are not regression |

### 17.2 Exception (documented, deliberately narrow)

A **−2 step** regression may occur only when: confidence = `high`, **two** consecutive
assessment events are below-band by ≥8, and both cross competency-level contradictions
(≥3 wrong competencies). This is the only path to a multi-step single-event drop;
**4 → 1 in one event is never permitted** under any evidence combination.

### 17.3 What regression does — and does not — touch

- Updates `DomainAssessmentResult` (level, ability, confidence, `provisional`).
- Adds a `WeaknessSignal` and may affect plan priority (§26).
- **Never** touches: `TopicSkillState` evidence, DSA Leitner state, completed tasks,
  practice history, preparation progress (§26 MUST-NOT list).

---

## 18. Missed Test Rules

### 18.1 Pending-state model

Sunday is canonical. The obligation state machine per Sunday cycle:

```
none ──(Sunday arrives, no attempt)──▶ pending
pending ──(attempt completed)──▶ none        [result stored, history intact]
pending ──(next Sunday arrives, still no attempt)──▶ pending (ROLLED FORWARD, count stays 1)
pending ──(any later Sunday)──▶ pending (count NEVER exceeds 1)
```

| Missed | Behavior |
|---|---|
| **Missed once** | Test remains `pending`. The obligation is visible and available on any day until the next Sunday. |
| **Missed twice** | The obligation **rolls to the next Sunday as a single pending test**. |
| **Missed 3+ times** | Still exactly **one** pending 90-minute obligation. Backlog never accumulates. |

### 18.2 Guarantees

- **No impossible backlog:** the system never schedules two 90-minute assessments
  together; there is no "catch-up marathon."
- **History is immutable:** past results, including missed cycles, remain as recorded
  (`missed` is a scheduling fact, not an eraser).
- **Baseline pending is separate:** if the baseline has never been run, the Sunday
  mini test does not stack on top of it — the baseline obligation is its own single
  pending item (§5), and Sunday tests remain unavailable/suppressed until baseline
  completes (**DECIDED 5** for the exact suppression rule).
- **Interaction with daily planning:** the pending Sunday test may appear as a plan
  item (§26) but never forces rescheduling of sealed days or completed evidence.

---

## 19. Full Reassessment

### 19.1 Cadence and triggers

| Trigger | Behavior |
|---|---|
| **Scheduled** | Recommended every **6–8 weeks**: the system *suggests* a Full Diagnostic at week 6; it is never auto-run (a 3-hour sitting needs explicit learner action) |
| **Explicit** | "Run Full Diagnostic Again" — always available to the learner |
| **Adaptive** | After ≥3 Sunday tests whose results disagree with the current profile (±2 levels or confidence collapse), suggest reassessment |

### 19.2 What a full reassessment does

1. **Preserves** all historical assessments, attempts, responses, exposures.
2. **Creates a new `AssessmentSnapshot`** (§31) — a dated, immutable record of the
   whole profile after the run.
3. **Updates** `DomainAssessmentResult` (ability/level/confidence/status) per §9–§11
   and §17.
4. **Never** erases normal learning evidence: task progress, DSA history, Leitner
   state, practice attempts, preparation progress, manual overrides, project evidence —
   all untouched.
5. **Never** resets DSA practice history (§14.3, §27).

### 19.3 Relationship to baseline

The baseline is the *first* snapshot, not a permanent truth. A full reassessment is the
same instrument, same blueprint family, later in time — with exposure rules (§13)
ensuring it measures with fresh/parallel items rather than memory.

---

## 20. Project Exclusion

**Projects are excluded from the baseline diagnostic and from all automated level
assignment in this subsystem.**

| | Value |
|---|---|
| Initial state | `level = 0`, `status = 'unassessed'`, `confidence = 'none'` |
| Baseline items | **None** (no module, no time, §6.2) |
| What may establish a level | Implementation, debugging, architecture, project defense, testing, deployment, explanation — i.e., Project Lab evidence and real project work (§24 precedence) |
| What is forbidden | Project MCQs of any kind that would assign a project capability level; "proxy" items standing in for project skill; inferring project level from DSA/practice scores |

The assessment layer may **remind** the learner that Projects is unassessed and route
them to Project Lab. It may never *fill in* the level.

---

## 21. Communication Assessment

### 21.1 What the baseline measures (class B, §4)

Grammar · vocabulary · reading comprehension · written organization and clarity.

### 21.2 What it must never claim

**A written score is not speaking ability.** The `DomainAssessmentResult` for
`communication` carries `constructScope: 'written_only'`, and any derived display copy
(future) must scope the claim: *"Level N — written/verbal knowledge (provisional)"*.

### 21.3 Evidence ladder toward a full construct

| Stage | Evidence | Effect |
|---|---|---|
| Baseline | Written constructs (§21.1) | Provisional scoped level |
| Later (existing) | Practice `communication` sessions, interview/behavioral practice attempts | Adds written-application evidence |
| Later (future) | Interview answers, verbal communication, mock-interview performance | Elevates toward full construct |
| Later (optional) | Structured speaking assessment *if available* | May lift `constructScope` beyond written |

Only when practical evidence spans spoken constructs may `constructScope` widen; the
widen event is recorded on the result (audit trail), never silently.

---

## 22. Interview Assessment

### 22.1 What the baseline measures (class B, §4)

Technical interview knowledge · question-type familiarity · behavioral-scenario
understanding (incl. STAR structure knowledge) · resume/self-presentation knowledge.

### 22.2 What it must never claim

**Knowledge ≠ performance.** Result carries `constructScope: 'knowledge_only'`. No
baseline-derived "interview level" may be presented as predicted interview performance.

### 22.3 Provisional → practical conversion

| Source | Evidence type | Effect on interview capability |
|---|---|---|
| Baseline M10 (§6.2) | Knowledge items | Provisional knowledge level |
| Practice `mock_interview` / `technical_interview` / `behavioral_interview` sessions | Existing practice attempts + evidence | Application evidence (existing pipeline) |
| Mock interview (future, formal) | Recorded evaluation | **First practical performance evidence** — may establish a performance-level claim |
| Project defense (existing Project Lab) | Defense session attempts | Explanation/composure evidence |
| Real interviews (company overlay outcomes) | Application status history (existing) | External signal, weakest attribution — context only |

Conversion rule: a performance claim requires ≥2 independent practical evidence
sources (e.g., mock interview + project defense). One mock never becomes the level.

---

## 23. Evidence Integration

### 23.1 Assessment evidence is its own kind

New evidence types (decided names for this specification):

```
AssessmentKind = 'diagnostic_assessment' | 'weekly_assessment' | 'full_reassessment'
```

- **Primary record:** `AssessmentAttempt` (§31) — the authoritative store of what
  happened, including all responses, timing, and selection metadata.
- **Evidence emission:** an attempt emits topic-scoped `EvidenceLog` entries **only for
  topics the attempt actually sampled**, using the existing union member
  `sourceType: 'test'` (already present in `EvidenceLog.sourceType` and currently
  unused — adopted here precisely to avoid widening a persisted union):

  ```
  EvidenceLog {
    sourceType: 'test',
    sourceId: AssessmentAttempt.id,      // traceability to the full attempt
    topicId, domainId, score,            // from that topic's sampled items
    confidence: mapped 1–5,              // §11 confidence → existing 1–5 scale
    details: "Assessment: <kind> · ability NN · level N · confidence <c>"
  }
  ```

- **Distinctness guarantee:** assessment evidence is never written as
  `daily_assignment`, `dsa_attempt`, or `practice_session` (P8). Existing writers
  (`taskStateEngine`, `PlacementContext` DSA writer, `practiceEngine`) are untouched;
  the future assessment writer adds `test` entries alongside the attempt record.

### 23.2 What assessment evidence must support

Per the brief: domain result · topic signal · strength · weakness · confidence ·
exposure · historical snapshot. Mapping:

| Requirement | Realized by |
|---|---|
| domain result | `DomainAssessmentResult` (§31) |
| topic signal | `EvidenceLog(sourceType:'test')` + `WeaknessSignal.topicId` |
| strength / weakness | `WeaknessSignal` (open/resolved) + profile strengths list derived from band placement |
| confidence | `DomainAssessmentResult.confidence` (§11) |
| exposure | `AssessmentItemExposure` (§13) |
| historical snapshot | `AssessmentSnapshot` (§19, §31) |

### 23.3 Non-interference rules

- Assessment emission never mutates `TopicSkillState` directly (§24 describes how the
  *existing* readiness system consumes — or declines to consume — it).
- Existing `EvidenceLog` validation (`validateStorageState`) already accepts any string
  `sourceType`, so `test` entries hydrate without validator changes; import validation
  remains forward-compatible (§27).

---

## 24. Skills Integration

### 24.1 The combined readiness picture

```
Domain Assessment Profile      ← ability/level/confidence/status (this spec)
      +
TopicSkillState                ← evidenceStrength/freshness (existing)
      +
DSA mastery                    ← Leitner + pattern mastery (existing)
      +
Practice evidence              ← PracticeAttempt + evidence logs (existing)
      +
Project evidence               ← Project Lab (existing)
      +
Interview evidence             ← mock interview/practice (existing)
      ↓
PlacementOS readiness          ← the learner-facing truth, sources kept distinct
```

### 24.2 Precedence table (which source wins which claim)

| Claim | Authoritative source | Assessment layer's role |
|---|---|---|
| "Topic X is ready / has strength N" | **`TopicSkillState` + existing evidence** (skillsEngine) | Inputs only (via `test` evidence logs), never an override |
| "Pattern P is mastered" | **`calculatePatternMastery`** | None — no write path (§14.3) |
| "Domain D demonstrated ability = L" | **`DomainAssessmentResult`** | Sole authority |
| "Domain D's *readiness to build*" (current working strength) | **skillsEngine `DomainReadiness`** | Weighted input where §26 permits |
| "Projects capability" | **Project evidence only** | Status display only (§20) |
| "Interview performance" | **Practical interview evidence** (§22.3) | Knowledge signal only |
| "Speaking ability" | **Spoken evidence** (§21.3) | Written signal only |
| "What should I do today?" | **adaptiveEngine** (existing weights, §26) | Candidate-priority input (planned) |
| Manual override | **`TopicManualOverride`** (user) | Assessment never writes overrides; user ratings keep precedence for topic-level strength |

### 24.3 Conflict rule

When the assessment profile and accumulated evidence disagree:

1. **Display both, label both** — assessed level (with confidence/status) and working
   readiness (with freshness) are different questions, not a contradiction to hide.
2. **Scheduling uses the more conservative of the two** (lower of assessed level vs
   readiness-implied level) so a confident-looking baseline never causes the planner to
   skip fundamentals.
3. **No silent merging:** assessment results must not be folded into
   `evidenceStrength` arithmetic in V1 (that would change existing engine semantics —
   §36 non-goal). Any future blend is its own change with its own tests.

---

## 25. DSA Integration

Five concepts, five homes, zero duplicated mastery formulas:

| Concept | Lives in | Formula owner | Read by assessment? | Written by assessment? |
|---|---|---|---|---|
| **1. Problem-level Leitner state** | `DSAProgress` (box, intervals) | `dsaEngine` (`calculateNextLeitnerBox`, `getLeitnerIntervalDays`) | No | **No** |
| **2. Problem attempt evidence** | `DSAAttempt[]`, `evidenceLogs(sourceType:'dsa_attempt')` | `PlacementContext` writer + `calculateAttemptScore` | No | **No** |
| **3. DSA pattern mastery** | pattern mastery results | `dsaEngine.calculatePatternMastery` | No | **No** |
| **4. DSA diagnostic ability** | `DomainAssessmentResult(domainId:'dsa')` | **assessment scorer (§9)** — *new* | — | Yes (this is its only home) |
| **5. Overall DSA domain level (display)** | composite view model (future) | reads #4 + #3 + skillsEngine DSA readiness, **each kept separate** | Yes | Writes only #4 |

Rules:

- **No competing mastery formulas:** the assessment scorer computes *domain ability
  only*. It contains no Leitner logic, no pattern-mastery logic, no per-problem
  mastery logic, and those modules contain no assessment logic.
- **One-way release flow** (§14.2): assessment item → practice → *existing* mastery
  pipeline. The assessment attempt itself never becomes mastery input.
- **Downstream consumers** see all three evidence layers as distinct rows in any
  future UI (a "DSA" view showing: assessed ability / pattern mastery / Leitner
  progress) — never summed into one number.

---

## 26. Planner Integration

### 26.1 Assessment MAY influence (permitted, future phases)

| Influence | Mechanism (planned) |
|---|---|
| Task priority | New candidate factor *alongside* the existing six (`Urgency/Weakness/Importance/Company/SpacedRep/Recovery`) — as a **separate assessment-aware weakness input**, with weights adjusted only in its own future change (weights must always sum to 1.0 — AGENTS.md rule) |
| Topic priority | Weakness signals (§31) feed topic ordering in views that sort by need |
| Review frequency | Open weaknesses raise review density within existing Leitner/planner constraints |
| Difficulty | Initial difficulty/starting point for practice and DSA selection (§16 ladder) |
| Sunday test selection | §16 (primary consumer) |
| Starting point | New-user plan starts at assessment-recommended topics instead of Phase-1 defaults — **routing, not rewriting** |
| Domain allocation | Within strategic allocation's existing 6-group envelope (35/15/20/10/10/10), the assessment may shift *emphasis among topics inside a group*, never group totals |

### 26.2 Assessment MUST NOT (hard prohibitions)

- Rewrite the core curriculum (phases/modules/topics/tasks/DSA-150/preparation).
- Delete or alter completed evidence of any kind.
- Reset DSA history (Leitner, attempts, mastery).
- Invent capabilities (no level for unassessed domains — §4, §20).
- Fabricate project evidence (§20).
- Bypass manual overrides (user ratings remain authoritative for topic strength).
- Force sealed days to change (day sealing stays immutable).

### 26.3 Integration posture for V1

In the baseline implementation phase (§35 Phase C–D), assessment results are consumed
**read-only** by the plan view; the adaptiveEngine's six-factor scoring remains
byte-for-byte identical until a dedicated, tested change introduces the assessment
factor. This keeps the 476-test engine suite green by construction.

---

## 27. Persistence / Migration

### 27.1 Current persistence facts (verified at `4b5e039`)

- Single localStorage key `placementos_v1_state`, schema `'1.0.0'`.
- `AppStorageState` (base) + `AppExtendedStorageState` (optional `customTaskDefinitions`,
  `dsaAttempts`, `evidenceLogs`).
- `loadState()` merges stored values over defaults; partial/unknown fields tolerated by
  `validateStorageState` (permissive).
- **`validateImportState()` requires an exact `schemaVersion === '1.0.0'`** — backups
  with any other version are rejected (strict, deliberate).

### 27.2 Design decisions

| Topic | Decision |
|---|---|
| **New state** | One new **optional** field on `AppStorageState`: `assessmentState?: AssessmentState` — additive, like the existing optional extended fields |
| **Schema version** | **Stays `'1.0.0'`.** Adding an optional field is non-breaking (precedent documented in storageAdapter: version bumps are reserved for breaking shape changes). Bumping would reject every existing backup via strict import validation |
| **First run** | `assessmentState` absent → all domains Level 0 / `unassessed` / confidence `none` (§3.4) |
| **Existing users (migration)** | No migration needed: absent field ≡ never assessed. `loadState` merge leaves user data intact; no prompts that look like data loss |
| **Backward compatibility (old backup → new app)** | Backup without `assessmentState` imports fine; assessment layer starts empty; nothing else changes |
| **Forward compatibility (new backup → old app)** | Old `validateImportState` checks version (still `1.0.0`) and known fields; extra `assessmentState` is ignored → import succeeds, assessment data dropped (documented, non-destructive to everything else) |
| **Assessment-history persistence** | Attempts/responses/snapshots/exposures live inside `assessmentState` (single-key locality, no new keys) |
| **Import/export implications** | Export includes `assessmentState` automatically (whole-state JSON). QA (§30) must round-trip test it. Exports remain human-inspectable JSON |
| **Reset semantics** | **"Reset learner levels to 0" clears assessment *state only*** (profile → Level 0/`unassessed`, optionally history per DECIDED 3) — it must **never** delete curriculum (src/data), DSA, practice, preparation, or project content |
| **Full reset** | Existing Settings full-reset behavior unchanged; if it clears all state, it clears `assessmentState` too — same guarantee: content datasets are code, not state |
| **Corruption handling** | Follow existing pattern: invalid `assessmentState` → quarantine + fall back to empty assessment state (never blocks hydration of the rest) |

### 27.3 Data-volume growth (must be engineered, §32)

Assessment responses are the first *unbounded-ish* array in this app. Mitigations
(specified now, implemented in Phase A):

- Responses pruned per **DECIDED 2** (keep full responses for the last 12 attempts;
  older attempts collapse to their `DomainAssessmentResult` summary + snapshot;
  raw responses beyond 90 days dropped).
- Snapshots are small (domain results only) — retained indefinitely.
- Exposure records are one entry per item (bounded by bank size).
- All of it stays comfortably inside localStorage budgets given the recommended caps —
  but a size guard (warn > 2 MB state) belongs in QA (§30).

---

## 28. Company / Role Overlays

### 28.1 Boundary

**The baseline diagnostic is company-agnostic.** It measures general capability and
produces the general learner profile once (§5).

### 28.2 Future overlay capabilities (design contract, not V1 build)

| Overlay may | Overlay must not |
|---|---|
| Produce a **company-specific diagnostic** (subset blueprint keyed to `CompanyOverlay.requiredDomains` / `requiredTopics`) | Rewrite or fork the general learner profile |
| Produce **company OA simulation** and **company interview simulation** items | Replace `DomainAssessmentResult` with company-flavored levels |
| Modify: required competencies · test composition · weighting · difficulty target · pass thresholds | Modify history or erase non-company evidence |
| Read the general profile to target gaps for *that* company | Claim company overlay results are general capability |

The existing `CompanyOverlay` type (id, companyName, targetRole, applicationStatus,
eventDate, requiredDomains, requiredTopics, requiredLanguages) already carries the
inputs needed for overlay composition; **no changes to `CompanyOverlay` are required
by this spec.** Success criterion 10 (§34) is "eventually support company-specific
assessment overlays" — a V2+ outcome gated on V1 stability.

---

## 29. Anti-Gaming / Validity

### 29.1 Honest limitations (must be documented in-product eventually)

PlacementOS is a **personal, local-first, single-user** system. It cannot guarantee:

- Proctoring or identity verification
- Standardized exam security or item-bank secrecy
- Browser/tab integrity (tab-switch is recorded as a *signal*, never as proof of
  cheating)
- External cheating prevention (learners own the machine and the data)
- comparability with any external standardized test

**Therefore: this is a personal diagnostic/learning instrument, not a certified
exam.** Results guide the learner's own preparation; they are not credentials.

### 29.2 Deterministic mitigations (still worth having)

| Threat | Mitigation |
|---|---|
| Memorizing repeated items | Exposure suppression (§13), parallel groups, novel-item preference |
| Cherry-picking familiar domains | Mandatory module coverage in baseline; coverage floors + concentration caps in Sunday (§15.2) |
| Random clicking | Chance correction (§9.2-2) drives random attempts toward 0; response-quality factor (§11.2) lowers confidence; suspicious patterns recorded |
| Speed-running without reading | Time signals secondary (§15); `unanswered`/`E-SPEED` separate from `incorrect` |
| Item order fishing | Order derived from stored seed, not `Math.random()`; seed persisted on attempt |
| Answer-key extraction from localStorage | Responses never store keys; items are static code, but the attempt UI contract forbids shipping keys inside response payloads (§30-8) |
| Re-taking to inflate | §13 discount/exclusion + §17 regression requirements |
| Confidence inflation | Confidence is computed (§11), not self-declared; self-reported response confidence is supporting evidence only |

---

## 30. Assessment Content QA

Content QA is mandatory before any bank ships (future test harness; listed here as the
contract). Checks:

| # | Check | Failure means |
|---|---|---|
| 1 | **Unique IDs** across all banks (`asm-*` namespace, no collision with `dsa-*`, `q-*`, task/topic ids) | reject bank |
| 2 | **No duplicate prompts** (normalized-text hash dedupe) | reject item |
| 3 | **Balanced difficulty** — bank and each module within ±10% of its declared mix | reject bank |
| 4 | **Valid answer keys** — every objective item: key exists, in-bounds option index, ≥4 unique options for MCQ, exactly one correct for single-select; numeric keys recomputed from prompt values (pattern from `bank.ts`) | reject item |
| 5 | **Domain coverage** — every class A/B domain meets §4.3 minimum evidence counts | reject bank |
| 6 | **Topic coverage** — every assessable topic claimed by a module has ≥1 item | reject module |
| 7 | **No impossible prerequisites** — item prerequisites resolvable and not circular | reject item |
| 8 | **No exposed answer leakage** — explanations/keys never reachable in baseline UI before submission (validation is structural: response objects carry no `key`) | reject attempt UI contract |
| 9 | **Timing realism** — Σ `estimatedMinutes` per module ≤ time budget; no item > 8 min | reject bank |
| 10 | **No repeated item within an invalid window** — pairwise selection simulation across consecutive Sundays finds no <14-day repeat | reject selection config |
| 11 | **No dual-use without exposure tracking** — no item is simultaneously untracked-practice and high-stakes assessment evidence (`eligibleFor`/`releaseToPractice` consistency) | reject item |
| 12 | **Error-category validity** — every `errorCategories` code exists in the taxonomy (§12); every MCQ distractor maps to a valid code | reject item |
| 13 | **State size guard** — round-trip export/import + estimated localStorage size stays under a documented budget (e.g., 2 MB) | reject bank/pruning config |
| 14 | **Deterministic selection reproducibility** — same seed + same inputs produce identical item lists (golden test) | reject algorithm change |

QA runs as part of future test infrastructure; **no tests for this feature are
created in this specification phase** (§36).

---

## 31. Data Model Proposal

New entities (proposed — **not coded**). Static = authored dataset in `src/data/`;
Runtime = persisted learner state inside `assessmentState`.

| Entity | Purpose | Key fields | Relationships | Lifecycle | Static / Runtime | Persistence |
|---|---|---|---|---|---|---|
| **`AssessmentDefinition`** | Declares an assessment (baseline, Sunday template, full reassessment) | `id`, `kind: AssessmentKind`, `name`, `timeLimitMinutes`, `modules[] {domainId, timeBudget, itemCount, difficultyMix}`, `compositionRules?` (Sunday), `version` | 1 → many `AssessmentItem` (via module filters); referenced by `AssessmentAttempt.definitionId` | Authored, versioned; changing a version does not alter past attempts | **Static** | No (code) |
| **`AssessmentItem`** | One authored assessment item | All §7.1 metadata | Owned by bank files; referenced by responses/exposures; `parallelGroup` links equivalents | Authored; may be retired (`retired: true`) but never renumbered | **Static** | No (code) |
| **`AssessmentAttempt`** | One sitting (baseline / Sunday / reassessment / abandoned) | `id`, `definitionId`, `definitionVersion`, `kind`, `status: 'in_progress' \| 'submitted' \| 'auto_submitted' \| 'abandoned'`, `startedAt`, `endedAt`, `timeLimitSeconds`, `seed`, `selectedItemIds[]`, `selectionExceptions?` | 1 → many `AssessmentResponse`; 1 → many `DomainAssessmentResult`; 1 → 1 snapshot (if snapshotting run) | Created at start; immutable after terminal state | **Runtime** | Yes |
| **`AssessmentResponse`** | One item answer | `id`, `attemptId`, `itemId`, `response` (option index / text), `result: 'correct' \| 'incorrect' \| 'dont_know' \| 'unanswered'`, `responseConfidence?: 'confident' \| 'somewhat' \| 'guessing'`, `timeSpentSeconds`, `errorCategories[]`, `scoredCredit`, `weightApplied` | belongs to attempt + item | Append-only | **Runtime** | Yes (subject to §27.3 pruning) |
| **`AssessmentItemExposure`** | Exposure ledger (§13) | `itemId`, `exposureCount`, `lastSeenAt`, `lastAttemptId`, `lastResult`, `previousAssessmentUsage[]`, `estimationUses`, `eligibleForFutureEstimation`, `releasedToPractice` | keyed by `itemId`; updated per attempt | Mutable counters, append-only history array | **Runtime** | Yes (bounded by bank size) |
| **`DomainAssessmentResult`** | Per-domain outcome of one attempt | §11.1 record + `attemptId`, `kind`, `provisional` | belongs to attempt; latest-per-domain forms the profile | Immutable per attempt; "current profile" = projection of latest | **Runtime** | Yes |
| **`AssessmentSnapshot`** | Dated whole-profile freeze (§19) | `id`, `takenAt`, `kind`, `trigger: 'scheduled' \| 'manual' \| 'post_baseline'`, `domainResults[]` (copied §11.1 records), `priorSnapshotId?` | Chain of snapshots; never references mutable state | Immutable once created | **Runtime** | Yes (small, retained) |
| **`WeaknessSignal`** | Identified weakness for targeting (§16) | `id`, `domainId`, `topicId?`, `competency?`, `errorCategory`, `strength: 1–3`, `status: 'open' \| 'reinforced' \| 'resolved'`, `firstSeenAt`, `lastSeenAt`, `occurrences`, `sourceAttemptIds[]` | Produced by scoring; consumed by selection/planner | Open → reinforced → resolved (never deleted; history kept) | **Runtime** | Yes |
| **`AssessmentState`** (aggregate) | The one storage field | `{ attempts[], responses[], exposures: Record<itemId>, domainResults[], snapshots[], weaknessSignals[], profile: {baselineCompletedAt?, lastSundayAt?, pendingSunday: boolean, nextReassessmentSuggestedAt?} }` | Root of all runtime entities | Replaced wholesale on write (existing pattern) | **Runtime** | Yes (`assessmentState?`) |

### 31.1 Existing types that must remain untouched

`DomainId`, `DomainDefinition`, `Phase`, `Module`, `Topic`, `TaskDefinition`,
`DSAProblem`, `DSAProgress`, `DSAAttempt`, `PatternMetadata`, `LearningResource`,
`EvidenceLog` (union **not** widened — `test` already exists), `PracticeQuestion`,
`PracticeSessionDefinition`, `PracticeAttempt`, `UserSettings`, `TopicSkillState`,
`TopicManualOverride`, `CompanyOverlay`, `DailyCheckIn`, `DailyTaskAssignment`,
`PreparationTopic*`, `ProjectLab*` — **no field changes, no semantic changes.**

---

## 32. Architecture Impact

**No implementation in this phase.** This section documents what a future
implementation would touch, for planning.

### 32.1 New files (proposed)

| Path (proposed) | Contents | Phase |
|---|---|---|
| `src/data/assessment/definitions.ts` | `AssessmentDefinition[]` (baseline + Sunday template) | A |
| `src/data/assessment/items/*.ts` | Authored `AssessmentItem` banks per domain | B |
| `src/engine/assessmentEngine.ts` | Pure: item scoring, ability estimation, level/confidence, selection, regression (§9–§17) | A/C |
| `src/types/assessment.ts` | §31 entities (kept out of `types/index.ts` to avoid churn in the shared file) | A |
| `src/components/assessment/*` | Future UI (out of scope for V1 spec; explicitly not built) | C+ |
| `src/test/assessment*.test.ts` | Future tests (not created in this phase) | C+ |

### 32.2 Existing files that would be interacted with (future)

| File | Nature of interaction | Risk if done wrong |
|---|---|---|
| `src/storage/storageAdapter.ts` | Add optional `assessmentState` field + validation branch + pruning | Breaking import validation (§27.2 exact-version constraint) |
| `src/context/PlacementContext.tsx` | Hydration, persistence, action surface for assessment writes | State churn / re-render cost; accidental mutation of existing fields |
| `src/types/index.ts` | **Read-only** (`DomainId`, `EvidenceLog`) — no widening needed | Union widening would touch storage validators unnecessarily |
| `src/engine/skillsEngine.ts` | **Read-only** in V1 (precedence documented, no merge) | Corrupting existing 476-test guarantees |
| `src/engine/adaptiveEngine.ts` | **Untouched in V1**; future factor addition must keep weights = 1.0 | Silent weight drift breaking tests |
| `src/engine/dsaEngine.ts` | **Untouched** (no assessment write path — §14.3) | Mastery formula duplication |
| `src/engine/practiceEngine.ts` | **Untouched** | Evidence-type masquerading (P8) |
| `src/App.tsx`, `PlacementContext.RoutePath`, `AppShell` nav | Future `assessment` route (Phase C) | Hash-routing additions; not done now |
| `src/data/**` | **Read-only** — no dataset modifications | Would violate audit invariants (4b5e039) |
| Export/Import (Settings) | Round-trip inclusion of `assessmentState` | Data loss on device transfer |

### 32.3 Systems that must remain untouched (V1)

Engines (`adaptiveEngine`, `practiceEngine`, `dsaEngine`, `companyEngine`,
`preparationEngine`, `taskFlowEngine`, `taskStateEngine`, `analyticsEngine`,
`skillsEngine`) · all of `src/data/**` · routes/navigation · UI components ·
`EvidenceLog` union · `TopicSkillState` · `CompanyOverlay` · day-sealing logic ·
Leitner logic · practice session definitions.

### 32.4 Migration risks

- Accidental `schemaVersion` bump → every existing backup rejected (highest-severity
  risk; guarded by §27.2 decision and by existing `storageBaseline.test.ts`).
- Over-validating `assessmentState` (strict import) → old backups rejected. Rule:
  assessment validation must be **permissive-with-fallback**, mirroring `loadState`
  merge behavior.
- Pruning implemented eagerly → historical snapshots lost. Rule: prune responses, never
  snapshots (§19.2-1).

### 32.5 Data-volume growth

| Entity | Growth driver | Bound |
|---|---|---|
| `AssessmentResponse` | attempts × items (~84 baseline + ~30 Sunday each) | pruned per §27.3 / DECIDED 2 |
| `AssessmentAttempt` | 1 baseline + ~3–4 Sunday/month + reassessments | ~50/year — trivial |
| `AssessmentItemExposure` | bank size | one row per item |
| `AssessmentSnapshot` | 6–8 week cadence | ~10/year — trivial |
| `WeaknessSignal` | competencies × turnover | bounded by taxonomy size; resolved rows retained |

### 32.6 Integration risk register (by system)

| System | Risk | Mitigation |
|---|---|---|
| DSA | Diagnostic item mistaken for mastery (§11 of brief) | No write path from scorer to `DSAProgress` (§14.3, §25) |
| Practice | Assessment items leaking into practice pools untracked | `origin` retained forever + exposure gates (§14.2) |
| Skills/Evidence | Assessment inflating `evidenceStrength` unexpectedly | V1: no direct writes; precedence table (§24) |
| Planner | Oscillation / overreaction to one Sunday | §16.3 anti-oscillation + §17 regression thresholds |
| Sunday scheduling | Backlog accumulation; midnight-rollover interactions with existing 60s date poll | §18 pending-state caps; assessment date logic stored independently of `DailyCheckIn` sealing |
| Code execution | No sandbox exists (verified: no Pyodide/sql.js/eval/Worker) | V1 grades written SQL/Python by normalized match & rubric; execution deferred (DECIDED 1) |
| Bank maintenance | Authored banks drift (duplicate/leak/stale difficulty) | §30 QA as gating check |
| Storage | Single-key size growth | §27.3 pruning + size guard (§30-13) |

---

## 33. Risks / Failure Modes

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Learner misreads Level 0 as "I can't" | Medium | High | P3 framing, explicit `unassessed` status everywhere (§2) |
| R2 | Single sitting fatigue distorts later modules | Medium | Medium | 20-min buffer, adaptive shortening, module ordering (§6.3) |
| R3 | Class B levels over-claimed as full constructs | Medium | High | `constructScope` field + scoping copy requirements (§4, §21, §22) |
| R4 | Percent-correct sneaks back in via UI shortcuts | Medium | Medium | Level/confidence only from `domainAbility` pipeline (§10.2); QA review |
| R5 | Item exposure defeated by small pools | Medium | Medium | Parallel groups, discount rules, selectionException visibility (§16.2) |
| R6 | Regression rules too strict (bad level sticks) or too loose (oscillation) | Medium | Medium | §17 thresholds as named constants + future calibration review |
| R7 | Storage rejection of existing backups | Low | **Critical** | §27.2 no version bump; permissive assessment validation |
| R8 | Assessment/practice contamination (P8) | Low | High | Distinct `AssessmentKind`, `sourceType:'test'`, QA check 11 |
| R9 | Sunday obligation becomes demotivating backlog | Low | Medium | §18 hard cap of one pending test |
| R10 | Two "assessment" concepts confuse contributors (§3.3) | Medium | Low | This spec's disambiguation table + naming discipline |
| R11 | 84 items / 180 min miscalibrated for real pace | Medium | Medium | `estimatedMinutes` authoring + timing QA (§30-9); blueprint constants revisable without schema change |
| R12 | Engine weight drift if assessment factor added carelessly | Low | High | §26.3 V1 read-only posture; weights-sum-1.0 invariant |
| R13 | Abandoned attempts leave `in_progress` rows forever | Medium | Low | Terminal-state rules (§5.1) + hydration sweep marks stale `in_progress` as `abandoned` |
| R14 | Rubric-scored written items become opinion drift | Medium | Medium | Analytic rubric authored with item; single scorer (learner self or rubric key); confidence gate (§11.2 formatReliability) |

---

## 34. Validation Strategy (incl. Success Criteria)

**This phase creates no tests** (§36). This section defines *how* future work will be
proven and *what* success means.

### 34.1 Success criteria (measurable)

| # | Criterion | How it will be measurable |
|---|---|---|
| 1 | Defensible starting profile | After baseline: every class A domain has status `assessed` with ≥5 scored responses; profile exists for all 11 domains with correct status split (10 A/B measurable or partially measurable, Projects `unassessed`, per §4.3) |
| 2 | Assessed vs unassessed distinguished | Every domain result carries status ∈ {assessed, partially_assessed, unassessed}; Level 0 iff unassessed OR insufficient evidence OR domainAbility = 0; UI (future) never renders a level without status+confidence |
| 3 | Meaningful weaknesses identified | ≥80% of baseline-generated `WeaknessSignal`s have domain+topic+competency+errorCategory filled; traceable to specific responses (§31) |
| 4 | Initial priority plan produced | Plan inputs derived from profile without curriculum mutation (§26.2 verifiable: curriculum hashes unchanged) |
| 5 | 90-min adaptive Sunday test runs | Attempt reaches terminal state at ≤90 min; composition within §15.2 tolerances; selectionExceptions = 0 under normal supply |
| 6 | Future tests adapt to evidence | Given fixed inputs, later Sunday selections differ from week 1 in ≥60% of slots once profile changes (golden fixtures) |
| 7 | Noise immunity | Injected single-bad-result fixture produces **no** level drop (§17 requirements unmet) in all regression tests |
| 8 | Long-term evidence preserved | Post-baseline snapshots: DSA/practice/preparation/task state byte-identical (§19.4 invariant test) |
| 9 | No assessment/practice contamination | QA checks 10–11 (§30) pass; zero `sourceType` masquerading; exposure ledger consistent with attempt history |
| 10 | Company overlays eventually supported | Overlay composition API accepts `AssessmentDefinition` modifiers without touching general profile (design contract §28; V2 validation) |

### 34.2 Future test plan (for later phases — not created now)

- **Unit (pure engine):** item scoring table, chance correction, weighting caps,
  ability math, level banding, confidence bands, decay, regression gates, selection
  determinism (golden seeds), pending-state machine.
- **Storage:** `assessmentState` round-trip, absent-field hydration, permissive
  validation fallback, pruning preserves snapshots, export/import inclusion, size guard.
- **Invariant (extend existing style):** curriculum/DSA/practice hashes unchanged
  after any assessment operation (mirrors the audit discipline of `4b5e039`).
- **QA harness:** all §30 checks as a bank-validation test.
- **Determinism:** same seed → same selection, twice, across PR runs.

---

## 35. Implementation Phases

Each phase is independently shippable, gated by its tests, and **none is started by
this document.**

| Phase | Deliverable | Depends on | Exit criteria |
|---|---|---|---|
| **A — Foundations** | `types/assessment.ts`, `AssessmentState` in storage (optional field, permissive validation, pruning), empty engine skeleton, authoring helpers | §27 decisions (DECIDED 2, DECIDED 3 resolved) | Storage round-trip green; zero existing tests touched |
| **B — Content** | Baseline definitions + authored item banks (per §6, §7) + QA harness (§30) | Phase A | All §30 checks pass; blueprint time sums verified |
| **C — Baseline engine + runner** | Scoring/level/confidence (§9–§11), attempt lifecycle incl. auto-submit (§5.1), result computation, minimal runner UI + `assessment` route | Phases A, B | Success criteria 1–3 demonstrated; engine unit tests green |
| **D — Profile & plan read-out** | Profile projection, strengths/weaknesses display, initial plan inputs (§16 ladder groundwork, §26 read-only) | Phase C | Success criterion 4; curriculum-hash invariant holds |
| **E — Sunday mini test** | Selection algorithm (§16), pending-state machine (§18), composition constraints (§15.2), weekly evidence emission (`sourceType:'test'`) | Phase C, D | Success criteria 5–7 |
| **F — Regression & reassessment** | §17 gates, `AssessmentSnapshot`, full reassessment + "Run Full Diagnostic Again" (§19), decay (§11.3) | Phase E | Success criteria 7–8 |
| **G — Overlays & calibration path** | Company-specific diagnostic composition (§28), empirical recalibration groundwork (§9.4), parallel-form equating study | Phase F | Success criterion 10; V2 calibration spec drafted |
| **H — (Future) Execution-backed items** | Optional SQL/Python execution grading if DECIDED 1 is revisited | Phase C+, separate RFC | Sandboxed, offline, size-budget compliant |

---

## 36. Explicit Non-Goals

This specification phase (and V1 implementation scope) does **not**:

1. Build the Test UI, or any UI.
2. Add a Test/Assessment route or navigation entry.
3. Add assessment questions/items to any existing bank (`src/data/**` untouched).
4. Modify DSA-150, DSA pattern lists, tiers, phases, or resources.
5. Modify `SkillsView` / skills components.
6. Modify `Today` / dashboard components.
7. Modify `adaptiveEngine`, `practiceEngine`, `dsaEngine`, `skillsEngine`,
   `preparationEngine`, `taskFlowEngine`, `taskStateEngine`, `analyticsEngine`,
   `companyEngine`.
8. Modify storage behavior or persistence of existing fields (the optional
   `assessmentState` field is a *future Phase A* change, not part of this document's
   execution).
9. Modify company overlays.
10. Change current levels/evidence/readiness of any learner.
11. Create tests for the feature.
12. Commit code or push anything (this document is the only artifact; the repository
    commit decision belongs to the user).
13. Clone AMCAT content, counts, timings, formulas, or branding (§5.4).
14. Introduce LLM-based grading, external APIs, or network calls (local-first P1).
15. Widen `EvidenceLog.sourceType` or alter any existing type union (§31.1).
16. Add a 12th "Assessment" domain (P6).
17. Provide psychometric production-grade IRT calibration (§9.4 — future work).

---

## 37. Decided Product Choices

All product decisions for V1 are locked below. No unresolved items remain. Each entry
states the locked choice, rationale, and consequence. These are not "open" — they are
the specification's definitive positions.

### DECIDED 1 — SQL/Python execution-backed grading: DEFERRED (V1 execution-free)

- **Locked choice:** V1 uses normalized-match + rubric grading only; execution-backed
  grading (WASM SQL, Pyodide) is deferred to a future Phase H (separate RFC).
- **Rationale:** No code-execution runtime exists in the app (verified: no Pyodide,
  sql.js, `eval`, or Worker). Adding one would increase bundle/memory cost and violate
  the local-first offline promise. Item types (`sql_query`, `coding_constrained`)
  already carry `scoring.kind` so execution graders can slot in later without item
  rewrites.
- **Consequence:** Python stays class B "reasoning-only" (honest, documented in §4).
  Future execution support is a separate phase with its own size/budget review.

### DECIDED 2 — Response-data retention/pruning policy: 12 attempts + 90-day cutoff

- **Locked choice:** Keep full `AssessmentResponse` objects for the most recent 12
  attempts; older attempts collapse to `DomainAssessmentResult` + snapshot summary;
  raw responses older than 90 days are dropped. Snapshots are never pruned.
- **Rationale:** `AssessmentResponse` is the first near-unbounded state array (§27.3).
  This policy bounds localStorage/import size while preserving the claims that matter
  (domain results, snapshots, weakness signals).
- **Consequence:** One pruning routine in Phase A with a "never prune snapshots"
  invariant. Implements must enforce the 12-attempt / 90-day floor before collapse.

### DECIDED 3 — "Reset levels to 0" — two distinct operations

- **Locked choice:** Two separate reset operations:
  1. **Reset learner levels/profile** — clears `DomainAssessmentResult` profile
     (levels → 0, status → `unassessed`, confidence → `none`), keeps all attempts,
     snapshots, weakness signals, exposures.
  2. **Reset assessment history/data** — clears attempts, responses, snapshots,
     weakness signals, exposures; assessment layer returns to first-run state.
- **Rationale:** Most honest semantics; both operations must still refuse to touch
  curriculum/DSA/practice content (§27.2).
- **Consequence:** Slight UI complexity (two buttons/options), clear semantics.
  Content is never deleted under either operation.

### DECIDED 4 — Final numeric constants: named PROVISIONAL constants in one module

- **Locked choice:** Ship all provisional tables (level bands, confidence weights,
  regression thresholds, decay windows, Sunday composition targets) as explicitly
  named `PROVISIONAL_*` constants centralized in a single `assessmentScoring`
  constants module. Recalibration is a data-only change.
- **Rationale:** §8 of the brief forbids hard-coding arbitrary percentages yet the
  pipeline needs concrete numbers to be testable. Centralized provisional constants
  are implementable now, values may shift later (no schema impact).
- **Consequence:** Implementable and testable immediately; no untestable engine delay.

### DECIDED 5 — Sunday availability before baseline: SUPPRESSED

- **Locked choice:** Sunday mini tests are **fully suppressed until baseline completes**.
  Sunday obligation state stays `none` until baseline completion; no pending pile-up.
- **Rationale:** Baseline is the prerequisite evidence for adaptive targeting; running
  Sunday tests without a profile produces noise.
- **Consequence:** A learner who skips baseline gets no Sunday tests until they run it
  (deliberate — targeting without a profile is noise). No violation of the 90-minute
  Sunday contract.

### DECIDED 6 — Empirical calibration trigger: conservative non-binding threshold

- **Locked choice:** Retain the conservative V2 trigger threshold of **≥200 responses
  per item across ≥50 distinct attempts** as a future research/validation threshold,
  explicitly labeled **non-binding** until sufficient real data exists.
- **Rationale:** Single-user data needs volume before item parameters mean anything.
  Premature calibration on sparse data risks overfit. Calendar-based triggers are
  unreliable (volume may be low regardless of time).
- **Consequence:** Later but safer estimates. The threshold is a future validation
  gate, not a V1 commitment.

### DECIDED 7 — Baseline item-bank authoring: mixed fresh + derived with provenance

- **Locked choice:** Mixed strategy — fresh items for DSA/SQL/Python (assessment
  formats differ: code tracing, constrained coding, structured written); derived/
  paraphrased from existing practice questions for DBMS/OS/CN/Aptitude (MCQ format
  aligns). Derived items get new `asm-*` ids, independent exposure ledgers (§13), and
  explicit `derivedFrom` provenance linking to the original practice item.
- **Rationale:** Reduces authoring load where MCQ format aligns, keeps fresh items
  where assessment formats differ. Originals in `practice/**` remain byte-identical.
- **Consequence:** QA check 2 (§30) runs on normalized text *across* banks; cross-bank
  duplicates are allowed only with explicit `derivedFrom` provenance.

### DECIDED 8 — Results UI placement: data contract supports both; exact view deferred

- **Locked choice:** The data model (§31) exposes status/confidence/constructScope
  separately so the UI layer can place results in a dedicated Assessment view, the
  Skills view, or both. Exact visual placement is a Phase C/D design decision.
- **Rationale:** §24 requires assessed level and working readiness be shown as
  distinct claims. Deferring UI costs nothing structurally; the data contract
  supports either.
- **Consequence:** No schema change required regardless of final UI placement choice.

---

## Document History

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-09-30 | Initial specification (spec-only phase). Baseline: commit `4b5e039`. |
| v1.0-hardened | 2026-09-30 | Contradictions fixed: 11-domain counts, baseline difficulty mix, Level 0 edge case; decisions locked; rubric/SQL rules tightened; cross-refs audited. |
