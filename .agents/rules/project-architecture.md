---
trigger: always_on
---

# PlacementOS Project Architecture Rules

These rules apply to the entire PlacementOS project.

## Purpose

PlacementOS is a small personal roadmap and placement-preparation dashboard.

It is NOT the user's main software-engineering learning project.

Its purpose is to help the user follow, measure and adapt their placement-preparation plan.

## Architecture principles

- Keep the application simple.
- Prefer understandable code over clever code.
- Keep business logic separate from UI components.
- Keep the adaptation engine deterministic and explainable.
- Do not introduce runtime LLM/AI decision-making in V1.
- Do not introduce a backend, database, authentication or cloud infrastructure unless explicitly approved.
- Do not introduce microservices.
- Avoid premature abstraction.
- Avoid unnecessary dependencies.

## Adaptation engine

The adaptation engine is a core part of the application.

It must:

- use explicit rules and recorded evidence;
- produce reproducible recommendations;
- explain why a recommendation was made;
- adapt the daily/weekly schedule rather than silently rewriting the master roadmap;
- support manual user overrides.

Never replace deterministic recommendation logic with an LLM without explicit approval.

## Data

Keep domain data separate from presentation logic.

The system should preserve enough information to explain:

- what was recommended;
- why it was recommended;
- what the user actually did;
- what result occurred;
- how the recommendation changed afterward.

## Change discipline

Before making a significant architectural change:

1. inspect the existing structure;
2. explain the proposed change;
3. identify affected files;
4. implement the smallest reasonable change;
5. run relevant tests;
6. report the result.

Do not rewrite unrelated files.

Do not remove working functionality without justification.
