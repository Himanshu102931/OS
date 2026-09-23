---
name: testing
description: Creates and maintains reliable tests for PlacementOS business logic, UI behavior, storage behavior, and adaptive recommendation scenarios.
---

# Testing Skill

Use this skill when adding tests, debugging test failures, or modifying important application behavior.

## Principle

Tests should verify behavior, not merely implementation details.

## Priority

Prioritize tests for:

1. adaptation engine;
2. data calculations;
3. storage/import/export;
4. important user flows;
5. critical UI behavior.

## Adaptation scenario tests

For every important recommendation rule, create explicit scenarios with:

- input state;
- expected selected task;
- expected priority behavior;
- expected explanation.

The same input should produce the same result.

## Regression protection

When fixing a bug:

1. reproduce it;
2. write a failing test when practical;
3. fix the implementation;
4. run the test;
5. run relevant regression tests.

Do not delete a failing test simply to make the suite pass.

## Test simplicity

Prefer small, readable tests.

A test should make it obvious:

- what is being tested;
- what input was supplied;
- what result is expected.

## Reporting

After meaningful changes, report:

- tests run;
- passed;
- failed;
- unresolved issues.
