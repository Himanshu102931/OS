---
name: feature-development
description: Develops PlacementOS features through a small, reviewable plan, implementation, verification, testing, and documentation cycle. Use when adding or modifying application features.
---

# Feature Development Skill

Use this skill whenever implementing or significantly modifying a PlacementOS feature.

## Procedure

### 1. Understand

Before editing:

- inspect the relevant files;
- identify existing architecture;
- identify related data and business logic;
- identify current tests.

### 2. Plan

State:

- feature objective;
- affected files;
- data changes;
- UI changes;
- business-logic changes;
- tests required.

Keep the plan small.

### 3. Implement

Implement the smallest correct change.

Prefer:

- reuse;
- clear names;
- simple functions;
- existing components;
- existing utilities.

Do not introduce unnecessary abstractions.

### 4. Verify

After implementation:

- run the relevant tests;
- run the development build if appropriate;
- inspect errors;
- manually verify important behavior.

### 5. Explain

For substantial changes, explain:

- what changed;
- why;
- how the data flows;
- important implementation decisions.

### 6. Finish

Report:

- files changed;
- tests run;
- remaining limitations;
- recommended next step.

Never silently expand the requested scope.
